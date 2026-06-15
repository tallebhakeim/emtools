# EMtools — Application de bureau (Tauri)

Empaqueter les 25 outils EMtools en une **application native installable**,
fonctionnant **100 % hors-ligne** : `EMtools.dmg` (macOS) et
`EMtools_…-setup.exe` / `.msi` (Windows). Taille ~5–10 Mo.

Le projet est déjà préparé :
- `vendor/chart.umd.js` — Chart.js en local (plus de CDN → marche hors-ligne).
- `build-web.mjs` — assemble `dist/` (toutes les pages + assets).
- `package.json` — script `build:web` + CLI Tauri.

Il reste à **initialiser Tauri** (une fois) puis à **compiler** sur chaque OS.

---

## 1. Prérequis (une seule fois, par machine)

**Commun :** [Node.js](https://nodejs.org) (≥ 18) et [Rust](https://rustup.rs) :
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**macOS :** outils de compilation Xcode :
```bash
xcode-select --install
```

**Windows (dans Parallels) :**
- Rust : installeur depuis https://rustup.rs (`rustup-init.exe`).
- **Microsoft C++ Build Tools** (Visual Studio Build Tools, « Desktop development with C++ »).
- **WebView2** : déjà présent sur Windows 10/11 à jour (sinon, runtime gratuit Microsoft).

---

## 2. Installer les dépendances du projet (une fois, dans le dossier du dépôt)

```bash
npm install
```

## 3. Initialiser Tauri (une seule fois — crée `src-tauri/` + icônes par défaut)

```bash
npx tauri init
```
Réponds (peu importe si quelques questions diffèrent, on corrige la config juste après) :
- **App name** : `EMtools`
- **Window title** : `EMtools`
- **Web assets** (relative to `src-tauri`) : `../dist`
- **dev server url** : *(laisser vide)*
- **frontend dev command** : *(laisser vide)*
- **frontend build command** : `npm run build:web`

Puis **remplace le contenu de `src-tauri/tauri.conf.json`** par ceci :

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "EMtools",
  "version": "1.0.0",
  "identifier": "com.novasensexpertise.emtools",
  "build": {
    "frontendDist": "../dist",
    "beforeBuildCommand": "npm run build:web"
  },
  "app": {
    "windows": [
      { "title": "EMtools", "width": 1280, "height": 860, "resizable": true }
    ],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "category": "Education",
    "copyright": "© 2026 NovaSens Expertise — Hakeim Talleb",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```
> `csp: null` autorise les `fetch` locaux (cas test voxel). `targets: "all"` produit
> `.dmg`/`.app` sur Mac et `.exe`(NSIS)/`.msi` sur Windows.

## 4. (Option) Icône personnalisée

Avec un logo carré ≥ 512×512 px (PNG) :
```bash
npx tauri icon chemin/vers/logo.png
```
Ça remplit `src-tauri/icons/` (toutes tailles + `.icns` + `.ico`). Sinon, l'icône
Tauri par défaut est utilisée.

## 5. Compiler

```bash
npx tauri build
```
(lance automatiquement `npm run build:web` qui régénère `dist/`, puis empaquète).

Pour tester sans empaqueter (fenêtre de dev) : `npm run build:web && npx tauri dev`.

---

## 6. Où sont les fichiers produits

- **macOS** : `src-tauri/target/release/bundle/dmg/EMtools_1.0.0_aarch64.dmg`
  (et `…/macos/EMtools.app`).
- **Windows** : `src-tauri\target\release\bundle\nsis\EMtools_1.0.0_x64-setup.exe`
  (et `…\msi\EMtools_1.0.0_x64_en-US.msi`).

> **Deux OS = deux compilations.** Tauri compile pour l'OS courant. Pour le `.exe`/`.msi`,
> lance les étapes 1→5 **dans Windows** (ta VM Parallels). Pour le `.dmg`, **sur macOS**.

---

## 7. Signature (plus tard, si distribution large)

Non signé pour l'instant :
- **macOS** : au 1er lancement, clic droit sur l'app → **Ouvrir** (contourne « développeur non identifié »). Signature/notarisation propre = compte **Apple Developer (~99 $/an)**.
- **Windows** : SmartScreen peut avertir → « Informations complémentaires » → « Exécuter quand même ». Signature propre = certificat de **code signing**.

---

## Licence

EMtools — © 2026 **NovaSens Expertise**, tous droits réservés (voir `LICENSE`).
L'application embarque les mêmes outils que le site ; sa **distribution** suit la
même règle : libre pour la démo/évaluation, **sous licence** (gratuite ou
commerciale, via NovaSens Expertise) pour tout déploiement.
Contact : **contact@novasensexpertise.com**.
