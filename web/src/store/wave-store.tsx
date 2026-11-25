import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useAudioAnalyser } from '@/hooks/use-audio-analyser'
import { useAudioDevices, type AudioPermission } from '@/hooks/use-audio-devices'
import { useMicrophone } from '@/hooks/use-microphone'
import { bytesAsFloats, floatsAsBytes, loadGgwave, protocolFor } from '@/lib/ggwave'
import { getSharedAudioContext } from '@/hooks/use-audio-context'
import { loadHistory, saveHistory, type ReceivedMessage } from '@/services/history'
import { loadSettings, saveSettings, type WaveSettings } from '@/services/settings'

export type WaveStatus = 'idle' | 'starting' | 'listening' | 'transmitting' | 'decoded' | 'error'

interface DecoderNodes {
  source: MediaStreamAudioSourceNode
  processor: ScriptProcessorNode
  silence: GainNode
  ownedContext: AudioContext | null
}

interface WaveStoreValue {
  status: WaveStatus
  error: string | null
  isReceiving: boolean
  isStarting: boolean
  isTransmitting: boolean
  lastDecoded: string | null
  history: ReceivedMessage[]
  settings: WaveSettings
  visualSource: ReturnType<typeof useAudioAnalyser>['visual']
  devices: ReturnType<typeof useAudioDevices>['devices']
  devicePermission: AudioPermission
  isLoadingDevices: boolean
  startReceiving: () => void
  stopReceiving: () => void
  transmit: (text: string) => Promise<void>
  updateSettings: (patch: Partial<WaveSettings>) => void
  removeMessage: (id: string) => void
  clearHistory: () => void
  requestDevicePermission: () => Promise<boolean>
}

const WaveStoreContext = createContext<WaveStoreValue | null>(null)
const textDecoder = new TextDecoder()
const MAX_PAYLOAD_BYTES = 64

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'The audio operation could not be completed.'

