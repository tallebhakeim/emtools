// build-web.mjs — assemble dist/ : tous les outils EMtools + assets, pour l'app Tauri (hors-ligne).
// Sans dépendance (Node >= 18). Lancé par `npm run build:web` (et automatiquement par `tauri build`).
import { rmSync, mkdirSync, readdirSync, cpSync, existsSync } from 'node:fs';

const OUT = 'dist';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1) toutes les pages (les 25 outils + index + catalogue)
let pages = 0;
for (const f of readdirSync('.')) {
  if (f.endsWith('.html')) { cpSync(f, `${OUT}/${f}`); pages++; }
}

// 2) assets nécessaires au fonctionnement hors-ligne
//    - vendor/ : Chart.js local (dosimetrie.html)
//    - xcat_demo_thorax.json : cas test chargé par voxel.html (fetch)
//    - LICENSE : pour l'« À propos »
for (const a of ['vendor', 'xcat_demo_thorax.json', 'LICENSE', 'EMtools-Catalogue.pdf']) {
  if (existsSync(a)) cpSync(a, `${OUT}/${a}`, { recursive: true });
}

console.log(`✓ dist/ prêt : ${pages} pages + assets (vendor/, cas test voxel, LICENSE)`);
