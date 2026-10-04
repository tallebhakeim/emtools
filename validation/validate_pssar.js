/* ============================================================================
 *  Validation du moyennage psSAR 10 g de l'outil de dosimétrie (dosimetrie.html, impPsSAR)
 *
 *  Principe IEC/IEEE 62704-1 §6.2 : cube de masse exacte (voxels partiels au prorata),
 *  invalide si plus de 10 % de fond, repli sur cubes à face centrée.
 *  Tests :
 *   T1  SAR uniforme dans un bloc de tissu        → psSAR = SAR, masse = 10 g
 *   T2  SAR linéaire, grille uniforme, intérieur  → psSAR = SAR au centre (symétrie)
 *   T3  demi-espace, SAR = exp(2z/δ), surface     → cube à face centrée, valeur analytique
 *                                                    (δ/2L)(1 − e^{−2L/δ}), convergence O(h²)
 *   T4  grille NON uniforme, SAR uniforme         → masse 10 g, psSAR = SAR
 *   T5  cas CST 0,9 GHz (tête, dalle, tronc)      → ancien cube fixe vs nouveau, masse effective
 *  Le benchmark normatif « SAR Star » (Annexe B de 62704-1) reste à passer à réception du texte.
 *
 *  Exécution :  node validation/validate_pssar.js
 * ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'dosimetrie.html'), 'utf8');

function extract(name) {                       // extrait « function name(...) {...} » par appariement d'accolades
  const i = html.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('introuvable : ' + name);
  let k = html.indexOf('{', i), d = 0;
  for (let j = k; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) return html.slice(i, j + 1); }
}
const impPsSAR = eval('(' + extract('impPsSAR') + ')');
const impParseField = eval('(' + extract('impParseField') + ')');

// ancien algorithme (cube fixe de (2r+1)³ échantillons), conservé ici pour comparaison
function oldAvg(sar, tissue, nx, ny, nz, r) {
  const out = new Float64Array(sar.length), at = (a, b, c) => (a * ny + b) * nz + c;
  for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) for (let iz = 0; iz < nz; iz++) {
    if (!tissue[at(ix, iy, iz)]) continue; let num = 0, den = 0;
    for (let a = -r; a <= r; a++) { const jx = ix + a; if (jx < 0 || jx >= nx) continue;
      for (let b = -r; b <= r; b++) { const jy = iy + b; if (jy < 0 || jy >= ny) continue;
        for (let c = -r; c <= r; c++) { const jz = iz + c; if (jz < 0 || jz >= nz) continue;
          const id = at(jx, jy, jz); if (tissue[id]) { num += sar[id]; den++; } } } }
    out[at(ix, iy, iz)] = den > 0 ? num / den : 0;
  }
  return out;
}

let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails++; };
const range = (a, b, h) => { const o = []; for (let v = a; v <= b + 1e-9; v += h) o.push(+v.toFixed(9)); return o; };
const RHO = 1000, L10 = Math.cbrt(0.01 / RHO) * 1000;                  // côté du cube 10 g plein (mm)

function grid(xs, ys, zs, fsar, ftis) {
  const nx = xs.length, ny = ys.length, nz = zs.length, n = nx * ny * nz;
  const sar = new Float64Array(n), tis = new Uint8Array(n);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    const id = (i * ny + j) * nz + k; tis[id] = ftis(xs[i], ys[j], zs[k]) ? 1 : 0; sar[id] = tis[id] ? fsar(xs[i], ys[j], zs[k]) : 0; }
  return { F: { xs, ys, zs }, sar, tis, idx: (i, j, k) => (i * ny + j) * nz + k };
}

// ---- T1 : uniforme
{
  const xs = range(-30, 30, 4), g = grid(xs, xs, xs, () => 2.5, () => true);
  const r = impPsSAR(g.sar, g.tis, g.F, RHO);
  let e = 0; for (let i = 0; i < r.avg.length; i++) if (r.kind[i]) e = Math.max(e, Math.abs(r.avg[i] - 2.5));
  check(e < 1e-9 && r.stats.massRelErr < 1e-8 && r.stats.none <= 8,
    `T1 SAR uniforme : écart max ${e.toExponential(1)}, erreur de masse ${r.stats.massRelErr.toExponential(1)}, ${r.stats.centred} centrés / ${r.stats.face} face / ${r.stats.contained} contenus / ${r.stats.none} sommets du bloc non couverts`);
}
// ---- T2 : linéaire, point intérieur
{
  const xs = range(-30, 30, 3), g = grid(xs, xs, xs, (x, y, z) => 1 + 0.02 * x - 0.01 * y + 0.03 * z, () => true);
  const r = impPsSAR(g.sar, g.tis, g.F, RHO);
  const c = xs.indexOf(0), id = g.idx(c, c, c);
  check(Math.abs(r.avg[id] - 1) < 1e-9 && r.kind[id] === 1, `T2 SAR linéaire : psSAR au centre = ${r.avg[id].toFixed(12)} (exact 1)`);
}
// ---- T3 : demi-espace exponentiel. Référence semi-analytique à h donné : pour chaque profondeur de
//      centre d = (m+½)h, cube centré (côté ajusté, valide si fond ≤ 10 %) et cube à face centrée vers −z,
//      moyenne EXACTE de exp(2z/δ) ; on prend le max. L'algorithme doit converger vers elle en O(h²).
//      Borne supérieure absolue (tout cube valide) : D = L10·0.9^(2/3) de tissu sous un toit à 10 % d'air.
{
  const delta = 10, V = L10 ** 3;
  const mean = (a, b) => delta / (2 * (b - a)) * (Math.exp(2 * b / delta) - Math.exp(2 * a / delta));   // moyenne sur [a,b], b ≤ 0
  const Dsup = L10 * Math.pow(0.9, 2 / 3), sup = mean(-Dsup, 0);
  const refH = h => { let best = 0;
    for (let d = h / 2; d < 26; d += h) {
      best = Math.max(best, mean(-d - L10, -d));                                  // face −z
      if (d >= L10) best = Math.max(best, mean(-d, -d + L10));                    // face +z, sans air
      else { const Lp = Math.sqrt(V / d); if ((Lp - d) / Lp <= 0.1 + 1e-12) best = Math.max(best, mean(-d, 0)); }  // face +z, toit dans l'air
      if (L10 / 2 <= d) best = Math.max(best, mean(-d - L10 / 2, -d + L10 / 2));
      else { let lo = L10, hi = 2 * L10; for (let it = 0; it < 200; it++) { const m = (lo + hi) / 2; if (m * m * (d + m / 2) < V) lo = m; else hi = m; }
        if ((hi / 2 - d) / hi <= 0.1 + 1e-12) best = Math.max(best, mean(-d - hi / 2, 0)); } }
    return best; };
  const errs = [];
  for (const h of [2, 1, 0.5]) {
    const lat = range(-14 + h / 2, 14 - h / 2, h), zs = range(-26 + h / 2, 4 - h / 2, h);
    // le SAR porté par une cellule = moyenne exacte de exp(2z/δ) sur la cellule
    const g = grid(lat, lat, zs, (x, y, z) => mean(z - h / 2, z + h / 2), (x, y, z) => z < 0);
    const t0 = Date.now(), r = impPsSAR(g.sar, g.tis, g.F, RHO), dt = Date.now() - t0;
    let mx = 0; for (let i = 0; i < r.avg.length; i++) mx = Math.max(mx, r.avg[i]);
    const ref = refH(h); errs.push(Math.abs(mx - ref) / ref);
    console.log(`     h = ${h} mm : psSAR max ${mx.toFixed(7)}  réf. ${ref.toFixed(7)}  écart ${(errs.at(-1) * 100).toExponential(2)} %  (≤ sup ${sup.toFixed(5)} : ${mx <= sup * (1 + 1e-9)}) ${dt} ms`);
  }
  check(errs[2] < 1e-3 && errs[2] < errs[0], `T3 demi-espace exponentiel : écart à la référence ${(errs[0] * 100).toExponential(1)} % → ${(errs[2] * 100).toExponential(1)} %`);
}
// ---- T4 : grille non uniforme
{
  const xs = [], ys = range(-30, 30, 3); let v = -30; while (v <= 30) { xs.push(v); v += (Math.abs(v) < 10 ? 1.5 : 4); }
  const g = grid(xs, ys, ys, () => 1.7, () => true);
  const r = impPsSAR(g.sar, g.tis, g.F, RHO);
  let e = 0; for (let i = 0; i < r.avg.length; i++) if (r.kind[i]) e = Math.max(e, Math.abs(r.avg[i] - 1.7));
  check(e < 1e-9 && r.stats.massRelErr < 1e-8, `T4 grille non uniforme : écart ${e.toExponential(1)}, erreur de masse ${r.stats.massRelErr.toExponential(1)}`);
}
// ---- T5 : cas CST (tête, dalle, tronc à 0,9 GHz) : ancien cube fixe vs nouveau
{
  const dir = path.join(__dirname, '..', 'dosimetrie_cas_test', 'models_CST');
  const cases = { tete: ['efield_head_09GHz.txt', 'sar10g_head_09GHz.txt'], dalle: ['slab_efield_09GHz.txt', 'slab_sar10g_09GHz.txt'],
    tronc: ['trunk_efield_09GHz.txt', 'trunk_sar10g_09GHz.txt'] };
  console.log('     cas    | grille (mm) | ancien cube : masse  pic/CST |  nouveau : masse  pic/CST  r(Pearson) | centrés/face/contenus/non');
  for (const [nm, [fe, fs_]] of Object.entries(cases)) {
    const E = impParseField(fs.readFileSync(path.join(dir, fe), 'utf8')), S = impParseField(fs.readFileSync(path.join(dir, fs_), 'utf8'));
    // masque : SAR de réf. > 0 ; l'export « tronc » n'a de SAR que sur une coquille → masque = |E|² > 0, comparaison sur la coquille
    const n = E.g.length, tis = new Uint8Array(n), cmp = new Uint8Array(n); let nref = 0;
    for (let i = 0; i < n; i++) { cmp[i] = S.g[i] > 0 ? 1 : 0; nref += cmp[i]; }
    const shell = nm === 'tronc'; for (let i = 0; i < n; i++) tis[i] = shell ? (E.g[i] > 0 ? 1 : 0) : cmp[i];
    const e2 = E.g;                                                     // |E|² ; σ/ρ ajusté ensuite par moindres carrés
    const fit = a => { let xy = 0, xx = 0; for (let i = 0; i < n; i++) if (cmp[i]) { xy += a[i] * S.g[i]; xx += a[i] * a[i]; } return xy / xx; };
    const stat = a => { const k = fit(a); let pa = 0, pc = 0, m = 0, sa = 0, sc = 0, saa = 0, scc = 0, sac = 0;
      for (let i = 0; i < n; i++) if (cmp[i]) { const o = k * a[i], c = S.g[i]; pa = Math.max(pa, o); pc = Math.max(pc, c); m++; sa += o; sc += c; saa += o * o; scc += c * c; sac += o * c; }
      const r = (sac - sa * sc / m) / Math.sqrt((saa - sa * sa / m) * (scc - sc * sc / m)); return { ratio: pa / pc, r }; };
    const r10 = Math.max(1, Math.round(L10 / E.dx / 2)), oldMass = RHO * Math.pow((2 * r10 + 1) * E.dx / 1000, 3) * 1000;
    const so = stat(oldAvg(e2, shell ? cmp : tis, E.nx, E.ny, E.nz, r10));
    const t0 = Date.now(), nw = impPsSAR(e2, tis, E, RHO), sn = stat(nw.avg), dt = Date.now() - t0;
    console.log(`     ${nm.padEnd(6)} | ${E.dx.toFixed(1).padStart(5)}       | ${oldMass.toFixed(1).padStart(6)} g   ${so.ratio.toFixed(3)}   | ${nw.stats.targetG.toFixed(1)} g    ${sn.ratio.toFixed(3)}    ${sn.r.toFixed(4)}    | ${nw.stats.centred}/${nw.stats.face}/${nw.stats.contained}/${nw.stats.none} (${dt} ms)`);
    check(nw.stats.massRelErr < 1e-8, `T5 ${nm} : masse exacte (erreur ${nw.stats.massRelErr.toExponential(1)})`);
  }
}
console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUS LES TESTS PASSENT');
process.exit(fails ? 1 : 0);
