import { useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type KnobProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

export function Knob({ value, min = 5, max = 100, step = 1, label, format = (item) => `${item}%`, onChange }: KnobProps) {
  const startValue = useRef(value);
  const [dragging, setDragging] = useState(false);
  const normalized = (value - min) / (max - min);
  const angle = -135 + normalized * 270;

  const onGrant = (event: GestureResponderEvent) => {
    startValue.current = value;
    setDragging(true);
  };

  const onMove = (event: GestureResponderEvent) => {
    const y = event.nativeEvent.locationY;
    const delta = ((34 - y) / 68) * (max - min);
    const next = Math.round((startValue.current + delta) / step) * step;
    onChange(Math.max(min, Math.min(max, next)));
  };

  const onRelease = () => {
    setDragging(false);
    Haptics.selectionAsync();
  };

  return (
    <View style={styles.root}>
      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={onRelease}
        accessibilityRole="adjustable"
        accessibilityLabel={`${label} ${format(value)}`}
        style={[styles.dial, dragging && styles.dialDragging]}
      >
        <View style={styles.rings}>
          {Array.from({ length: 9 }, (_, index) => <View key={index} style={[styles.tick, { transform: [{ rotate: `${-120 + index * 30}deg` }] }]} />)}
        </View>
        <View style={[styles.pointer, { transform: [{ rotate: `${angle}deg` }] }]}>
          <View style={styles.pointerLine} />
        </View>
      </View>
      <Text style={styles.value}>{format(value)}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: 96, alignItems: 'center' },
  dial: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#202530', borderWidth: 1, borderColor: '#3B4453', alignItems: 'center', justifyContent: 'center' },
  dialDragging: { borderColor: '#65A7FF', shadowColor: '#65A7FF', shadowRadius: 10, shadowOpacity: 0.45 },
  rings: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 5, borderColor: '#151922' },
  tick: { position: 'absolute', width: 2, height: 7, left: 30, top: -5, backgroundColor: '#647086', borderRadius: 2 },
  pointer: { position: 'absolute', width: 68, height: 68, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 },
  pointerLine: { width: 3, height: 20, borderRadius: 2, backgroundColor: '#F1F3F7' },
  value: { marginTop: 6, color: '#F3F5F8', fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '900' },
  label: { marginTop: 2, color: '#7E899C', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
