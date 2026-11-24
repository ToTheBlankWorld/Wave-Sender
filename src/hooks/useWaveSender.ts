import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { loadHistory, saveHistory } from '../services/history';
import { decodeText, encodeText, ggwave, Protocol, startModem } from '@animatereactnative/ggwave';
import { AudioModule, useAudioStream } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { loadSettings } from '../services/settings';

export type SenderStatus = 'idle' | 'transmitting' | 'listening' | 'decoded' | 'error';

export function useWaveSender() {
  const [status, setStatus] = useState<SenderStatus>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [received, setReceived] = useState<string>('');
  const [lastDecoded, setLastDecoded] = useState<string>('');
  const [decodeStatus, setDecodeStatus] = useState<'waiting' | 'decoded' | 'stopped'>('waiting');
  const [levels, setLevels] = useState<number[]>(new Array(32).fill(0));
  const transmitAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receivedGuard = useRef<string>('');
  const listeningRef = useRef(false);
  const startingRef = useRef(false);
  const permissionPromptRef = useRef(false);
  const listenGenerationRef = useRef(0);
  const lastDecodedRef = useRef('');
  const stream = useAudioStream({
    sampleRate: 48000,
    channels: 1,
    encoding: 'float32',
    onBuffer: (buffer) => {
      if (!listeningRef.current) return;
      const data = new Float32Array(buffer.data);
      if (!data.length) return;
      const bands = 32;
      const next = new Array<number>(bands);
      const bandSize = Math.max(1, Math.floor(data.length / bands));
      for (let band = 0; band < bands; band += 1) {
        let sum = 0;
        const start = band * bandSize;
        const end = Math.min(start + bandSize, data.length);
        let count = 0;
        for (let index = start; index < end; index += 1) {
          sum += data[index] * data[index];
          count += 1;
        }
        const rms = count ? Math.sqrt(sum / count) : 0;
        next[band] = Math.max(0.06, Math.min(1, rms * 4.8));
      }
      setLevels(next);
    },
  });

  const releaseAudio = useCallback(() => {
    listeningRef.current = false;
    if (transmitAnimationRef.current) clearInterval(transmitAnimationRef.current);
    if (transmitTimeoutRef.current) clearTimeout(transmitTimeoutRef.current);
    transmitAnimationRef.current = null;
    transmitTimeoutRef.current = null;
    ggwave.stop();
    stream.stream?.stop();
    deactivateKeepAwake('wave-sender-listening');
  }, [stream.stream]);

  const stopListening = useCallback(() => {
    listenGenerationRef.current += 1;
    startingRef.current = false;
    permissionPromptRef.current = false;
    setIsStarting(false);
    releaseAudio();
    setIsListening(false);
    setLevels(new Array(32).fill(0));
    setDecodeStatus(lastDecodedRef.current ? 'stopped' : 'waiting');
    setStatus(lastDecodedRef.current ? 'decoded' : 'idle');
  }, [releaseAudio]);

  useEffect(() => {
    releaseAudio();
    ggwave.onMessage = (payload: ArrayBuffer) => {
      if (!listeningRef.current) return;
      const text = decodeText(payload).trim();
      const guard = `${text}:${text.length}`;
      if (!text || guard === receivedGuard.current) return;
      receivedGuard.current = guard;
      lastDecodedRef.current = text;
      setReceived(text);
      setLastDecoded(text);
      setDecodeStatus('decoded');
      setIsListening(true);
      const item = { id: `${Date.now()}-${text.length}`, text, receivedAt: Date.now() };
      loadHistory().then((history) => saveHistory([item, ...history].slice(0, 20)));
      setStatus('decoded');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    return () => {
      listenGenerationRef.current += 1;
      listeningRef.current = false;
      startingRef.current = false;
      ggwave.onMessage = undefined;
      releaseAudio();
    };
  }, [releaseAudio]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && (listeningRef.current || (startingRef.current && !permissionPromptRef.current))) {
        stopListening();
      }
    });
    return () => subscription.remove();
  }, [stopListening]);

  const transmit = async (text: string, volume = 50) => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Add a message', 'Enter text or a link before transmitting.');
      return;
    }
    if (listeningRef.current || startingRef.current) stopListening();
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission required', 'Allow microphone access to transmit this sound message.');
        setStatus('idle');
        return;
      }
      const byteLength = new TextEncoder().encode(trimmed).length;
      if (byteLength > 64) throw new Error('Message exceeds 64 bytes');
      const settings = await loadSettings();
      const protocol = settings.protocol === 'ultrasound' ? Protocol.ULTRASOUND_FAST : Protocol.AUDIBLE_FAST;
      const payload = encodeText(trimmed, 64);
      ggwave.stop();
      ggwave.allowSelfReception = false;
      startModem({ protocol, payloadBytes: 64, variableLength: false });
      setStatus('transmitting');

      const encodedWaveform = new Float32Array(ggwave.encode(payload, protocol, settings.volume));
      if (transmitAnimationRef.current) clearInterval(transmitAnimationRef.current);
      if (transmitTimeoutRef.current) clearTimeout(transmitTimeoutRef.current);
      let frame = 0;
      transmitAnimationRef.current = setInterval(() => {
        const bands = 32;
        const next = new Array<number>(bands);
        const windowSize = Math.max(1, Math.floor(encodedWaveform.length / 32));
        const startOffset = Math.floor((frame / 24) * windowSize) % Math.max(1, encodedWaveform.length - windowSize);
        for (let band = 0; band < bands; band += 1) {
          const start = startOffset + band * 2;
          let sum = 0;
          let count = 0;
          for (let index = start; index < Math.min(start + windowSize, encodedWaveform.length); index += 32) {
            sum += encodedWaveform[index] * encodedWaveform[index];
            count += 1;
          }
          const rms = count ? Math.sqrt(sum / count) : 0;
          next[band] = Math.max(0.02, Math.min(1, rms * 3.2));
        }
        setLevels(next);
        frame += 1;
      }, 42);

      if (settings.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ggwave.send(payload, settings.volume);
      const duration = ggwave.durationMs(protocol, 64, false);
      transmitTimeoutRef.current = setTimeout(() => {
        transmitTimeoutRef.current = null;
        if (transmitAnimationRef.current) clearInterval(transmitAnimationRef.current);
        transmitAnimationRef.current = null;
        setLevels(new Array(32).fill(0));
        ggwave.stop();
        setStatus('idle');
      }, Math.max(duration + 250, 900));
    } catch (error) {
      releaseAudio();
      setStatus('error');
      Alert.alert('Transmission unavailable', error instanceof Error ? error.message : 'Could not transmit this message');
    }
  };

  const listen = async () => {
    if (listeningRef.current || startingRef.current) return;
    const generation = ++listenGenerationRef.current;
    startingRef.current = true;
    permissionPromptRef.current = true;
    setIsStarting(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      permissionPromptRef.current = false;
      if (generation !== listenGenerationRef.current) return;
      if (AppState.currentState !== 'active') {
        releaseAudio();
        setStatus('idle');
        return;
      }
      if (!permission.granted) {
        releaseAudio();
        setIsListening(false);
        setLevels(new Array(32).fill(0));
        setStatus('idle');
        Alert.alert('Microphone permission required', 'Allow microphone access to receive nearby sound messages.');
        return;
      }
      const settings = await loadSettings();
      if (generation !== listenGenerationRef.current) return;
      const protocol = settings.protocol === 'ultrasound' ? Protocol.ULTRASOUND_FAST : Protocol.AUDIBLE_FAST;
      releaseAudio();
      ggwave.allowSelfReception = false;
      listeningRef.current = true;
      startModem({ protocol, variableLength: false, payloadBytes: 64 });
      receivedGuard.current = '';
      setDecodeStatus('waiting');
      await stream.stream?.start();
      if (generation !== listenGenerationRef.current) {
        releaseAudio();
        return;
      }
      if (settings.keepScreenAwake) await activateKeepAwakeAsync('wave-sender-listening');
      if (generation !== listenGenerationRef.current) {
        releaseAudio();
        return;
      }
      setIsListening(true);
      setStatus('listening');
      if (settings.haptics) Haptics.selectionAsync();
    } catch (error) {
      permissionPromptRef.current = false;
      if (generation !== listenGenerationRef.current) return;
      releaseAudio();
      setIsListening(false);
      setLevels(new Array(32).fill(0));
      setStatus('error');
      Alert.alert('Microphone unavailable', error instanceof Error ? error.message : 'Could not start listening');
    } finally {
      permissionPromptRef.current = false;
      if (generation === listenGenerationRef.current) {
        startingRef.current = false;
        setIsStarting(false);
      }
    }
  };

  return { status, isListening, isStarting, received, lastDecoded, decodeStatus, levels, transmit, listen, stopListening };
}
