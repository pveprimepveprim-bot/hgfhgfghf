import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Set VERIFICATIONS_FILE env var to the same path used by the API server.
// On Railway: mount a shared volume on both services and point here.
// On Replit: defaults to the workspace data folder.
const DATA_FILE =
  process.env.VERIFICATIONS_FILE ??
  path.join(process.cwd(), '../../data/verifications.json');

export interface VerifyEntry {
  token: string;
  userId: string;
  guildId: string;
  createdAt: number;
  step: number;
  processed: boolean;
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
    expiresAt: now + 15 * 60 * 1000,
  };
  save(data);
  return token;
}

export function getToken(token: string): VerifyEntry | null {
  return load()[token] ?? null;
}

export function getPendingCompletions(): VerifyEntry[] {
  return Object.values(load()).filter((e) => e.step === 3 && !e.processed);
}

export function markProcessed(token: string): void {
  const data = load();
  if (data[token]) {
    data[token].processed = true;
    save(data);
  }
}

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
