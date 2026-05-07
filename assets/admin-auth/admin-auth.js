/**
 * AdminAuth Primitive — minimal password gate for TGK admin surfaces.
 * Exposes window.AdminAuth with: isUnlocked(), prompt(), lock().
 * 
 * WIRING FOR AGENT 1 (builder.html):
 * ———————————————————————————————————
 * In the <head>:
 *   <link rel="stylesheet" href="/assets/admin-auth/admin-auth.css">
 *   <script src="/assets/admin-auth/admin-auth.js"><\/script>
 * 
 * Early in your admin setup logic (before showing admin UI):
 *   if (!AdminAuth.isUnlocked()) {
 *     AdminAuth.prompt().then(ok => {
 *       if (ok) {
 *         // Show admin UI (your .gate element hides, .app shows)
 *         showAdminUI();
 *       } else {
 *         // User cancelled; either retry or exit
 *         window.location.href = '/';
 *       }
 *     });
 *   } else {
 *     // Already unlocked in this session, proceed
 *     showAdminUI();
 *   }
 */

window.AdminAuth = (() => {
  const EXPECTED_PASSWORD = 'Welcome01!';
  const SESSION_KEY = 'tgk-admin-unlocked';
  const COOKIE_NAME = 'x-tgk-admin';

  /**
   * Check if the gate is already unlocked in this session.
   * Returns true if the user has unlocked during this browser session.
   */
  function isUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }

  /**
   * Lock the gate (clear unlock state).
   * Next page load will re-prompt.
   */
  function lock() {
    sessionStorage.removeItem(SESSION_KEY);
    // Also clear the server-side cookie so /admin/* requests fail
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }

  /**
   * Show the password prompt modal.
   * Returns a Promise that resolves to true if password is correct, false otherwise.
   */
  function prompt() {
    return new Promise((resolve) => {
      // Create modal HTML
      const modalHtml = `
        <div class="admin-auth-modal">
          <div class="admin-auth-card">
            <div class="admin-auth-header">Admin Access</div>
            <div class="admin-auth-sub">Enter the password to continue.</div>
            <div class="admin-auth-form">
              <input 
                type="password" 
                class="admin-auth-input" 
                id="admin-auth-pwd" 
                placeholder="Password"
                autocomplete="off"
              />
              <div class="admin-auth-err" id="admin-auth-err"></div>
              <button class="admin-auth-btn-submit" id="admin-auth-submit">Unlock</button>
              <button class="admin-auth-btn-cancel" id="admin-auth-cancel">Cancel</button>
            </div>
          </div>
        </div>
      `;

      const temp = document.createElement('div');
      temp.innerHTML = modalHtml;
      const modal = temp.firstElementChild;
      document.body.appendChild(modal);

      const input = modal.querySelector('#admin-auth-pwd');
      const errDiv = modal.querySelector('#admin-auth-err');
      const submitBtn = modal.querySelector('#admin-auth-submit');
      const cancelBtn = modal.querySelector('#admin-auth-cancel');

      // Focus input immediately
      input.focus();

      function closeModal(success) {
        modal.remove();
        resolve(success);
      }

      function handleSubmit() {
        const pwd = input.value.trim();
        if (pwd === EXPECTED_PASSWORD) {
          // Store unlock in sessionStorage and set server cookie
          sessionStorage.setItem(SESSION_KEY, 'true');
          document.cookie = `${COOKIE_NAME}=${EXPECTED_PASSWORD}; path=/`;
          closeModal(true);
        } else {
          errDiv.textContent = 'Incorrect password.';
          input.value = '';
          input.focus();
        }
      }

      submitBtn.addEventListener('click', handleSubmit);
      cancelBtn.addEventListener('click', () => closeModal(false));
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
      });
    });
  }

  return { isUnlocked, prompt, lock };
})();
