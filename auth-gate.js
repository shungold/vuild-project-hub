/**
 * auth-gate.js — Simple password gate for VUILD Project Hub
 * sessionStorage で認証状態を保持（タブを閉じるまで有効）
 */
(function () {
  const PASS = 'vuild';
  const AUTH_KEY = 'vuild_hub_authed';

  if (sessionStorage.getItem(AUTH_KEY) === '1') return;

  // Hide body content
  document.documentElement.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'auth-gate';
  overlay.innerHTML = `
    <div class="auth-box">
      <div class="auth-logo">VUILD</div>
      <p class="auth-label">パスワードを入力してください</p>
      <input type="password" id="auth-input" class="auth-input" placeholder="Password" autocomplete="off" />
      <button id="auth-btn" class="auth-btn">Enter</button>
      <p id="auth-error" class="auth-error" style="display:none">パスワードが違います</p>
    </div>
  `;
  document.body.prepend(overlay);

  const input = document.getElementById('auth-input');
  const btn = document.getElementById('auth-btn');
  const error = document.getElementById('auth-error');

  function tryAuth() {
    if (input.value === PASS) {
      sessionStorage.setItem(AUTH_KEY, '1');
      overlay.remove();
      document.documentElement.style.overflow = '';
    } else {
      error.style.display = 'block';
      input.value = '';
      input.focus();
    }
  }

  btn.addEventListener('click', tryAuth);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tryAuth();
  });

  // Auto-focus
  requestAnimationFrame(function () { input.focus(); });
})();
