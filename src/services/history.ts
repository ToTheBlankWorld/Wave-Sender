import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReceivedMessage = {
  id: string;
  text: string;
  receivedAt: number;
};

const HISTORY_KEY = 'wave-sender.history.v1';

export async function loadHistory(): Promise<ReceivedMessage[]> {
  try {
    const value = await AsyncStorage.getItem(HISTORY_KEY);
    return value ? (JSON.parse(value) as ReceivedMessage[]) : [];
  } catch {
    return [];
  }
}

export async function saveHistory(items: ReceivedMessage[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
