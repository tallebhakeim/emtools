# Note de cadrage — Outil de dosimétrie électromagnétique pédagogique

**Proposition de contribution au groupe de travail Dosimétrie de l'ANSES**

| | |
|---|---|
| **Auteur** | Hakeim Talleb, expert mandaté ANSES (groupe de travail Dosimétrie, depuis 2019 — 2ᵉ mandat) |
| **Maintenance** | Hakeim Talleb (auteur) |
| **Déclaration d'intérêts** | Voir DPI déposée auprès de l'ANSES |
| **Date** | Juin 2026 |
| **Version de l'outil** | Application web « Dosimétrie EM — TMM + Cole-Cole (IT'IS V5.0) » |

---

## 1. Objet

Cette note présente un outil web pédagogique d'estimation de l'absorption électromagnétique
dans les tissus biologiques, proposé comme **contribution scientifique** au groupe de travail.

L'outil poursuit un double objectif :

1. **Grand public / vulgarisation** — donner un **ordre de grandeur** du Débit d'Absorption
   Spécifique (DAS / SAR) et de l'échauffement associé, pour des configurations d'exposition
   courantes. Il s'agit d'aider à se forger des **notions sur les niveaux** d'exposition, **sans
   prétendre remplacer** un code numérique de référence (FDTD, FEM).
2. **Recherche** — donner un **accès structuré et tracé** aux données diélectriques de la
   littérature (permittivité, conductivité, dispersions Cole-Cole, profondeur de pénétration),
   directement exploitables et comparées entre sources.

## 2. Méthodes et contenu scientifique

| Module | Méthode | Source / référence |
|---|---|---|
| Absorption EM | Méthode des matrices de transfert (TMM) sur empilements de couches planes homogènes | Formalisme analytique classique |
| Propriétés diélectriques | Modèle de dispersion **Cole-Cole 4 pôles** (~110 tissus) | **IT'IS Database V5.0**, comparaison **IFAC** (Gabriel et al.) |
| Sources d'exposition | Onde plane (champ lointain), champ proche (dipôle, boucle NFC/RFID/IRM), limites **ICNIRP 1998/2020** | ICNIRP |
| Échauffement | Équation de bio-chaleur de **Pennes** : modèle 0D (perfusion) et modèle 1D multicouche (conduction + perfusion, condition de convection peau↔air en surface, température de cœur en profondeur) | Propriétés thermiques **IT'IS Thermal Database** par tissu |

**Traçabilité.** Chaque grandeur diélectrique est rattachée à sa source (IT'IS / IFAC) et
affichée avec ses écarts inter-sources. Les seuils thermiques affichés sont alignés sur
**ICNIRP 2020** (élévation locale de référence : 1 °C ; seuil local tête/tronc : 2 °C ;
seuil local membres : 5 °C).

## 3. Périmètre et limites (assumés explicitement)

- Géométrie **planaire infinie** : ne tient pas compte de la courbure du corps ni des
  hétérogénéités locales 3D.
- Couches **homogènes**. L'estimation vise l'**ordre de grandeur**, pas la valeur certifiée.
- **Ne remplace pas** une simulation volumique (FDTD, FEM) ni une mesure sur fantôme normalisé.
- **N'établit aucune conformité réglementaire** : l'outil est pédagogique et indicatif.

Ces limites sont affichées directement dans l'interface (bandeau d'avertissement permanent).

## 4. Mise à disposition proposée

Pour s'aligner sur les exigences d'**indépendance, transparence et traçabilité** d'une agence
publique :

1. **Accès libre par URL** — application web, sans installation, sans authentification ni
   restriction commerciale (aucun mécanisme de licence).
2. **Code ouvert et auditable** — dépôt sous licence ouverte (p. ex. EUPL ou CC-BY), permettant
   à l'ANSES et aux chercheurs de vérifier les formules et les données.
3. **Maintenance** assurée par l'auteur (Hakeim Talleb) — outil non propriétaire, librement
   auditable et réutilisable.
4. **Validation** — fourniture de 2 à 3 cas de comparaison avec des résultats FDTD/FEM publiés,
   pour situer la précision de l'estimation.

## 5. Prochaines étapes

- [x] Consolidation de la partie thermique (propriétés thermiques par tissu, conditions aux
      limites convectives) — **réalisée**.
- [x] Validation du moteur de calcul contre la solution analytique exacte (réflexion, SAR,
      profondeur de pénétration, conservation de l'énergie) — **écart < 1,4 %**, voir
      `VALIDATION.md`. Deux erreurs de physique identifiées et corrigées à cette occasion.
- [ ] Choix et application de la licence ouverte.
- [ ] Note méthodologique détaillée (équations, hypothèses, bibliographie) en annexe.
- [ ] Présentation au groupe de travail.

---

*Outil proposé à titre de contribution d'expertise. Toute réutilisation des données diélectriques
reste soumise aux conditions des bases sources (IT'IS, IFAC).*
