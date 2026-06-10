# Validation du moteur de calcul — Outil de dosimétrie EM

**Auteur : Hakeim Talleb — Juin 2026**
Outil : `dosimetrie.html` (moteur TMM + Cole-Cole, IT'IS V5.0)

---

## 1. Démarche

Le moteur électromagnétique de l'outil (méthode des matrices de transfert, TMM)
est confronté à la **solution analytique exacte** du problème d'onde plane en
incidence normale sur des milieux à pertes (réflexion de Fresnel + propagation
en milieu dissipatif).

Pour une **monocouche semi-infinie**, ces grandeurs ont une forme close, sans
ambiguïté de modèle :

| Grandeur | Forme analytique |
|---|---|
| Réflexion | Γ = (η₁ − η₀)/(η₁ + η₀), avec η₁ = η₀/√ε̂ |
| Champ de surface | E_surf = E_inc·(1 + Γ) |
| SAR de surface | SAR = σ_eff·\|E_surf\|² / ρ (champ RMS) |
| Profondeur de pénétration | δ = 1/α, α = (ω/c)·\|Im √ε̂\| |
| Puissance absorbée | P_abs = (1 − \|Γ\|²)·S_inc |

C'est précisément le **socle analytique contre lequel les codes FDTD/FEM sont
eux-mêmes validés** pour la géométrie planaire. Reproduire ces grandeurs garantit
que la physique de propagation, de réflexion et de dissipation est correcte.

La permittivité complexe ε̂ provient du modèle Cole-Cole IT'IS V5.0 de l'outil
(matériau identique des deux côtés : on valide la **physique d'onde**, pas la base
de données diélectrique).

## 2. Résultats — monocouche semi-infinie

Onde plane, incidence normale, E_inc = 19,41 V/m rms (S_inc ≈ 1 W/m²).
Critère de réussite : écart < 2 %.

| Tissu | f | grandeur | outil | exact | écart |
|---|---|---|---|---|---|
| **Muscle** | 2,45 GHz | \|R\| | 0,7626 | 0,7625 | **0,02 %** |
| | | SAR surface (W/kg) | 0,0343 | 0,0344 | **0,12 %** |
| | | δ pénétration (mm) | 22,37 | 22,33 | **0,18 %** |
| | | bilan énergie (W/m²) | 0,4244 | 0,4187 | **1,38 %** |
| **Skin** | 900 MHz | \|R\| | 0,7450 | 0,7449 | **0,02 %** |
| | | SAR surface (W/kg) | 0,0199 | 0,0200 | **0,12 %** |
| | | δ pénétration (mm) | 40,40 | 40,23 | **0,42 %** |
| **Brain (grey)** | 1,8 GHz | \|R\| | 0,7586 | 0,7584 | **0,02 %** |
| | | SAR surface (W/kg) | 0,0298 | 0,0298 | **0,12 %** |
| | | δ pénétration (mm) | 27,38 | 27,26 | **0,45 %** |
| **Fat** | 2,45 GHz | \|R\| | 0,5386 | 0,5384 | **0,05 %** |
| | | SAR surface (W/kg) | 0,0238 | 0,0238 | **0,11 %** |
| | | δ pénétration (mm) | 65,44 | 65,44 | **0,01 %** |

**Écart maximal : 1,38 %** (résidu dominé par la discrétisation spatiale du
profil, 600 points). Réflexion, champ, SAR et profondeur de pénétration sont
reproduits à mieux que 0,5 %.

## 3. Cohérence multicouche & conservation de l'énergie

Empilement tête réaliste (peau 1,5 / graisse 2 / os cortical 6 / cerveau 40 mm)
à 2,45 GHz : la réflexion globale (TMM complet) donne \|R\| = 0,62, et la puissance
absorbée intégrée sur la profondeur,

∫ SAR(z)·ρ(z) dz = 0,6129 W/m²   vs   (1 − \|R\|²)·S_inc = 0,6115 W/m²,

soit **0,23 % d'écart** : l'énergie est conservée (le rayonnement non réfléchi est
intégralement absorbé), validation indirecte du profil SAR(z) multicouche complet.

## 4. Cohérence avec la littérature (profondeur de pénétration)

Les profondeurs de pénétration calculées (champ, 1/e de \|E\|) sont cohérentes avec
les valeurs publiées issues des bases diélectriques de référence (Gabriel ; IT'IS) :
muscle ≈ 22 mm et cerveau ≈ 27 mm aux fréquences GSM/UMTS/Wi-Fi. On rappelle que les
valeurs de la littérature couvrent une plage selon la **définition** retenue
(profondeur en champ, δ = 1/α, ou en puissance, δ_p = 1/2α, soit moitié moindre) et
selon la teneur en eau du tissu ; l'outil affiche la définition « champ ».

## 5. Anomalies identifiées et corrigées au cours de la validation

La validation a mis au jour deux erreurs de physique dans le moteur initial,
depuis corrigées :

1. **Coefficient de réflexion** — l'impédance d'onde était calculée ωμ₀/(jk) au lieu
   de ωμ₀/k (facteur −j parasite), conduisant à \|R\| ≈ 0 : la réflexion air↔tissu
   (~76 % en amplitude pour les tissus mous) était ignorée, surestimant le champ
   pénétrant. **Correctif** : reformulation rigoureuse de la TMM en amplitudes
   aller/retour (A, B) par couche ; le profil interne est désormais la solution
   exacte (ondes stationnaires comprises), au lieu d'une approximation « onde
   progressive seule ».
2. **Conductivité du SAR** — le SAR utilisait la conductivité ionique statique du
   tissu au lieu de la conductivité **effective à la fréquence** σ_eff = ωε₀ε''
   (pertes ohmiques + diélectriques), sous-estimant l'absorption aux fréquences GHz.
   **Correctif** : SAR = σ_eff·\|E\|²/ρ, cohérent avec les pertes utilisées dans la
   propagation (d'où la conservation de l'énergie, § 3).

Ces deux erreurs jouaient en sens opposés, masquant partiellement le problème sur
les valeurs absolues de SAR.

## 6. Limites (rappel)

La validation porte sur la **physique planaire 1D**. L'outil reste une
approximation : géométrie de couches planes infinies, pas de courbure ni
d'hétérogénéité 3D. Pour des géométries réalistes (tête, tronc) ou une
certification réglementaire, une simulation FDTD/FEM volumique ou une mesure sur
fantôme normalisé demeurent nécessaires. L'outil vise l'**ordre de grandeur** et la
compréhension physique.

## 7. Reproductibilité

```bash
node validation/validate_tmm.js
```

Le script lit `dosimetrie.html`, en extrait le moteur, exécute les cas et compare à
la référence analytique implémentée indépendamment. Aucune dépendance externe.

---

### Références

- C. Gabriel, *Compilation of the dielectric properties of body tissues at RF and
  microwave frequencies*, 1996.
- IT'IS Foundation, *Tissue Properties Database V5.0* (diélectrique et thermique).
- ICNIRP, *Guidelines for limiting exposure to electromagnetic fields (100 kHz –
  300 GHz)*, 2020.
- Méthode des matrices de transfert / analogie ligne de transmission — validation
  standard des codes FDTD aux interfaces diélectriques planes.
