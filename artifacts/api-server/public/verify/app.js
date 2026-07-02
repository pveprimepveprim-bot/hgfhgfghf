/* ================================================================
   VERIFICATION PAGE — CLIENT LOGIC
   You can edit the text/UI in index.html and style.css freely.
   Only edit this file if you need to change the step flow itself.
   ================================================================ */

(function () {
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
  // Check that the token is valid before showing anything.
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
