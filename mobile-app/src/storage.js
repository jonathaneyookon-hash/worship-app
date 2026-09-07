import { Preferences } from '@capacitor/preferences';

const KEY = 'saved-connections';

export async function getSavedConnections() {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export async function saveConnection(conn) {
  const list = await getSavedConnections();
  // De-dupe by URL -- re-adding the same service (e.g. re-scanning after the
  // desktop's IP changed) updates the name in place instead of duplicating.
  const existingIndex = list.findIndex((c) => c.url === conn.url);
  const entry = { id: conn.url, name: conn.name, url: conn.url };
  if (existingIndex >= 0) list[existingIndex] = entry;
  else list.push(entry);
  await Preferences.set({ key: KEY, value: JSON.stringify(list) });
  return list;
}

export async function removeConnection(url) {
  const list = await getSavedConnections();
  const filtered = list.filter((c) => c.url !== url);
  await Preferences.set({ key: KEY, value: JSON.stringify(filtered) });
  return filtered;
}
