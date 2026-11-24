import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { loadHistory, saveHistory } from '../services/history';
import { decodeText, encodeText, ggwave, Protocol, startModem } from '@animatereactnative/ggwave';
import { AudioModule, useAudioStream } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { loadSettings } from '../services/settings';

export type SenderStatus = 'idle' | 'transmitting' | 'listening' | 'decoded' | 'error';

export function useWaveSender() {
  const [status, setStatus] = useState<SenderStatus>('idle');
  const [received, setReceived] = useState<string>('');
  const [lastDecoded, setLastDecoded] = useState<string>('');
  const [levels, setLevels] = useState<number[]>(new Array(32).fill(0));
  const transmitAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const receivedGuard = useRef<string>('');
  const stream = useAudioStream({
    sampleRate: 48000,
    channels: 1,
    encoding: 'float32',
    onBuffer: (buffer) => {
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

  useEffect(() => {
    ggwave.onMessage = (payload: ArrayBuffer) => {
      const text = decodeText(payload).trim();
      const guard = `${text}:${text.length}`;
      if (!text || guard === receivedGuard.current) return;
      receivedGuard.current = guard;
      setReceived(text);
      setLastDecoded(text);
      const item = { id: `${Date.now()}-${text.length}`, text, receivedAt: Date.now() };
      loadHistory().then((history) => saveHistory([item, ...history].slice(0, 20)));
      setStatus('decoded');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    return () => {
      ggwave.stop();
      deactivateKeepAwake('wave-sender-listening');
    };
  }, []);

  const transmit = async (text: string, volume = 50) => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Add a message', 'Enter text or a link before transmitting.');
      return;
    }
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
      const payload = encodeText(trimmed, byteLength);
      ggwave.stop();
      startModem({ protocol, payloadBytes: byteLength, variableLength: false });
      setStatus('transmitting');

      const encodedWaveform = new Float32Array(ggwave.encode(payload, protocol, settings.volume));
      if (transmitAnimationRef.current) clearInterval(transmitAnimationRef.current);
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
      const duration = ggwave.durationMs(protocol, byteLength, false);
      setTimeout(() => {
        if (transmitAnimationRef.current) clearInterval(transmitAnimationRef.current);
        transmitAnimationRef.current = null;
        setLevels(new Array(32).fill(0));
        ggwave.stop();
        setStatus('idle');
      }, Math.max(duration + 250, 900));
    } catch (error) {
      setStatus('error');
      Alert.alert('Transmission unavailable', error instanceof Error ? error.message : 'Could not transmit this message');
    }
  };

  const listen = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission required', 'Allow microphone access to receive nearby sound messages.');
        setStatus('idle');
        return;
      }
      const settings = await loadSettings();
      const protocol = settings.protocol === 'ultrasound' ? Protocol.ULTRASOUND_FAST : Protocol.AUDIBLE_FAST;
      startModem({ protocol, variableLength: true, payloadBytes: 64 });
      await stream.stream.start();
      if (settings.keepScreenAwake) await activateKeepAwakeAsync('wave-sender-listening');
      setStatus('listening');
      if (settings.haptics) Haptics.selectionAsync();
    } catch (error) {
      setStatus('error');
      Alert.alert('Microphone unavailable', error instanceof Error ? error.message : 'Could not start listening');
    }
  };

  const stopListening = () => {
    ggwave.stop();
    stream.stream.stop();
    setLevels(new Array(32).fill(0));
    deactivateKeepAwake('wave-sender-listening');
    setStatus('idle');
  };

  return { status, received, lastDecoded, levels, transmit, listen, stopListening };
}