export function WaveStoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WaveSettings>(loadSettings)
  const [history, setHistory] = useState<ReceivedMessage[]>(loadHistory)
  const [status, setStatus] = useState<WaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isReceiving, setIsReceiving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isTransmitting, setIsTransmitting] = useState(false)
  const [lastDecoded, setLastDecoded] = useState<string | null>(null)

  const historyRef = useRef(history)
  const receivingRef = useRef(false)
  const startingRef = useRef(false)
  const generationRef = useRef(0)
  const instanceRef = useRef<number | null>(null)
  const instanceSampleRateRef = useRef<number | null>(null)
  const decoderRef = useRef<DecoderNodes | null>(null)
  const transmitSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const transmitGainRef = useRef<GainNode | null>(null)
  const transmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null)

  const handleMicrophoneError = useCallback(
    (microphoneStatus: 'denied' | 'unavailable' | 'error', microphoneError: Error) => {
      if (!startingRef.current) return
      startingRef.current = false
      setIsStarting(false)
      setStatus('error')
      setError(
        microphoneStatus === 'denied'
          ? 'Microphone access is blocked. Allow it in your browser site settings and try again.'
          : microphoneError.message
      )
    },
    []
  )

  const microphone = useMicrophone({
    deviceId: settings.inputDeviceId,
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    onError: handleMicrophoneError,
  })
  const stopMicrophone = microphone.stop
  const startMicrophone = microphone.start
  const analyser = useAudioAnalyser(microphone.stream, {
    bands: 32,
    fftSize: 2048,
    enabled: isReceiving,
  })
  const deviceList = useAudioDevices({ kind: 'audioinput' })

  const commitHistory = useCallback((next: ReceivedMessage[]) => {
    historyRef.current = next
    setHistory(next)
    saveHistory(next)
  }, [])

  const releaseDecoder = useCallback(() => {
    const decoder = decoderRef.current
    if (!decoder) return
    decoder.processor.onaudioprocess = null
    decoder.source.disconnect()
    decoder.processor.disconnect()
    decoder.silence.disconnect()
    if (decoder.ownedContext) void decoder.ownedContext.close()
    decoderRef.current = null
  }, [])

  const freeInstance = useCallback(async () => {
    if (instanceRef.current === null) return
    const instance = instanceRef.current
    instanceRef.current = null
    instanceSampleRateRef.current = null
    try {
      const ggwave = await loadGgwave()
      ggwave.free(instance)
    } catch {
      // The module may still be loading during teardown.
    }
  }, [])

  const ensureInstance = useCallback(async (requestedContext?: AudioContext) => {
    const context = requestedContext ?? getSharedAudioContext()
    if (!context) throw new Error('This browser does not support Web Audio.')
    if (context.state === 'suspended') await context.resume()
    const ggwave = await loadGgwave()
    if (
      instanceRef.current === null ||
      instanceSampleRateRef.current !== context.sampleRate
    ) {
      await freeInstance()
      const parameters = ggwave.getDefaultParameters()
      parameters.sampleRateInp = context.sampleRate
      parameters.sampleRateOut = context.sampleRate
      parameters.sampleRate = context.sampleRate
      instanceRef.current = ggwave.init(parameters)
      instanceSampleRateRef.current = context.sampleRate
    }
    return { context, ggwave, instance: instanceRef.current }
  }, [freeInstance])

  const stopTransmitting = useCallback(() => {
    if (transmitTimerRef.current) clearTimeout(transmitTimerRef.current)
    transmitTimerRef.current = null
    if (transmitSourceRef.current) {
      try {
        transmitSourceRef.current.stop()
      } catch {
        // The source may already have ended.
      }
      transmitSourceRef.current.disconnect()
      transmitSourceRef.current = null
    }
    transmitGainRef.current?.disconnect()
    transmitGainRef.current = null
    setIsTransmitting(false)
  }, [])

  const stopReceiving = useCallback(() => {
    generationRef.current += 1
    receivingRef.current = false
    startingRef.current = false
    releaseDecoder()
    stopMicrophone()
    void freeInstance()
    setIsReceiving(false)
    setIsStarting(false)
    setStatus(lastDecodedRef.current ? 'decoded' : 'idle')
  }, [freeInstance, releaseDecoder, stopMicrophone])

  const startReceiving = useCallback(() => {
    if (receivingRef.current || startingRef.current) return
    stopTransmitting()
    const generation = ++generationRef.current
    startingRef.current = true
    setIsStarting(true)
    setError(null)
    setStatus('starting')

    if (!navigator.mediaDevices?.getUserMedia) {
      startingRef.current = false
      setIsStarting(false)
      setStatus('error')
      setError('This browser cannot open a microphone.')
      return
    }

    const context = getSharedAudioContext()
    if (!context) {
      startingRef.current = false
      setIsStarting(false)
      setStatus('error')
      setError('This browser does not support Web Audio.')
      return
    }

    context.resume().catch((resumeError) => {
      if (generation !== generationRef.current) return
      startingRef.current = false
      setIsStarting(false)
      setStatus('error')
      setError(errorMessage(resumeError))
    })
    stopMicrophone()
    void startMicrophone()
  }, [startMicrophone, stopMicrophone, stopTransmitting])

  useEffect(() => {
    if (!startingRef.current) return

    if (microphone.status === 'active' && microphone.stream) {
      let cancelled = false
      const generation = generationRef.current
      const stream = microphone.stream

      const connectDecoder = async () => {
        let ownedContext: AudioContext | null = null
        try {
          const sharedContext = getSharedAudioContext()
          if (!sharedContext) throw new Error('This browser does not support Web Audio.')
          const nativeSampleRate = stream.getAudioTracks()[0]?.getSettings().sampleRate
          ownedContext = nativeSampleRate && nativeSampleRate !== sharedContext.sampleRate
            ? new AudioContext({ latencyHint: 'interactive', sampleRate: nativeSampleRate })
            : null
          const context = ownedContext ?? sharedContext
          if (context.state === 'suspended') await context.resume()
          const { ggwave, instance } = await ensureInstance(context)
          if (cancelled || generation !== generationRef.current) {
            if (ownedContext) void ownedContext.close()
            return
          }
          releaseDecoder()
          const source = context.createMediaStreamSource(stream)
          const processor = context.createScriptProcessor(1024, 1, 1)
          const silence = context.createGain()
          silence.gain.value = 0
          source.connect(processor)
          processor.connect(silence)
          silence.connect(context.destination)
          decoderRef.current = { source, processor, silence, ownedContext }

          processor.onaudioprocess = (event) => {
            if (!receivingRef.current || generation !== generationRef.current) return
            const samples = new Float32Array(event.inputBuffer.getChannelData(0))
            const decoded = ggwave.decode(instance, floatsAsBytes(samples))
            if (!decoded.length) return
            const text = textDecoder.decode(decoded).trim()
            if (!text) return
            const now = Date.now()
            const previous = lastDecodedRef.current
            if (previous?.text === text && now - previous.at < 1500) return
            lastDecodedRef.current = { text, at: now }
            setLastDecoded(text)
            setStatus('decoded')
            const item: ReceivedMessage = {
              id: `${now}-${text.length}-${Math.random().toString(36).slice(2, 7)}`,
              text,
              receivedAt: now,
            }
            commitHistory([item, ...historyRef.current].slice(0, 20))
            if (settings.haptics) navigator.vibrate?.(35)
          }

          receivingRef.current = true
          startingRef.current = false
          setIsReceiving(true)
          setIsStarting(false)
          setStatus('listening')
        } catch (decoderError) {
          if (cancelled || generation !== generationRef.current) {
            if (ownedContext) void ownedContext.close()
            return
          }
          receivingRef.current = false
          startingRef.current = false
          if (ownedContext && decoderRef.current?.ownedContext !== ownedContext) {
            void ownedContext.close()
          }
          releaseDecoder()
          stopMicrophone()
          setIsReceiving(false)
          setIsStarting(false)
          setStatus('error')
          setError(errorMessage(decoderError))
        }
      }

      void connectDecoder()
      return () => {
        cancelled = true
      }
    }

  }, [
    commitHistory,
    ensureInstance,
    microphone.status,
    microphone.stream,
    releaseDecoder,
    settings.haptics,
    stopMicrophone,
  ])

  const transmit = useCallback(async (text: string) => {
    const payload = text.trim()
    if (!payload) throw new Error('Write a message before transmitting.')
    if (new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) {
      throw new Error('Messages are limited to 64 UTF-8 bytes.')
    }
    if (isTransmitting) return

    stopReceiving()
    stopTransmitting()
    setError(null)
    setStatus('transmitting')

    try {
      const { context, ggwave, instance } = await ensureInstance()
      if (context.state === 'suspended') await context.resume()
      const waveform = ggwave.encode(instance, payload, protocolFor(ggwave, settings.protocol), 10)
      const samples = bytesAsFloats(waveform)
      const buffer = context.createBuffer(1, samples.length, context.sampleRate)
      buffer.getChannelData(0).set(samples)
      const source = context.createBufferSource()
      const gain = context.createGain()
      gain.gain.value = settings.volume
      source.buffer = buffer
      source.connect(gain)
      gain.connect(context.destination)
      transmitSourceRef.current = source
      transmitGainRef.current = gain
      setIsTransmitting(true)
      source.onended = () => {
        if (transmitSourceRef.current !== source) return
        transmitSourceRef.current = null
        transmitGainRef.current = null
        setIsTransmitting(false)
        setStatus(lastDecodedRef.current ? 'decoded' : 'idle')
      }
      source.start()
      transmitTimerRef.current = setTimeout(() => {
        stopTransmitting()
        setStatus(lastDecodedRef.current ? 'decoded' : 'idle')
      }, buffer.duration * 1000 + 150)
      await freeInstance()
    } catch (transmitError) {
      stopTransmitting()
      setStatus('error')
      setError(errorMessage(transmitError))
      throw transmitError
    }
  }, [ensureInstance, freeInstance, isTransmitting, settings.protocol, settings.volume, stopReceiving, stopTransmitting])

  const updateSettings = useCallback((patch: Partial<WaveSettings>) => {
    if (patch.inputDeviceId !== undefined && patch.inputDeviceId !== settings.inputDeviceId) {
      stopReceiving()
    }
    setSettings((current) => {
      const next = { ...current, ...patch }
      saveSettings(next)
      return next
    })
  }, [settings.inputDeviceId, stopReceiving])

  const removeMessage = useCallback((id: string) => {
    commitHistory(historyRef.current.filter((message) => message.id !== id))
  }, [commitHistory])

  const clearHistory = useCallback(() => {
    lastDecodedRef.current = null
    setLastDecoded(null)
    commitHistory([])
    if (!receivingRef.current) setStatus('idle')
  }, [commitHistory])

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.visibilityState === 'hidden') stopReceiving()
    }
    document.addEventListener('visibilitychange', stopWhenHidden)
    window.addEventListener('pagehide', stopWhenHidden)
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden)
      window.removeEventListener('pagehide', stopWhenHidden)
    }
  }, [stopReceiving])

  useEffect(() => {
    if (!isReceiving || !settings.keepScreenAwake) return
    const wakeNavigator = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
    }
    if (!wakeNavigator.wakeLock) return
    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false
    wakeNavigator.wakeLock.request('screen').then((sentinel) => {
      if (cancelled) void sentinel.release()
      else lock = sentinel
    }).catch(() => {
      // Wake Lock is optional and may be refused by the browser.
    })
    return () => {
      cancelled = true
      if (lock) void lock.release()
    }
  }, [isReceiving, settings.keepScreenAwake])

  useEffect(() => () => {
    generationRef.current += 1
    receivingRef.current = false
    startingRef.current = false
    releaseDecoder()
    stopMicrophone()
    stopTransmitting()
    void freeInstance()
  }, [freeInstance, releaseDecoder, stopMicrophone, stopTransmitting])

  const value = useMemo<WaveStoreValue>(() => ({
    status,
    error,
    isReceiving,
    isStarting,
    isTransmitting,
    lastDecoded,
    history,
    settings,
    visualSource: analyser.visual,
    devices: deviceList.devices,
    devicePermission: deviceList.permission,
    isLoadingDevices: deviceList.isLoading,
    startReceiving,
    stopReceiving,
    transmit,
    updateSettings,
    removeMessage,
    clearHistory,
    requestDevicePermission: deviceList.requestPermission,
  }), [
    analyser.visual,
    deviceList.devices,
    deviceList.isLoading,
    deviceList.permission,
    deviceList.requestPermission,
    error,
    history,
    isReceiving,
    isStarting,
    isTransmitting,
    lastDecoded,
    clearHistory,
    removeMessage,
    settings,
    startReceiving,
    status,
    stopReceiving,
    transmit,
    updateSettings,
  ])

  return <WaveStoreContext.Provider value={value}>{children}</WaveStoreContext.Provider>
}

export const useWaveStore = () => {
  const store = useContext(WaveStoreContext)
  if (!store) throw new Error('useWaveStore must be used inside WaveStoreProvider.')
  return store
}
