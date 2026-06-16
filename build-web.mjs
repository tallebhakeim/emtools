// build-web.mjs — assemble dist/ : tous les outils EMtools + assets, pour l'app Tauri (hors-ligne).
// Sans dépendance (Node >= 18). Lancé par `npm run build:web` (et automatiquement par `tauri build`).
import { rmSync, mkdirSync, readdirSync, cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'dist';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Portail de licence : injecté dans CHAQUE page. Inactif sur le web (sort si pas dans Tauri),
// actif dans l'app de bureau. (license-gate.js embarque la clé PUBLIQUE — aucun secret.)
const GATE_TAG = '<script src="license-gate.js"></script>';

// 1) toutes les pages (les 25 outils + index + catalogue), avec le portail injecté avant </head>
let pages = 0;
for (const f of readdirSync('.')) {
  if (!f.endsWith('.html')) continue;
  let html = readFileSync(f, 'utf8');
  if (!html.includes('license-gate.js')) {
    html = html.includes('</head>') ? html.replace('</head>', '  ' + GATE_TAG + '\n</head>') : GATE_TAG + html;
  }
  writeFileSync(`${OUT}/${f}`, html);
  pages++;
}

// 2) assets nécessaires au fonctionnement hors-ligne
//    - vendor/ : Chart.js local (dosimetrie.html)
//    - xcat_demo_thorax.json : cas test chargé par voxel.html (fetch)
//    - LICENSE : pour l'« À propos »
for (const a of ['vendor', 'catalogue-shots', 'xcat_demo_thorax.json', 'LICENSE', 'EMtools-Catalogue.pdf', 'license-gate.js']) {
  if (existsSync(a)) cpSync(a, `${OUT}/${a}`, { recursive: true });
}

// 3) cas de référence CST (tête/dalle/tronc) embarqués → onglet « CST comparaison » en 1 clic, hors-ligne
if (existsSync('dosimetrie_cas_test/models_CST'))
  cpSync('dosimetrie_cas_test/models_CST', `${OUT}/cst-cases`, { recursive: true });

console.log(`✓ dist/ prêt : ${pages} pages + assets (vendor/, cas test voxel, cst-cases/, LICENSE)`);
