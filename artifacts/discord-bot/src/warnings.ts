import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'warnings.json');

interface WarningEntry {
  by: string;
  reason: string;
  timestamp: number;
}

type Store = Record<string, Record<string, WarningEntry[]>>;

function load(): Store {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function save(data: Store): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function addWarning(guildId: string, userId: string, by: string, reason: string): WarningEntry {
  const data = load();
  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) data[guildId][userId] = [];
  const entry: WarningEntry = { by, reason, timestamp: Date.now() };
  data[guildId][userId].push(entry);
  save(data);
  return entry;
}

export function getWarnings(guildId: string, userId: string): WarningEntry[] {
  const data = load();
  return data[guildId]?.[userId] ?? [];
}

export function clearWarnings(guildId: string, userId: string): void {
  const data = load();
  if (data[guildId]) {
    delete data[guildId][userId];
    save(data);
  }
}
