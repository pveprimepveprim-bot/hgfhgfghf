import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// ── Data store (shared with the Discord bot) ────────────────────────────────
const DATA_FILE = '/home/runner/workspace/data/verifications.json';

interface VerifyEntry {
  token: string;
  userId: string;
  guildId: string;
  createdAt: number;
  step: number;
  processed: boolean;
  expiresAt: number;
}

function loadStore(): Record<string, VerifyEntry> {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveStore(data: Record<string, VerifyEntry>): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Static assets (CSS + JS) ────────────────────────────────────────────────
// Served from artifacts/api-server/public/verify/
// Edit those files freely — they are separate, normal web files.
const publicDir = path.join(process.cwd(), 'public', 'verify');

router.get('/verify/style.css', (_req, res): void => {
  res.sendFile(path.join(publicDir, 'style.css'));
});

router.get('/verify/app.js', (_req, res): void => {
  res.sendFile(path.join(publicDir, 'app.js'));
});

// ── HTML page ───────────────────────────────────────────────────────────────
// Serves index.html for any valid token path.
// The JS in index.html fetches /api/verify/:token/check to validate.
router.get('/verify/:token', (req, res): void => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Token validation check ──────────────────────────────────────────────────
router.get('/verify/:token/check', (req, res): void => {
  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry) {
    res.json({ valid: false, expired: false, used: false });
    return;
  }

  if (entry.step >= 3) {
    res.json({ valid: true, expired: false, used: true });
    return;
  }

  if (Date.now() > entry.expiresAt) {
    res.json({ valid: true, expired: true, used: false });
    return;
  }

  res.json({ valid: true, expired: false, used: false });
});

// ── Advance step (steps 1 and 2) ────────────────────────────────────────────
router.post('/verify/:token/advance', (req, res): void => {
  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry) {
    res.json({ error: 'Invalid link.' });
    return;
  }
  if (Date.now() > entry.expiresAt) {
    res.json({ error: 'This link has expired. Request a new one from Discord.' });
    return;
  }
  if (entry.step >= 3) {
    res.json({ error: 'This link has already been used.' });
    return;
  }

  const incoming = typeof req.body?.step === 'number' ? req.body.step : -1;

  // Only allow advancing by exactly one step
  if (incoming !== entry.step) {
    res.json({ error: 'Unexpected step sequence.' });
    return;
  }

  entry.step = incoming + 1;
  saveStore(store);

  res.json({ success: true, nextStep: entry.step });
});

// ── Complete verification (step 3) ──────────────────────────────────────────
router.post('/verify/:token/complete', (req, res): void => {
  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry) {
    res.json({ error: 'Invalid link.' });
    return;
  }
  if (Date.now() > entry.expiresAt) {
    res.json({ error: 'This link has expired. Request a new one from Discord.' });
    return;
  }
  if (entry.step >= 3) {
    res.json({ error: 'This link has already been used.' });
    return;
  }
  if (entry.step !== 2) {
    res.json({ error: 'Complete the previous steps first.' });
    return;
  }

  entry.step = 3;
  saveStore(store);

  res.json({ success: true });
});

export default router;
