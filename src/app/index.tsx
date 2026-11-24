import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { useWaveSender } from '../hooks/useWaveSender';
import { LevelMeter } from '../components/audio/LevelMeter';


function LiveWaveScope({ compact = false, levels = [], active = false, variant = 'receive' }: { compact?: boolean; levels?: number[]; active?: boolean; variant?: 'send' | 'receive' }) {
  const bars = levels.length ? levels : new Array(compact ? 14 : 48).fill(0);
  const visible = bars.slice(0, compact ? 14 : 48);

  if (!active && !compact) {
    return (
      <View style={styles.idleScope}>
        {Array.from({ length: 48 }, (_, index) => <View key={index} style={[styles.idleDot, index % 4 === 0 && styles.idleDotStrong]} />)}
      </View>
    );
  }

  return (
    <View style={[styles.liveScope, compact && styles.liveScopeCompact]}>
      {visible.map((level, index) => {
        const center = visible.length / 2;
        const mirror = compact ? 1 : 0.72 + Math.abs(index - center) / visible.length * 0.28;
        const height = compact ? 3 + level * 36 : 4 + level * 112 * mirror;
        return (
          <View
            key={index}
            style={[
              styles.liveBar,
              {
                height,
                backgroundColor: variant === 'send' ? '#FFB36B' : '#65C7FF',
                opacity: 0.35 + level * 0.65,
              },
            ]}
          />
        );
      })}
      {active ? <View style={[styles.playhead, variant === 'send' ? styles.playheadSend : styles.playheadReceive]} /> : null}
    </View>
  );
}

