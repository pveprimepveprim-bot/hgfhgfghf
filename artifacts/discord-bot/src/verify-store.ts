import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Shared file between bot and API server — both read/write here
const DATA_FILE = '/home/runner/workspace/data/verifications.json';

export interface VerifyEntry {
  token: string;
  userId: string;
  guildId: string;
  createdAt: number;
  step: number;          // 0=pending, 1=step1 done, 2=step2 done, 3=complete
  processed: boolean;    // role has been assigned
  expiresAt: number;
}

type Store = Record<string, VerifyEntry>;

function load(): Store {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Store;
  } catch {
    return {};
  }
}

function save(data: Store): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function createToken(userId: string, guildId: string): string {
  const data = load();

  // Invalidate any existing pending token for this user in this guild
  for (const [tok, entry] of Object.entries(data)) {
    if (entry.userId === userId && entry.guildId === guildId && !entry.processed) {
      delete data[tok];
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  data[token] = {
    token,
    userId,
    guildId,
    createdAt: now,
    step: 0,
    processed: false,
    expiresAt: now + 15 * 60 * 1000, // 15 minutes
  };
  save(data);
  return token;
}

export function getToken(token: string): VerifyEntry | null {
  const data = load();
  return data[token] ?? null;
}

export function advanceStep(token: string, step: number): boolean {
  const data = load();
  if (!data[token]) return false;
  data[token].step = step;
  save(data);
  return true;
}

export function completeToken(token: string): boolean {
  const data = load();
  if (!data[token]) return false;
  data[token].step = 3;
  save(data);
  return true;
}

export function getPendingCompletions(): VerifyEntry[] {
  const data = load();
  return Object.values(data).filter((e) => e.step === 3 && !e.processed);
}

export function markProcessed(token: string): void {
  const data = load();
  if (data[token]) {
    data[token].processed = true;
    save(data);
  }
}

// Clean up expired tokens older than 1 hour
export function cleanup(): void {
  const data = load();
  const cutoff = Date.now() - 60 * 60 * 1000;
  let changed = false;
  for (const [tok, entry] of Object.entries(data)) {
    if (entry.createdAt < cutoff && entry.processed) {
      delete data[tok];
      changed = true;
    }
  }
  if (changed) save(data);
}
