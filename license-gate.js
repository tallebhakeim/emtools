/* EMtools — portail de licence (app de bureau uniquement).
 *
 * N'EST ACTIF QUE dans l'app installée (Tauri). Sur le site web emtools.app il ne fait RIEN
 * (c'est le middleware Vercel + les codes d'accès qui gèrent le web).
 *
 * Vérifie une clé de licence signée (ECDSA P-256 / SHA-256) : titulaire + expiration + modules.
 * La clé privée correspondante reste chez l'éditeur (NovaSens Expertise). Seule la clé PUBLIQUE
 * est ici — elle ne permet que de vérifier, pas de forger une licence.
 */
(function () {
  'use strict';

  // Actif seulement dans l'app de bureau (Tauri v1/v2). Sur le web : on sort immédiatement.
  var isApp = !!(window.__TAURI_INTERNALS__ || window.__TAURI__ || window.__TAURI_METADATA__);
  if (!isApp) return;

  var PUBLIC_JWK = { kty: 'EC', crv: 'P-256', x: 'It63atlhHKBbZJugd9wH78DCaTm3EEjtCcZfIKV-c50', y: 'p1T9UhaQnzf1st0mbjVLoU9dDucg5bWYHHsjdru1pOM' };
  var STORE = 'emtools.license';
  var ALWAYS_OK = { index: 1, catalogue: 1 }; // l'accueil et le catalogue restent visibles

  function slug() {
    var p = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
    return p || 'index';
  }
  function b64urlToBuf(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }
  async function verify(license) {
    try {
      var raw = String(license).trim().replace(/^EMTOOLS-/i, '');
      var parts = raw.split('.');
      if (parts.length !== 2) return null;
      var payload = b64urlToBuf(parts[0]);
      var sig = b64urlToBuf(parts[1]);
      var key = await crypto.subtle.importKey('jwk', PUBLIC_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      var ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, payload);
      if (!ok) return null;
      return JSON.parse(new TextDecoder().decode(payload)); // { h: titulaire, exp: 'AAAA-MM-JJ'|null, m: '*'|[slugs] }
    } catch (e) { return null; }
  }
  function isExpired(d) {
    if (!d.exp) return false;
    var end = new Date(d.exp + 'T23:59:59Z').getTime();
    return isNaN(end) ? false : Date.now() > end;
  }
  function moduleAllowed(d) {
    if (ALWAYS_OK[slug()]) return true;
    if (!d.m || d.m === '*') return true;
    if (Array.isArray(d.m)) return d.m.indexOf(slug()) >= 0 || d.m.indexOf('*') >= 0;
    return false;
  }

  // ---- Interface (overlay plein écran, bloquant) ----
  function overlay(html) {
    var o = document.getElementById('emtools-lic');
    if (!o) {
      o = document.createElement('div');
      o.id = 'emtools-lic';
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0b1020;color:#e8eefc;' +
        'display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;';
      document.documentElement.appendChild(o);
    }
    o.innerHTML = '<div style="max-width:560px;width:100%;background:#121a33;border:1px solid #2a3a66;border-radius:16px;padding:32px 28px;box-shadow:0 20px 60px rgba(0,0,0,.5)">' + html + '</div>';
    return o;
  }
  function askKey(message, prefill) {
    var o = overlay(
      '<div style="font-size:22px;font-weight:700;margin-bottom:6px">EMtools</div>' +
      '<div style="opacity:.75;font-size:13px;margin-bottom:18px">Logiciel sous licence · NovaSens Expertise</div>' +
      (message ? '<div style="background:#3a1320;border:1px solid #7a2540;color:#ffd7df;padding:10px 12px;border-radius:10px;font-size:13px;margin-bottom:14px">' + message + '</div>' : '') +
      '<label style="font-size:13px;opacity:.85">Clé de licence</label>' +
      '<textarea id="emtools-lic-in" rows="4" style="width:100%;margin:8px 0 4px;padding:12px;border-radius:10px;border:1px solid #2a3a66;background:#0b1020;color:#e8eefc;font-family:ui-monospace,monospace;font-size:12px;resize:vertical" placeholder="EMTOOLS-…">' + (prefill || '') + '</textarea>' +
      '<button id="emtools-lic-go" style="width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;background:#2f7cff;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Activer</button>' +
      '<div style="margin-top:16px;font-size:12px;opacity:.6;line-height:1.5">Pas de clé ? Contactez <b>contact@novasensexpertise.com</b> pour obtenir une licence.</div>'
    );
    var input = o.querySelector('#emtools-lic-in');
    var btn = o.querySelector('#emtools-lic-go');
    input.focus();
    btn.onclick = async function () {
      btn.disabled = true; btn.textContent = 'Vérification…';
      var val = input.value.trim();
      var d = await verify(val);
      if (!d) { btn.disabled = false; btn.textContent = 'Activer'; return askKey('Clé invalide ou illisible. Vérifiez le copier-coller (la clé entière, sans espace ajouté).', val); }
      if (isExpired(d)) { btn.disabled = false; btn.textContent = 'Activer'; return askKey('Cette licence a expiré le ' + d.exp + '. Demandez un renouvellement.', val); }
      localStorage.setItem(STORE, val);
      remove();
      gateModule(d); // si le module courant n'est pas inclus, on le signalera
    };
  }
  function blockedModule(d) {
    overlay(
      '<div style="font-size:20px;font-weight:700;margin-bottom:10px">Module non inclus</div>' +
      '<div style="opacity:.85;font-size:14px;line-height:1.6">Votre licence (' + (d.h || 'titulaire') + ') ne couvre pas ce module. ' +
      'Modules autorisés : <b>' + (Array.isArray(d.m) ? d.m.join(', ') : 'tous') + '</b>.</div>' +
      '<button onclick="location.href=\'index.html\'" style="width:100%;margin-top:18px;padding:12px;border:0;border-radius:10px;background:#2f7cff;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Retour à l\'accueil</button>'
    );
  }
  function remove() { var o = document.getElementById('emtools-lic'); if (o) o.remove(); }
  function gateModule(d) { if (!moduleAllowed(d)) blockedModule(d); }

  async function boot() {
    var stored = localStorage.getItem(STORE);
    if (stored) {
      var d = await verify(stored);
      if (d && !isExpired(d)) { gateModule(d); return; }       // OK (ou module bloqué)
      if (d && isExpired(d)) return askKey('Votre licence a expiré le ' + d.exp + '. Saisissez une clé renouvelée.', '');
    }
    askKey('', ''); // première activation
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
