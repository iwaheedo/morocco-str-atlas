// Passphrase gate for the public copy. The market data and listings are not in the page: they sit
// in vault.json, encrypted with AES-256-GCM under a key derived from the passphrase (PBKDF2-SHA256).
// Nothing is sent anywhere: the passphrase is checked by trying to decrypt, in this browser only.
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const KEY_STORE = 'str-site-key';
  const gate = $('#gate'), form = $('#gate-form'), input = $('#gate-pass'), msg = $('#gate-msg'), go = $('#gate-go');
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const toB64 = u8 => btoa(String.fromCharCode.apply(null, u8));
  let vault = null;

  async function deriveKey(pass) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes(vault.salt), iterations: vault.iter }, base, 256);
    return new Uint8Array(bits);
  }
  // Throws if the key is wrong: AES-GCM authenticates what it decrypts.
  async function unlock(raw) {
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const out = {};
    for (const name of ['data', 'listings']) {
      const f = vault.files[name];
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(f.iv) }, key, bytes(f.ct));
      out[name] = JSON.parse(new TextDecoder().decode(plain));
    }
    return out;
  }
  function start(o) {
    window.STR_DATA = o.data;
    window.STR_LISTINGS = o.listings;
    document.documentElement.classList.remove('locked');
    gate.hidden = true;
    const app = document.createElement('script');
    app.src = 'app.js';
    document.body.appendChild(app);
    const lock = document.createElement('button');
    lock.type = 'button'; lock.className = 'more-btn'; lock.textContent = 'Lock this page on this device';
    lock.addEventListener('click', () => { try { localStorage.removeItem(KEY_STORE); } catch (e) {} location.reload(); });
    const foot = $('footer .wrap'); if (foot) foot.appendChild(lock);
  }
  const say = t => { msg.textContent = t; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!vault) { say('Still loading. Try again in a moment.'); return; }
    const pass = input.value.replace(/\s+/g, '').toLowerCase();
    if (!pass) return;
    go.disabled = true; say('Checking…');
    try {
      const raw = await deriveKey(pass);
      const opened = await unlock(raw);
      if ($('#gate-remember').checked) { try { localStorage.setItem(KEY_STORE, toB64(raw)); } catch (err) {} }
      input.value = ''; say('');
      start(opened);
    } catch (err) {
      say('That passphrase did not open the page. Check it and try again.');
      go.disabled = false; input.select();
    }
  });

  if (!window.crypto || !crypto.subtle) { say('This browser cannot open the page: it needs a current browser and an https address.'); return; }
  fetch('vault.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(async v => {
    vault = v;
    let saved = null;
    try { saved = localStorage.getItem(KEY_STORE); } catch (e) {}
    if (saved) {
      try { start(await unlock(bytes(saved))); return; }
      catch (e) { try { localStorage.removeItem(KEY_STORE); } catch (err) {} } // passphrase was changed since
    }
    input.focus();
  }).catch(() => say('The data file could not be loaded. Reload the page to try again.'));
})();