export default function Home() {
  const [mode, setMode] = useState<'send' | 'receive'>('send');
  const [message, setMessage] = useState('');
  const wave = useWaveSender();
  const byteCount = new TextEncoder().encode(message).length;

  const stopReceivingIfActive = () => {
    if (wave.isListening || wave.isStarting) wave.stopListening();
  };

  const switchMode = (next: 'send' | 'receive') => {
    if (next === 'send') stopReceivingIfActive();
    Haptics.selectionAsync();
    setMode(next);
  };

  const openScreen = (path: '/history' | '/settings') => {
    stopReceivingIfActive();
    router.push(path);
  };

  return (
    <LinearGradient colors={[colors.background, '#0B1017', colors.background]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>OFFLINE CHANNEL</Text>
              <Text style={styles.title}>Wave-Sender</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Open received history" onPress={() => openScreen('/history')} style={styles.iconButton}>
                <Ionicons name="time-outline" size={20} color={colors.text} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => openScreen('/settings')} style={styles.iconButton}>
                <Ionicons name="options-outline" size={21} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.signalCard}>
            <View style={styles.signalTopline}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, mode === 'send' ? styles.statusSend : styles.statusReceive]} />
                <Text style={styles.statusText}>{mode === 'send' ? wave.status === 'transmitting' ? 'Transmitting' : wave.status === 'error' ? 'Action failed' : 'Ready to transmit' : wave.isListening ? wave.decodeStatus === 'decoded' ? 'Listening · message received' : 'Listening' : wave.status === 'decoded' ? 'Last message received' : wave.status === 'error' ? 'Action failed' : 'Ready to listen'}</Text>
              </View>
              <Text style={styles.frequency}>18.4 kHz</Text>
            </View>

            <View style={styles.scope}>
              <LiveWaveScope levels={wave.levels} active={wave.status === 'transmitting' || wave.isListening} variant={mode === 'send' ? 'send' : 'receive'} />
              <View style={[styles.scanLine, mode === 'receive' && styles.scanLineReceive]} />
            </View>

            <View style={styles.scopeFooter}>
              <Text style={styles.scopeLabel}>CARRIER</Text>
              <LevelMeter
                level={wave.levels.length ? Math.max(...wave.levels) : 0}
                active={wave.status === 'transmitting' || wave.isListening}
                label={mode === 'send' ? 'TX' : 'RX'}
              />
              <Text style={styles.scopeLabel}>{mode === 'send' ? 'TX' : 'RX'}</Text>
            </View>
          </View>

          <View style={styles.segment}>
            <Pressable onPress={() => switchMode('send')} style={[styles.segmentButton, mode === 'send' && styles.segmentActiveSend]}>
              <Ionicons name="arrow-up-outline" size={17} color={mode === 'send' ? '#10131A' : colors.textMuted} />
              <Text style={[styles.segmentText, mode === 'send' && styles.segmentTextActive]}>Send</Text>
            </Pressable>
            <Pressable onPress={() => switchMode('receive')} style={[styles.segmentButton, mode === 'receive' && styles.segmentActiveReceive]}>
              <Ionicons name="radio-outline" size={17} color={mode === 'receive' ? '#10131A' : colors.textMuted} />
              <Text style={[styles.segmentText, mode === 'receive' && styles.segmentTextActive]}>Receive</Text>
            </Pressable>
          </View>

          {mode === 'send' ? (
            <View style={styles.panel}>
              <View style={styles.panelHeadingRow}>
                <Text style={styles.panelHeading}>Message</Text>
                <Text style={[styles.counter, byteCount > 64 && styles.counterError]}>{byteCount}/64 bytes</Text>
              </View>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a link or note…"
                placeholderTextColor="#697184"
                multiline
                maxLength={64}
                style={styles.input}
                accessibilityLabel="Message to send"
              />
              <View style={styles.quickRow}>
                {['https://', 'Hello!', 'Location'].map((item) => (
                  <Pressable key={item} onPress={() => setMessage(item)} style={styles.quickChip}>
                    <Text style={styles.quickText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                onPress={() => wave.transmit(message, 50)}
              >
                <Ionicons name="paper-plane" size={18} color="#10131A" />
                <Text style={styles.primaryText}>Transmit signal</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.panel}>
              <View style={styles.receiveHeader}>
                <View>
                  <Text style={styles.panelHeading}>Incoming signal</Text>
                  <Text style={styles.receiveHint}>Hold devices nearby</Text>
                </View>
                <LiveWaveScope compact levels={wave.levels} active={wave.isListening} variant="receive" />
              </View>
              {wave.lastDecoded ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy received message"
                  onPress={async () => {
                    await Clipboard.setStringAsync(wave.lastDecoded);
                    Haptics.selectionAsync();
                  }}
                  style={styles.receivedText}
                >
                  <View style={styles.decodedHeader}>
                    <Text style={styles.decodedLabel}>{wave.decodeStatus === 'decoded' ? 'Decoded just now' : wave.decodeStatus === 'stopped' ? 'Last decoded' : 'Waiting for signal'}</Text>
                    <Ionicons name="copy-outline" size={17} color={colors.textMuted} />
                  </View>
                  <Text selectable style={styles.receivedTextInner}>{wave.lastDecoded}</Text>
                </Pressable>
              ) : (
                <View style={styles.receivedEmpty}>
                  <Ionicons name="radio-outline" size={20} color="#596578" />
                  <Text style={styles.receivedEmptyText}>Decoded text will appear here</Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={wave.isStarting}
                style={[styles.primaryButton, styles.receiveButton, wave.isStarting && styles.receiveButtonDisabled]}
                onPress={() => wave.isListening ? wave.stopListening() : wave.listen()}
              >
                <Ionicons name="radio" size={18} color="#10131A" />
                <Text style={styles.primaryText}>{wave.isStarting ? 'Starting…' : wave.isListening ? 'Stop receiving' : 'Start receiving'}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { height: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 3 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.7 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  signalCard: { backgroundColor: '#10141B', borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 14 },
  signalTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusSend: { backgroundColor: '#65A7FF' },
  statusReceive: { backgroundColor: '#FF6B73' },
  statusText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  frequency: { color: '#758096', fontSize: 11, fontVariant: ['tabular-nums'] },
  scope: { height: 168, borderRadius: 17, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#26323A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  idleScope: { width: '88%', height: 124, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idleDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#26384A', opacity: 0.72 },
  idleDotStrong: { backgroundColor: '#36526B', opacity: 0.9 },
  liveScope: { position: 'relative', width: '88%', height: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2, overflow: 'hidden' },
  liveScopeCompact: { width: 94, height: 44, gap: 1 },
  liveBar: { width: 3, minHeight: 3, maxHeight: 126, borderRadius: 2 },
  playhead: { position: 'absolute', width: 2, height: 112, left: '48%', top: 9, borderRadius: 2, opacity: 0.9 },
  playheadSend: { backgroundColor: '#FFB36B', shadowColor: '#FFB36B', shadowRadius: 8, shadowOpacity: 0.8 },
  playheadReceive: { backgroundColor: '#65C7FF', shadowColor: '#65C7FF', shadowRadius: 8, shadowOpacity: 0.8 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 1, top: 58, backgroundColor: 'rgba(114,231,242,.22)' },
  scanLineReceive: { backgroundColor: 'rgba(184,240,90,.28)' },
  scopeFooter: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scopeLabel: { color: '#657083', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  levels: { flexDirection: 'row', gap: 4 },
  level: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#2B313D' },
  levelActive: { backgroundColor: colors.cyan },
  segment: { height: 62, marginTop: 14, padding: 5, borderRadius: 18, backgroundColor: colors.surface, flexDirection: 'row', borderWidth: 1, borderColor: colors.line },
  segmentButton: { flex: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  segmentActiveSend: { backgroundColor: '#65A7FF' },
  segmentActiveReceive: { backgroundColor: '#FF6B73' },
  segmentText: { color: colors.textMuted, fontSize: 14, fontWeight: '800' },
  segmentTextActive: { color: '#10131A' },
  panel: { marginTop: 14, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16 },
  panelHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  panelHeading: { color: colors.text, fontSize: 15, fontWeight: '800' },
  counter: { color: '#737D91', fontSize: 11, fontVariant: ['tabular-nums'] },
  counterError: { color: '#FF8E98', fontWeight: '800' },
  input: { minHeight: 112, borderRadius: 16, backgroundColor: '#0C0F15', borderWidth: 1, borderColor: '#252C38', color: colors.text, padding: 14, fontSize: 16, textAlignVertical: 'top' },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickChip: { borderRadius: 999, backgroundColor: '#1A202B', borderWidth: 1, borderColor: '#2A3140', paddingHorizontal: 12, height: 34, alignItems: 'center', justifyContent: 'center' },
  quickText: { color: '#BBC2CF', fontSize: 12, fontWeight: '700' },
  primaryButton: { height: 54, borderRadius: 16, backgroundColor: '#65A7FF', marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  primaryText: { color: '#10131A', fontSize: 15, fontWeight: '900' },
  receiveHeader: { minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  receiveHint: { color: colors.textMuted, fontSize: 13, marginTop: 5 },
  receiveButton: { backgroundColor: '#FF6B73' },
  receiveButtonDisabled: { opacity: 0.55 },
  receivedText: { marginTop: 12, borderRadius: 14, backgroundColor: '#0C0F15', borderWidth: 1, borderColor: '#26323A', padding: 14 },
  decodedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  decodedLabel: { color: '#FF8D96', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  receivedTextInner: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 },
  receivedEmpty: { minHeight: 58, marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#252C38', backgroundColor: '#0C0F15', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  receivedEmptyText: { color: '#7E899C', fontSize: 12 },
});
