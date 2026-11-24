import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { loadHistory, saveHistory } from '../services/history';
import { encodeText, ggwave, Protocol, startModem } from '@animatereactnative/ggwave';

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
    };
  }, []);

  const transmit = async (text: string, volume = 50) => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Add a message', 'Enter text or a link before transmitting.');
      return;
    }
    try {
      const byteLength = new TextEncoder().encode(trimmed).length;
      if (byteLength > 64) throw new Error('Message exceeds 64 bytes');
      const payload = encodeText(trimmed, byteLength);
      setStatus('transmitting');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ggwave.send(payload, volume);
      setTimeout(() => setStatus('idle'), 900);
    } catch (error) {
      setStatus('error');
      Alert.alert('Transmission unavailable', error instanceof Error ? error.message : 'Could not transmit this message');
    }
  };

  const listen = async () => {
    try {
      startModem({ protocol: Protocol.AUDIBLE_FAST, variableLength: true, payloadBytes: 140 });
      setStatus('listening');
      Haptics.selectionAsync();
    } catch (error) {
      setStatus('error');
      Alert.alert('Microphone unavailable', error instanceof Error ? error.message : 'Could not start listening');
    }
  };

  const stopListening = () => {
    ggwave.stop();
    setStatus('idle');
  };

  return { status, received, transmit, listen, stopListening };
}
