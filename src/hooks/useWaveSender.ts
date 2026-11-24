import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { loadHistory, saveHistory } from '../services/history';
import { encodeText, ggwave, Protocol, startModem } from '@animatereactnative/ggwave';
import { AudioModule } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { loadSettings } from '../services/settings';

export type SenderStatus = 'idle' | 'transmitting' | 'listening' | 'decoded' | 'error';

export function useWaveSender() {
  const [status, setStatus] = useState<SenderStatus>('idle');
  const [received, setReceived] = useState<string>('');
  const receivedGuard = useRef<string>('');

  useEffect(() => {
    ggwave.onMessage = (payload: ArrayBuffer) => {
      const text = new TextDecoder().decode(payload);
      const guard = `${text}:${text.length}`;
      if (!text || guard === receivedGuard.current) return;
      receivedGuard.current = guard;
      setReceived(text);
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
      if (settings.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ggwave.send(payload, settings.volume);
      const duration = ggwave.durationMs(protocol, byteLength, false);
      setTimeout(() => {
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
    deactivateKeepAwake('wave-sender-listening');
    setStatus('idle');
  };

  return { status, received, transmit, listen, stopListening };
}
