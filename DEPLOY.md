# Déploiement

Le site est **100 % statique** (HTML/JS/CSS, pas de build). N'importe quel
hébergement de fichiers statiques convient. Trois voies, de la plus simple à la
plus « pro ».

---

## Option A — Netlify Drop (la plus rapide, sans git)

1. Aller sur https://app.netlify.com/drop
2. Glisser-déposer **le dossier** `talleb-outils` entier.
3. Le site est en ligne en quelques secondes sur une URL `…netlify.app`.
4. Pour ton domaine loué : *Site settings → Domain management → Add custom domain*,
   puis suivre les instructions DNS (CNAME / A record chez ton registrar).

> Idéal pour une première mise en ligne immédiate. Pour les mises à jour, on
> reglisse le dossier (ou on connecte un dépôt git, cf. option B).

## Option B — GitHub + Vercel (ou Netlify) connectés

1. Créer un dépôt GitHub **à ton compte** (ex. `outils` ou `talleb-outils`), public ou privé.
2. Pousser ce dossier :
   ```bash
   cd talleb-outils
   git remote add origin https://github.com/<ton-compte>/<ton-repo>.git
   git branch -M main
   git push -u origin main
   ```
   *(Le dépôt git est déjà initialisé avec un premier commit.)*
3. Sur https://vercel.com (ou Netlify) : *New Project → Import* le dépôt.
   Aucune config (framework = « Other », pas de build). Déploiement automatique
   à chaque `git push`.
4. *Settings → Domains* → ajouter ton domaine loué et suivre les DNS.

## Option C — GitHub Pages

1. Pousser sur GitHub (cf. option B, étapes 1-2).
2. *Settings → Pages → Source = main / root.*
3. Le site est sur `https://<ton-compte>.github.io/<ton-repo>/`.
4. Domaine perso : *Settings → Pages → Custom domain* + DNS (un fichier `CNAME`
   sera créé).

---

## Pointer ton domaine

Quel que soit l'hébergeur, chez ton **registrar** (là où tu loues le domaine) :
- un **CNAME** `www` → l'hôte fourni (ex. `cname.vercel-dns.com` / `<site>.netlify.app`), et/ou
- un **A record** `@` → l'IP fournie par l'hébergeur.

L'hébergeur fournit les valeurs exactes et gère le certificat HTTPS automatiquement.

## Mise à jour du contenu

- Option A : reglisser le dossier sur Netlify Drop.
- Options B/C : `git add -A && git commit -m "maj" && git push` → déploiement auto.
