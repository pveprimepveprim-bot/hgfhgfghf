import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// ── Shared data store ────────────────────────────────────────────────────────
// Set VERIFICATIONS_FILE env var to the same path on both the bot and API server.
// On Railway: mount a shared volume on both services and point here.
// On Replit: defaults to the workspace data folder.
const DATA_FILE =
  process.env.VERIFICATIONS_FILE ??
  path.join(process.cwd(), '../../data/verifications.json');

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

// ── Token format guard ────────────────────────────────────────────────────────
// Tokens are 24 random bytes encoded as 48 hex characters.
// Reject anything else before touching the filesystem.
const TOKEN_RE = /^[0-9a-f]{48}$/;

function isValidToken(t: string): boolean {
  return TOKEN_RE.test(t);
}

// ── Static assets (CSS + JS) ─────────────────────────────────────────────────
const publicDir = path.join(process.cwd(), 'public', 'verify');

router.get('/verify/style.css', (_req, res): void => {
  res.sendFile(path.join(publicDir, 'style.css'));
});

router.get('/verify/app.js', (_req, res): void => {
  res.sendFile(path.join(publicDir, 'app.js'));
});

// ── HTML page ────────────────────────────────────────────────────────────────
router.get('/verify/:token', (req, res): void => {
  if (!isValidToken(req.params.token)) {
    res.status(400).send('Invalid verification link.');
    return;
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Token validation check (called by app.js on page load) ──────────────────
router.get('/verify/:token/check', (req, res): void => {
  if (!isValidToken(req.params.token)) {
    res.json({ valid: false, expired: false, used: false });
    return;
  }

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

// ── Advance step (steps 1 → 2, 2 → 3) ───────────────────────────────────────
router.post('/verify/:token/advance', (req, res): void => {
  if (!isValidToken(req.params.token)) {
    res.status(400).json({ error: 'Invalid link.' });
    return;
  }

  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry) { res.json({ error: 'Invalid link.' }); return; }
  if (Date.now() > entry.expiresAt) { res.json({ error: 'This link has expired. Request a new one from Discord.' }); return; }
  if (entry.step >= 3) { res.json({ error: 'This link has already been used.' }); return; }

  const incoming = typeof req.body?.step === 'number' ? req.body.step : -1;

  if (incoming !== entry.step) {
    res.json({ error: 'Unexpected step sequence.' });
    return;
  }

  entry.step = incoming + 1;
  saveStore(store);
  res.json({ success: true, nextStep: entry.step });
});

// ── Complete verification (final step) ───────────────────────────────────────
router.post('/verify/:token/complete', (req, res): void => {
  if (!isValidToken(req.params.token)) {
    res.status(400).json({ error: 'Invalid link.' });
    return;
  }

  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry) { res.json({ error: 'Invalid link.' }); return; }
  if (Date.now() > entry.expiresAt) { res.json({ error: 'This link has expired. Request a new one from Discord.' }); return; }
  if (entry.step >= 3) { res.json({ error: 'This link has already been used.' }); return; }
  if (entry.step !== 2) { res.json({ error: 'Complete the previous steps first.' }); return; }

  entry.step = 3;
  saveStore(store);
  res.json({ success: true });
});

export default router;
