import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/settings';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveSettings(next);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Output volume</Text>
            <Text style={styles.value}>{settings.volume}%</Text>
          </View>
          <Slider
            value={settings.volume}
            minimumValue={5}
            maximumValue={100}
            minimumTrackTintColor={colors.coral}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.text}
            onSlidingComplete={(value) => update({ volume: Math.round(value) })}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Transmission band</Text>
          <View style={styles.segmentRow}>
            {(['audible', 'ultrasound'] as const).map((protocol) => (
              <Pressable
                key={protocol}
                onPress={() => update({ protocol })}
                style={[styles.segment, settings.protocol === protocol && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, settings.protocol === protocol && styles.segmentTextActive]}>
                  {protocol === 'audible' ? 'Audible' : 'Ultrasound'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <SettingSwitch label="Touch haptics" value={settings.haptics} onChange={(haptics) => update({ haptics })} />
          <View style={styles.divider} />
          <SettingSwitch label="Keep screen awake" value={settings.keepScreenAwake} onChange={(keepScreenAwake) => update({ keepScreenAwake })} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            update(DEFAULT_SETTINGS);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
          style={styles.reset}
        >
          <Text style={styles.resetText}>Reset settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#303641', true: colors.cyan }} thumbColor={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  card: { marginBottom: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 14, fontWeight: '800' },
  value: { color: colors.cyan, fontSize: 13, fontWeight: '800' },
  segmentRow: { marginTop: 12, height: 48, borderRadius: 14, backgroundColor: '#0C0F15', flexDirection: 'row', padding: 4 },
  segment: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  segmentTextActive: { color: colors.text },
  switchRow: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.line },
  reset: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#4A3032', backgroundColor: '#241719', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  resetText: { color: '#FF9A90', fontSize: 14, fontWeight: '800' },
});
