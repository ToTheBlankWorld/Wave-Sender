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
import { createAnalyserTap } from '@/hooks/use-audio-analyser'
import { useAudioDevices, type AudioPermission } from '@/hooks/use-audio-devices'
import { useMicrophone } from '@/hooks/use-microphone'
import { createFrameRelay } from '@/lib/audio/frame-source'
import type { FrameSource, VisualFrame } from '@/lib/audio/types'
import {
  GGWAVE_SAMPLE_RATE,
  bytesAsFloats,
  createAudioFramePipeline,
  createGgwaveInstance,
  decodePayloadText,
  floatsAsBytes,
  loadGgwave,
  protocolFor,
} from '@/lib/ggwave'
import { getSharedAudioContext } from '@/hooks/use-audio-context'
import { loadHistory, saveHistory, type ReceivedMessage } from '@/services/history'
import { loadSettings, saveSettings, type WaveSettings } from '@/services/settings'

export type WaveStatus = 'idle' | 'starting' | 'listening' | 'transmitting' | 'decoded' | 'error'

interface DecoderNodes {
  source: MediaStreamAudioSourceNode
  processor: ScriptProcessorNode
  silence: GainNode
  tap: ReturnType<typeof createAnalyserTap>
  ownedContext: AudioContext | null
  variableInstance: number
  fixedInstance: number
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
  visualSource: FrameSource<VisualFrame>
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
const MAX_PAYLOAD_BYTES = 64
const FIXED_PAYLOAD_BYTES = 64
const TX_ENCODE_VOLUME = 35

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
  const hapticsRef = useRef(settings.haptics)
  const receivingRef = useRef(false)
  const startingRef = useRef(false)
  const generationRef = useRef(0)
  const decoderRef = useRef<DecoderNodes | null>(null)
  const transmitSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const transmitGainRef = useRef<GainNode | null>(null)
  const transmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null)
  const dedupRef = useRef<{ text: string; at: number } | null>(null)
  const visualRelay = useMemo(() => createFrameRelay<VisualFrame>(), [])

  useEffect(() => {
    hapticsRef.current = settings.haptics
  }, [settings.haptics])

  const deviceList = useAudioDevices({ kind: 'audioinput' })

  const commitHistory = useCallback((next: ReceivedMessage[]) => {
    historyRef.current = next
    setHistory(next)
    saveHistory(next)
  }, [])

  const stopMicrophoneRef = useRef<(() => void) | null>(null)

  const handleMicrophoneError = useCallback(
    (microphoneStatus: 'denied' | 'unavailable' | 'error', microphoneError: Error) => {
      if (!startingRef.current) return
      startingRef.current = false
      receivingRef.current = false
      stopMicrophoneRef.current?.()
      setIsStarting(false)
      setIsReceiving(false)
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

  useEffect(() => {
    stopMicrophoneRef.current = stopMicrophone
  }, [stopMicrophone])

  const releaseDecoder = useCallback(() => {
    visualRelay.setSource(null)
    const decoder = decoderRef.current
    if (!decoder) return
    decoderRef.current = null
    decoder.processor.onaudioprocess = null
    decoder.tap.dispose()
    decoder.source.disconnect()
    decoder.processor.disconnect()
    decoder.silence.disconnect()
    if (decoder.ownedContext) void decoder.ownedContext.close()
    void loadGgwave().then((ggwave) => {
      ggwave.free(decoder.variableInstance)
      ggwave.free(decoder.fixedInstance)
    }).catch(() => {
      // Module teardown is best-effort.
    })
  }, [visualRelay])

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
    setIsReceiving(false)
    setIsStarting(false)
    setStatus(lastDecodedRef.current ? 'decoded' : 'idle')
  }, [releaseDecoder, stopMicrophone])

  const startReceiving = useCallback(() => {
    if (receivingRef.current || startingRef.current) return
    stopTransmitting()
    const generation = ++generationRef.current
    startingRef.current = true
    dedupRef.current = null
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
        let variableInstance: number | null = null
        let fixedInstance: number | null = null
        try {
          const sharedContext = getSharedAudioContext()
          if (!sharedContext) throw new Error('This browser does not support Web Audio.')
          const nativeSampleRate = stream.getAudioTracks()[0]?.getSettings().sampleRate
          ownedContext = nativeSampleRate && nativeSampleRate !== sharedContext.sampleRate
            ? new AudioContext({ latencyHint: 'interactive', sampleRate: nativeSampleRate })
            : null
          const context = ownedContext ?? sharedContext
          if (context.state === 'suspended') await context.resume()
          const ggwave = await loadGgwave()
          if (cancelled || generation !== generationRef.current) {
            if (ownedContext) void ownedContext.close()
            return
          }
          variableInstance = createGgwaveInstance(ggwave, -1)
          fixedInstance = createGgwaveInstance(ggwave, FIXED_PAYLOAD_BYTES)

          releaseDecoder()
          const source = context.createMediaStreamSource(stream)
          const tap = createAnalyserTap(context, source, {
            bands: 32,
            fftSize: 2048,
          })
          visualRelay.setSource(tap.visual)

          const processor = context.createScriptProcessor(1024, 1, 1)
          const silence = context.createGain()
          silence.gain.value = 0
          source.connect(processor)
          processor.connect(silence)
          silence.connect(context.destination)

          const activeVariable = variableInstance
          const activeFixed = fixedInstance
          decoderRef.current = {
            source,
            processor,
            silence,
            tap,
            ownedContext,
            variableInstance: activeVariable,
            fixedInstance: activeFixed,
          }

          const pushAudioChunk = createAudioFramePipeline(context.sampleRate, (frame) => {
            if (!receivingRef.current || generation !== generationRef.current) return
            const bytes = floatsAsBytes(frame)
            const varDecoded = ggwave.decode(activeVariable, bytes)
            let text = decodePayloadText(varDecoded)
            if (!text) {
              const fixDecoded = ggwave.decode(activeFixed, bytes)
              text = decodePayloadText(fixDecoded)
            }
            if (!text) return
            const now = Date.now()
            const previous = dedupRef.current
            if (previous?.text === text && now - previous.at < 1500) return
            dedupRef.current = { text, at: now }
            lastDecodedRef.current = { text, at: now }
            setLastDecoded(text)
            setStatus('decoded')
            const item: ReceivedMessage = {
              id: `${now}-${text.length}-${Math.random().toString(36).slice(2, 7)}`,
              text,
              receivedAt: now,
            }
            commitHistory([item, ...historyRef.current].slice(0, 20))
            if (hapticsRef.current) navigator.vibrate?.(35)
          })

          processor.onaudioprocess = (event) => {
            if (!receivingRef.current || generation !== generationRef.current) return
            pushAudioChunk(event.inputBuffer.getChannelData(0))
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
          if (!decoderRef.current) {
            void loadGgwave().then((ggwave) => {
              if (variableInstance !== null) ggwave.free(variableInstance)
              if (fixedInstance !== null) ggwave.free(fixedInstance)
            }).catch(() => {
              // Best-effort cleanup.
            })
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
    microphone.status,
    microphone.stream,
    releaseDecoder,
    stopMicrophone,
    visualRelay,
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

    let txInstance: number | null = null
    try {
      const context = getSharedAudioContext()
      if (!context) throw new Error('This browser does not support Web Audio.')
      if (context.state === 'suspended') await context.resume()
      const ggwave = await loadGgwave()
      txInstance = createGgwaveInstance(ggwave, -1)
      const waveform = ggwave.encode(txInstance, payload, protocolFor(ggwave, settings.protocol), TX_ENCODE_VOLUME)
      const samples = bytesAsFloats(waveform)
      const buffer = context.createBuffer(1, samples.length, GGWAVE_SAMPLE_RATE)
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
    } catch (transmitError) {
      stopTransmitting()
      setStatus('error')
      setError(errorMessage(transmitError))
      throw transmitError
    } finally {
      if (txInstance !== null) {
        const toFree = txInstance
        void loadGgwave().then((ggwave) => ggwave.free(toFree)).catch(() => {
          // Best-effort cleanup.
        })
      }
    }
  }, [isTransmitting, settings.protocol, settings.volume, stopReceiving, stopTransmitting])

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
    dedupRef.current = null
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
  }, [releaseDecoder, stopMicrophone, stopTransmitting])

  const value = useMemo<WaveStoreValue>(() => ({
    status,
    error,
    isReceiving,
    isStarting,
    isTransmitting,
    lastDecoded,
    history,
    settings,
    visualSource: visualRelay,
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
    visualRelay,
  ])

  return <WaveStoreContext.Provider value={value}>{children}</WaveStoreContext.Provider>
}

export const useWaveStore = () => {
  const store = useContext(WaveStoreContext)
  if (!store) throw new Error('useWaveStore must be used inside WaveStoreProvider.')
  return store
}
