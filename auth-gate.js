/**
 * auth-gate.js — Simple password gate for VUILD Project Hub
 * sessionStorage で認証状態を保持（タブを閉じるまで有効）
 * スタイルは自己完結（style.css に依存しない）
 */
(function () {
  var PASS = 'vuild';
  var AUTH_KEY = 'vuild_hub_authed';

  if (sessionStorage.getItem(AUTH_KEY) === '1') return;

  // ページ全体を即座に隠す
  document.body.style.visibility = 'hidden';
  document.body.style.overflow = 'hidden';

  var overlay = document.createElement('div');
  overlay.id = 'auth-gate';

  // インラインスタイルで確実に表示
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#fafaf8;visibility:visible;';

  overlay.innerHTML =
    '<div style="text-align:center;max-width:320px;width:100%;padding:0 24px">' +
      '<div style="font-size:32px;font-weight:700;letter-spacing:.15em;color:#111;margin-bottom:32px">VUILD</div>' +
      '<p style="font-size:13px;color:#666;margin-bottom:16px">パスワードを入力してください</p>' +
      '<input type="password" id="auth-input" placeholder="Password" autocomplete="off" style="width:100%;padding:12px 16px;font-size:15px;border:1px solid #e8e6e1;border-radius:6px;outline:none;background:#fff;box-sizing:border-box;font-family:inherit" />' +
      '<button id="auth-btn" style="width:100%;margin-top:12px;padding:12px;font-size:14px;font-weight:600;border:none;border-radius:6px;background:#111;color:#fff;cursor:pointer;font-family:inherit">Enter</button>' +
      '<p id="auth-error" style="display:none;margin-top:12px;font-size:12px;color:#c0392b">パスワードが違います</p>' +
    '</div>';

  document.body.prepend(overlay);

  var input = document.getElementById('auth-input');
  var btn = document.getElementById('auth-btn');
  var error = document.getElementById('auth-error');

  function tryAuth() {
    if (input.value === PASS) {
      sessionStorage.setItem(AUTH_KEY, '1');
      overlay.remove();
      document.body.style.visibility = '';
      document.body.style.overflow = '';
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

  requestAnimationFrame(function () { input.focus(); });
})();
