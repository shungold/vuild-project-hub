/**
 * auth-gate.js — VUILD Project Hub パスワードゲート
 * <head> 内で読み込むこと。body を非表示にし、認証後に表示する。
 */
(function () {
  var PASS = 'vuild2026';
  var AUTH_KEY = 'vuild_hub_authed';

  // 認証済みならスキップ
  if (sessionStorage.getItem(AUTH_KEY) === '1') return;

  // body が描画される前に非表示にする
  var blocker = document.createElement('style');
  blocker.id = 'auth-blocker';
  blocker.textContent = 'body{display:none!important}';
  document.head.appendChild(blocker);

  document.addEventListener('DOMContentLoaded', function () {
    // オーバーレイ生成
    var gate = document.createElement('div');
    gate.id = 'auth-gate';
    gate.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;' +
      'justify-content:center;background:#fafaf8;font-family:Inter,Noto Sans JP,sans-serif;';

    gate.innerHTML =
      '<div style="text-align:center;max-width:320px;width:100%;padding:0 24px">' +
        '<div style="font-size:32px;font-weight:700;letter-spacing:.15em;color:#111;margin-bottom:32px">VUILD</div>' +
        '<p style="font-size:13px;color:#666;margin-bottom:16px">\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044</p>' +
        '<input type="password" id="auth-input" placeholder="Password" autocomplete="off" ' +
          'style="width:100%;padding:12px 16px;font-size:15px;border:1px solid #e8e6e1;border-radius:6px;outline:none;background:#fff;box-sizing:border-box;font-family:inherit" />' +
        '<button id="auth-btn" ' +
          'style="width:100%;margin-top:12px;padding:12px;font-size:14px;font-weight:600;border:none;border-radius:6px;background:#111;color:#fff;cursor:pointer;font-family:inherit">Enter</button>' +
        '<p id="auth-error" style="display:none;margin-top:12px;font-size:12px;color:#c0392b">\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u9055\u3044\u307e\u3059</p>' +
      '</div>';

    // body を一旦表示してオーバーレイを載せる
    blocker.textContent = 'body>*:not(#auth-gate){display:none!important}';
    document.body.prepend(gate);

    var input = document.getElementById('auth-input');
    var btn = document.getElementById('auth-btn');
    var error = document.getElementById('auth-error');

    function tryAuth() {
      if (input.value === PASS) {
        sessionStorage.setItem(AUTH_KEY, '1');
        gate.remove();
        blocker.remove();
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
    input.focus();
  });
})();
