import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppSettings = {
  volume: number;
  protocol: 'audible' | 'ultrasound';
  haptics: boolean;
  keepScreenAwake: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  volume: 50,
  protocol: 'audible',
  haptics: true,
  keepScreenAwake: false,
};

const SETTINGS_KEY = 'wave-sender.settings.v1';

export async function loadSettings(): Promise<AppSettings> {
  try {
    const value = await AsyncStorage.getItem(SETTINGS_KEY);
    return value ? { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
