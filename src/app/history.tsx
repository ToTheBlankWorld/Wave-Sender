import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { clearHistory, loadHistory, ReceivedMessage } from '../services/history';
import { colors } from '../theme/colors';

export default function HistoryScreen() {
  const [history, setHistory] = useState<ReceivedMessage[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadHistory().then((items) => active && setHistory(items));
    return () => { active = false; };
  }, []));

  const removeAll = async () => {
    await clearHistory();
    setHistory([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Received</Text>
        {history.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear history" onPress={removeAll} style={styles.back}>
            <Ionicons name="trash-outline" size={18} color="#FF9A90" />
          </Pressable>
        ) : <View style={styles.back} />}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, !history.length && styles.emptyContent]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="radio-outline" size={28} color={colors.cyan} /></View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Received messages will appear here after a nearby device transmits to you.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await Clipboard.setStringAsync(item.text);
              Haptics.selectionAsync();
            }}
            style={styles.message}
          >
            <View style={styles.messageTop}>
              <Text style={styles.time}>{new Date(item.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <Ionicons name="copy-outline" size={16} color={colors.textMuted} />
            </View>
            <Text selectable style={styles.messageText}>{item.text}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  emptyContent: { flexGrow: 1 },
  empty: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#102028', borderWidth: 1, borderColor: '#25414B', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: colors.textMuted, textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  message: { marginBottom: 10, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16 },
  messageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  time: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  messageText: { color: colors.text, fontSize: 15, lineHeight: 21 },
});
