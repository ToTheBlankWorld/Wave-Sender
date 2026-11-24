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
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ReceivedMessage =>
      typeof item === 'object' && item !== null &&
      typeof (item as Partial<ReceivedMessage>).id === 'string' &&
      typeof (item as Partial<ReceivedMessage>).text === 'string' &&
      typeof (item as Partial<ReceivedMessage>).receivedAt === 'number'
    ).slice(0, 20);
  } catch {
    return [];
  }
}

export async function saveHistory(items: ReceivedMessage[]): Promise<void> {
  const safe = items.filter((item) =>
    typeof item.id === 'string' &&
    typeof item.text === 'string' && item.text.length <= 64 &&
    typeof item.receivedAt === 'number'
  ).slice(0, 20);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(safe));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
