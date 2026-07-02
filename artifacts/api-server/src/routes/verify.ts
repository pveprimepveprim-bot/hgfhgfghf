import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

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

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #111214;
    color: #dbdee1;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }
  .card {
    background: #1e1f22;
    border-radius: 12px;
    padding: 40px 48px;
    max-width: 480px;
    width: 100%;
    border: 1px solid #2b2d31;
  }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #fff; }
  .sub { font-size: 14px; color: #949ba4; margin-bottom: 28px; }
  .steps {
    display: flex;
    gap: 6px;
    margin-bottom: 28px;
  }
  .step-dot {
    height: 4px;
    flex: 1;
    border-radius: 2px;
    background: #2b2d31;
  }
  .step-dot.done { background: #5865f2; }
  .step-dot.active { background: #7983f5; }
  .rules {
    background: #111214;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.7;
    color: #b5bac1;
  }
  .rules li { margin-left: 18px; margin-bottom: 4px; }
  label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 14px;
    color: #b5bac1;
    margin-bottom: 20px;
    cursor: pointer;
    line-height: 1.5;
  }
  input[type=checkbox] {
    margin-top: 2px;
    width: 16px;
    height: 16px;
    accent-color: #5865f2;
    flex-shrink: 0;
    cursor: pointer;
  }
  button {
    width: 100%;
    background: #5865f2;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 12px 0;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  button:hover { background: #4752c4; }
  button:disabled { background: #3c3f45; color: #72767d; cursor: not-allowed; }
  .error {
    background: #3d1a1a;
    border: 1px solid #f04747;
    border-radius: 8px;
    padding: 16px;
    font-size: 14px;
    color: #f04747;
    text-align: center;
  }
  .success-icon {
    width: 56px; height: 56px;
    background: #23a55a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 28px;
  }
  .success-text { text-align: center; }
  .success-text p { color: #949ba4; font-size: 14px; margin-top: 8px; }
`;

function page(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;
}

function errorPage(msg: string): string {
  return page('Verification', `<div class="card"><div class="error">${msg}</div></div>`);
}

function stepDots(current: number): string {
  return `<div class="steps">${[1, 2, 3]
    .map((n) => `<div class="step-dot ${n < current ? 'done' : n === current ? 'active' : ''}"></div>`)
    .join('')}</div>`;
}

// Step 1 — Rules
router.get('/verify/:token', (req, res): void => {
  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry) { res.status(404).send(errorPage('This verification link is invalid.')); return; }
  if (Date.now() > entry.expiresAt) { res.status(410).send(errorPage('This verification link has expired. Request a new one by clicking the Verify button again.')); return; }
  if (entry.step >= 3) { res.status(410).send(errorPage('This link has already been used.')); return; }

  res.send(page('Verification — Step 1', `
    <div class="card">
      <h1>Verification</h1>
      <p class="sub">Complete all steps to gain access.</p>
      ${stepDots(1)}
      <div class="rules">
        <strong style="display:block;margin-bottom:10px;color:#dbdee1">Server Rules</strong>
        <ol>
          <li>Respect all members at all times.</li>
          <li>No harassment, hate speech, or discrimination.</li>
          <li>No spam or self-promotion without permission.</li>
          <li>NSFW content is restricted to designated channels.</li>
          <li>Follow Discord's Terms of Service at all times.</li>
          <li>Staff decisions are final.</li>
        </ol>
      </div>
      <form method="POST" action="/api/verify/${entry.token}/step1">
        <label>
          <input type="checkbox" id="agree" onchange="document.getElementById('btn').disabled=!this.checked" required>
          <span>I have read and agree to follow all server rules.</span>
        </label>
        <button id="btn" type="submit" disabled>Continue</button>
      </form>
    </div>
  `));
});

// Step 2 — Age gate
router.post('/verify/:token/step1', (req, res): void => {
  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry || Date.now() > entry.expiresAt || entry.step >= 3) {
    res.status(410).send(errorPage('This link is no longer valid.')); return;
  }

  entry.step = 1;
  saveStore(store);

  res.send(page('Verification — Step 2', `
    <div class="card">
      <h1>Age Confirmation</h1>
      <p class="sub">This server contains content intended for adults only.</p>
      ${stepDots(2)}
      <div class="rules">
        By continuing you confirm that you are <strong>18 years of age or older</strong>.
        Providing false information may result in a permanent ban.
      </div>
      <form method="POST" action="/api/verify/${entry.token}/step2">
        <label>
          <input type="checkbox" id="age" onchange="document.getElementById('btn2').disabled=!this.checked" required>
          <span>I confirm that I am 18 years of age or older.</span>
        </label>
        <button id="btn2" type="submit" disabled>Continue</button>
      </form>
    </div>
  `));
});

// Step 3 — Final confirmation
router.post('/verify/:token/step2', (req, res): void => {
  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry || Date.now() > entry.expiresAt || entry.step >= 3) {
    res.status(410).send(errorPage('This link is no longer valid.')); return;
  }

  entry.step = 2;
  saveStore(store);

  res.send(page('Verification — Step 3', `
    <div class="card">
      <h1>Final Step</h1>
      <p class="sub">One last confirmation before you get access.</p>
      ${stepDots(3)}
      <div class="rules">
        By submitting you acknowledge that you have read the rules and meet the age requirement.
        Violations may lead to removal from the server.
      </div>
      <form method="POST" action="/api/verify/${entry.token}/complete">
        <label>
          <input type="checkbox" id="final" onchange="document.getElementById('btn3').disabled=!this.checked" required>
          <span>I understand and accept all conditions.</span>
        </label>
        <button id="btn3" type="submit" disabled>Verify me</button>
      </form>
    </div>
  `));
});

// Complete — mark verified
router.post('/verify/:token/complete', (req, res): void => {
  const store = loadStore();
  const entry = store[req.params.token];

  if (!entry || entry.step >= 3) {
    res.status(410).send(errorPage('This link is no longer valid or has already been used.')); return;
  }
  if (Date.now() > entry.expiresAt) {
    res.status(410).send(errorPage('This verification link has expired. Request a new one.')); return;
  }

  entry.step = 3;
  saveStore(store);

  res.send(page('Verified', `
    <div class="card">
      <div class="success-icon">&#10003;</div>
      <div class="success-text">
        <h1>You're verified.</h1>
        <p>Your role will be assigned within a few seconds.<br>You can close this tab.</p>
      </div>
    </div>
  `));
});

export default router;
