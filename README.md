# Hakeim Talleb — Outils de simulation

Site statique regroupant des outils libres de simulation et de modélisation.
Site **indépendant** (sans lien avec NovaSens Expertise), destiné à héberger
plusieurs outils au fil du temps.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil — liste des outils (extensible). |
| `dosimetrie.html` | **Outil de dosimétrie électromagnétique** (HTML/JS autonome). |
| `VALIDATION.md` / `validation/validate_tmm.js` | Rapport + script de validation du moteur. |
| `NOTE_CADRAGE_ANSES.md` / `.docx` | Note de cadrage (contexte ANSES). |
| `VALIDATION.docx` | Rapport de validation (version Word). |
| `LICENSE` | Licence MIT (code). |

Tout est **statique** : aucune dépendance serveur, aucune étape de build. Il suffit
de servir le dossier, ou d'ouvrir `index.html` localement.

## Ajouter un outil plus tard

1. Déposer le nouveau fichier (`mon-outil.html`).
2. Ajouter une carte dans `index.html` (dupliquer le bloc `<a class="card live" …>`).

## Déploiement

Voir [`DEPLOY.md`](DEPLOY.md).

## Licence

Code sous licence [MIT](LICENSE) (auteur : Hakeim Talleb). Les données tissulaires
(IT'IS, IFAC/Gabriel) restent soumises aux conditions de leurs sources.
