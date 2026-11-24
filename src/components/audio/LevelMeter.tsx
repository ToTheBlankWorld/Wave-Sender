import { StyleSheet, Text, View } from 'react-native';

type LevelMeterProps = {
  level: number;
  active?: boolean;
  label?: string;
};

export function LevelMeter({ level, active = false, label = 'OUT' }: LevelMeterProps) {
  const peak = Math.max(0, Math.min(1, level));
  const db = peak <= 0.0001 ? -60 : Math.max(-60, 20 * Math.log10(peak));
  const clipping = peak >= 0.94;

  return (
    <View style={styles.root} accessibilityRole="adjustable" accessibilityLabel={`${label} level ${db.toFixed(1)} decibels`}>
      <View style={styles.track}>
        {Array.from({ length: 20 }, (_, index) => {
          const filled = index / 20 <= peak;
          const zone = index >= 17 ? 'clip' : index >= 14 ? 'warn' : 'ok';
          const color = zone === 'clip' ? '#FF5F66' : zone === 'warn' ? '#FFD166' : '#70EFC1';
          return <View key={index} style={[styles.segment, filled && { backgroundColor: color, opacity: 1 }]} />;
        })}
      </View>
      <View style={styles.readout}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.db, clipping && styles.clipText]}>{db <= -59.9 ? '−∞' : `${db.toFixed(1)} dB`}</Text>
        <View style={[styles.clipLight, clipping && styles.clipActive]}><Text style={styles.clipTextLabel}>CLIP</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 },
  track: { flex: 1, height: 8, flexDirection: 'row', gap: 2, alignItems: 'center' },
  segment: { flex: 1, height: 8, borderRadius: 2, backgroundColor: '#202735', opacity: 0.78 },
  readout: { width: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  label: { color: '#7E899C', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  db: { color: '#BFC7D4', width: 48, textAlign: 'right', fontSize: 10, fontVariant: ['tabular-nums'], fontWeight: '800' },
  clipLight: { height: 14, minWidth: 28, borderRadius: 5, borderWidth: 1, borderColor: '#343A46', alignItems: 'center', justifyContent: 'center', backgroundColor: '#171A20' },
  clipActive: { backgroundColor: '#FF5F66', borderColor: '#FF8A8F' },
  clipText: { color: '#FF9AA0' },
  clipTextLabel: { color: '#7F8794', fontSize: 7, fontWeight: '900' },
});
