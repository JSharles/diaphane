---
name: Diaphane
description: La tech, rendue lisible. Deux matières — Encre pour l'espace de travail du dev, Lait pour la lecture client — et une paroi entre les deux.
version: 2026-09-04 — Encre / Lait v2 (révision de la palette et des registres typographiques)
colors:
  # ---------- ENCRE (espace de travail, mode par défaut de l'app) ----------
  encre-ground: "#09101C"
  encre-surface-1: "#121A28"
  encre-surface-2: "#1A2333"
  encre-surface-3: "#232D3E"
  encre-hairline: "rgba(190, 215, 245, 0.11)"
  encre-hairline-strong: "rgba(190, 215, 245, 0.18)"
  encre-text: "#E8EDF4"
  encre-text-2: "#A8B4C6"
  encre-text-3: "#7A8699"
  encre-text-disabled: "rgba(232, 237, 244, 0.38)"
  encre-machine: "#8FB0D8"
  encre-machine-dim: "#1E3450"
  encre-pane: "rgba(255, 255, 255, 0.055)"
  encre-pane-line: "rgba(190, 215, 245, 0.17)"
  encre-pane-highlight: "rgba(255, 255, 255, 0.18)"
  encre-overlay: "rgba(9, 16, 28, 0.62)"
  encre-light: "rgba(255, 226, 196, 0.17)"
  encre-bloom: "0 0 24px rgba(255, 226, 196, 0.12)"
  encre-ring: "rgba(232, 237, 244, 0.60)"
  encre-action: "#E8EDF4"
  encre-action-hover: "#FFFFFF"
  encre-action-active: "#D6DDE7"
  encre-on-action: "#09101C"
  encre-success: "#8BD4A5"
  encre-success-bg: "rgba(139, 212, 165, 0.12)"
  encre-warning: "#F0B35A"
  encre-warning-bg: "rgba(240, 179, 90, 0.12)"
  encre-danger: "#F07A6B"
  encre-danger-bg: "rgba(240, 122, 107, 0.12)"
  # ---------- LAIT (lecture client, documents publiés) ----------
  lait-ground: "#EDF0F3"
  lait-surface-1: "#F5F7F9"
  lait-surface-2: "#FFFFFF"
  lait-hairline: "rgba(18, 32, 47, 0.08)"
  lait-hairline-strong: "rgba(18, 32, 47, 0.14)"
  lait-text: "#12202F"
  lait-text-2: "#45526A"
  lait-text-3: "#5F6D7C"
  lait-text-disabled: "rgba(18, 32, 47, 0.38)"
  lait-pane: "rgba(255, 255, 255, 0.64)"
  lait-pane-line: "rgba(255, 255, 255, 0.95)"
  lait-pane-shadow: "0 0 0 1px rgba(18, 32, 47, 0.07), 0 28px 70px rgba(18, 32, 47, 0.10)"
  lait-overlay: "rgba(237, 240, 243, 0.70)"
  lait-light: "rgba(255, 255, 255, 0.85)"
  lait-ring: "rgba(18, 32, 47, 0.45)"
  lait-action: "#12202F"
  lait-action-hover: "#1B2C40"
  lait-action-active: "#0B1520"
  lait-on-action: "#EDF0F3"
  lait-success: "#1F7A4D"
  lait-success-bg: "rgba(31, 122, 77, 0.10)"
  lait-warning: "#8A5E0E"
  lait-warning-bg: "rgba(138, 94, 14, 0.10)"
  lait-danger: "#B4443A"
  lait-danger-bg: "rgba(180, 68, 58, 0.10)"
typography:
  voice-display:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "clamp(2.4rem, 4.5vw, 3.625rem)"
    fontWeight: 300
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  voice-page:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.15
  voice-doc-title:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "1.625rem"
    fontWeight: 400
    lineHeight: 1.2
  voice-doc-body:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    maxWidth: "68ch"
  ui-section:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.3
  ui-title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.3
  ui-body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  ui-control:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1
  ui-meta:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.45
  ui-badge:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.71875rem"
    fontWeight: 400
    lineHeight: 1.45
  ui-eyebrow:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.78125rem"
    fontWeight: 400
    lineHeight: 1.45
    color: "{colors.encre-machine}"
  ui-caption:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  machine:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  pane: "1rem"
  full: "9999px"
motion:
  fast: "160ms cubic-bezier(0.2, 0, 0, 1)"
  enter: "220ms cubic-bezier(0.2, 0, 0, 1)"
components:
  button-primary:
    backgroundColor: "{colors.encre-action}"
    textColor: "{colors.encre-on-action}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0 1rem"
    hover: "{colors.encre-action-hover} + {colors.encre-bloom}"
  button-secondary:
    backgroundColor: "{colors.encre-surface-2}"
    textColor: "{colors.encre-text}"
    border: "1px {colors.encre-hairline}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.encre-text-2}"
    hover: "{colors.encre-surface-1} + {colors.encre-text}"
  card:
    backgroundColor: "{colors.encre-surface-1}"
    border: "1px {colors.encre-hairline}"
    rounded: "{rounded.lg}"
    padding: "1.25rem 1.5rem"
    shadow: "none"
  input:
    backgroundColor: "{colors.encre-surface-1}"
    textColor: "{colors.encre-text}"
    border: "1px {colors.encre-hairline-strong}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0 0.75rem"
  pane:
    backgroundColor: "{colors.encre-pane}"
    border: "1px {colors.encre-pane-line}"
    shadow: "inset 0 1px 0 {colors.encre-pane-highlight}"
    rounded: "{rounded.pane}"
    backdropFilter: "blur(22px) saturate(1.1)"
---

# Diaphane — système visuel

## 1. L'idée

Diaphane se place entre la tech et le client. Le système visuel est cette phrase, littéralement.

- **Encre** — le côté dev. L'espace de travail, là où l'on branche les sources, rédige et décide ce qui est publié. Sombre, bleu-nuit, avec la tech visible derrière en faible contraste.
- **Lait** — le côté client. Les documents publiés, en lecture seule. Clair, blanc froid, dépoli, lisible par quelqu'un qui n'a jamais ouvert un terminal.
- **La paroi** — le passage de l'un à l'autre. Une surface de verre dépoli : derrière, la source ; devant, ce qui est lisible. Elle apparaît sur la landing, dans les couches flottantes de l'app (dialogues, panneaux), et dans le pattern « source derrière, traduction devant » de l'éditeur.

Le client ne voit jamais l'encre. Le dev voit les deux : son espace est sombre, et le document du client y apparaît comme une carte claire, la seule surface Lait dans l'Encre. C'est la porte.

**Ce que ce système remplace.** Le fond noir neutre (#0A0A0B) devient une encre bleue (#09101C). Le blanc froid de l'ancien système devient le blanc bleuté #E8EDF4. Il n'y a plus d'accent de teinte : la seule chaleur est la lumière derrière le verre. Urbanist et Geist Mono sont remplacés par Spectral, IBM Plex Sans et IBM Plex Mono. Les effets « optical memory » (rayons, iris, grain, halo, glow-medium/strong) disparaissent ; ce qui en survit est la discipline : mat par défaut, lumière localisée, et le test de suppression (retire l'effet, la composition doit tenir).

## 2. Les cinq règles

1. **Le bleu clair n'existe que dans la machine.** `encre-machine` (#8FB0D8) ne colore que du monospace, petit : provenance, refs, compteurs de la couche machine. Jamais un titre, jamais un fond, jamais un bouton. La voix (Spectral) et les titres restent en `encre-text`.
2. **Pas d'accent de teinte.** Aucune couleur de marque en texte ou en fond. L'action primaire est le blanc bleuté sur encre, l'encre sur lait. Les couleurs de statut (succès, attention, erreur) sont fonctionnelles, jamais décoratives, jamais sur un élément actionnable. L'information est neutre : le bleu est déjà le sol, il ne peut pas être un signal.
3. **Le verre est rare.** Un seul `backdrop-filter` par écran, réservé aux couches flottantes (dialogue, panneau latéral, palette de commandes). Les cartes, listes et champs sont des surfaces plates.
4. **Spectral n'est que la voix.** Le titre d'une page, le titre et le corps d'un document : ce qu'on lit, jamais ce qu'on manipule. Boutons, champs, labels, tableaux, badges : Plex Sans. Le poids 300 n'existe qu'au-dessus de 40 px.
5. **Le client ne voit jamais la machine.** Aucun monospace, aucun hash, aucun chemin de fichier, aucun pourcentage de commits dans Lait. La provenance y est une phrase en Plex Sans (« Mis à jour à partir de 14 changements cette semaine »).

## 3. Couleurs

### Encre

| Token | Valeur | Rôle | Contraste sur ground |
|---|---|---|---|
| `encre-ground` | #09101C | Le sol de l'espace de travail | — |
| `encre-surface-1` | #121A28 | Cartes, lignes de liste au survol, champs | — |
| `encre-surface-2` | #1A2333 | Popovers, toasts, boutons secondaires, survol des cartes | — |
| `encre-surface-3` | #232D3E | Sélection active, tooltips | — |
| `encre-hairline` | bleu clair 11 % | Séparateurs, bordures de cartes | — |
| `encre-hairline-strong` | bleu clair 18 % | Bordures de champs, cartes au survol | — |
| `encre-text` | #E8EDF4 | Titres, corps, texte des contrôles | ≈15:1 |
| `encre-text-2` | #A8B4C6 | Texte secondaire, descriptions, liens de nav | ≈9.6:1 |
| `encre-text-3` | #7A8699 | Métadonnées, dates, pourcentages, placeholders | ≈5.9:1 |
| `encre-machine` | #8FB0D8 | La seule couleur du registre machine : provenance, refs, chemins | ≈7:1 |
| `encre-machine-dim` | #1E3450 | Monospace décoratif (la couche code de la landing), `aria-hidden` uniquement | ≈1.6:1, jamais pour de l'information |
| `encre-pane` / `-line` / `-highlight` | white 5.5 % / bleu clair 17 % / white 18 % | La paroi : couches flottantes uniquement | — |
| `encre-overlay` | ground 62 % | Voile sous un dialogue | — |
| `encre-light` | rgba(255,226,196,.17) | La source de lumière : un dégradé radial, au plus un par écran | — |
| `encre-bloom` | 0 0 24px rgba(255,226,196,.12) | Le seul glow : survol du bouton primaire | — |
| `encre-ring` | text 60 % (#E8EDF4) | Anneau de focus, 2 px, offset 2 px | — |

Surfaces : les valeurs hexa sont l'encre mélangée par paliers réguliers vers le bleu clair. Les utiliser en solide (pas en alpha) pour les cartes et champs, afin que le texte dessus reste prévisible.

### Lait

| Token | Valeur | Rôle | Contraste sur ground |
|---|---|---|---|
| `lait-ground` | #EDF0F3 | Le sol de la lecture client. Blanc **froid** : du verre, pas du papier | — |
| `lait-surface-1` | #F5F7F9 | Encarts, blocs cités | — |
| `lait-surface-2` | #FFFFFF | Cartes, champs (rares côté client) | — |
| `lait-hairline` / `-strong` | ink 8 % / 14 % | Séparateurs / bordures | — |
| `lait-text` | #12202F | Titres et corps de document | ≈14:1 |
| `lait-text-2` | #45526A | Texte secondaire | ≈6.9:1 |
| `lait-text-3` | #5F6D7C | Métadonnées uniquement, jamais en corps | ≈4.6:1 |
| `lait-pane` / `-line` / `-shadow` | white 64 % / 95 % / ombre froide diffuse | La paroi côté clair (en-tête flottant, aperçu) | — |
| `lait-action` / `-on-action` | #12202F / #EDF0F3 | Le rare bouton côté client (télécharger, imprimer) | — |
| `lait-ring` | ink 45 % | Focus | — |

### Statuts

Même sémantique dans les deux matières, valeurs différentes pour tenir le contraste. Texte + fond alpha, jamais de bordure colorée, jamais sur un bouton.

| Statut | Encre | Lait | Usage |
|---|---|---|---|
| Succès | #8BD4A5 sur 12 % | #1F7A4D sur 10 % | Publié, connecté, terminé |
| Attention | #F0B35A sur 12 % | #8A5E0E sur 10 % | Source désynchronisée, brouillon non publié depuis longtemps |
| Erreur | #F07A6B sur 12 % | #B4443A sur 10 % | Échec de connexion, action destructive |
| En attente / neutre | `text-3` sur `surface-2` | `text-3` sur `surface-1` | Branchement non configuré, « à commencer » |

Le pill « En cours » actuel devient un statut neutre. La barre de progression n'a pas de couleur : piste `hairline`, remplissage `text`.

### Ce qui n'existe plus

`optical-light`, `optical-mid`, `cold-halo`, la trio iris, `gradient-from/via/to`, le grain, la vignette, `glow-medium`, `glow-strong`, `surface-client` (devenu `lait-ground`). Le focus doré des champs disparaît avec eux.

## 4. Typographie

Trois voix, trois familles, chargées via `next/font/google` et exposées en `--font-voice`, `--font-ui`, `--font-machine`.

| Rôle | Famille | Où |
|---|---|---|
| **Voix** | Spectral 300 / 400 / 400 italique | Ce qu'on lit : display de la landing, titres de page, titres et corps de documents |
| **Interface** | IBM Plex Sans 400 / 500 | Tout ce qu'on manipule : nav, boutons, champs, labels, cartes, badges, tableaux |
| **Machine** | IBM Plex Mono 400 | La source : commits, chemins, identifiants. Espace de travail uniquement |

### Échelle

| Style | Famille / poids | Taille / interligne | Usage |
|---|---|---|---|
| `voice-display` | Spectral 300 | clamp 38–58 px / 1.04 | Landing uniquement |
| `voice-page` | Spectral 400 | 30 / 1.15 | Titre de page dans l'app (« Vos projets », nom du projet) |
| `voice-doc-title` | Spectral 400 | 26 / 1.2 | Titre d'un document, éditeur et vue client |
| `voice-doc-body` | Spectral 400 | 17 / 1.6, mesure 68ch | Corps d'un document, éditeur et vue client |
| `ui-section` | Plex Sans 500 | 17 / 1.3 | Titres de section (« Connexions », « Équipe ») |
| `ui-title` | Plex Sans 500 | 16 / 1.3 | Titres de carte et de ligne |
| `ui-body` | Plex Sans 400 | 15 / 1.5 | Texte courant de l'interface |
| `ui-control` | **Plex Mono 500** | 13 / 1 | Boutons, onglets, liens de nav |
| `ui-meta` | **Plex Mono 400** | 12 / 1.45 | Dates, compteurs, pourcentages, aide de champ |
| `ui-badge` | **Plex Mono 400** | 11.5 / 1.45 | Badges de statut |
| `ui-eyebrow` | **Plex Mono 400** | 12.5 / 1.45 | L'étiquette au-dessus d'un titre, en `encre-machine` |
| `ui-caption` | Plex Sans 400 | 12 / 1.4 | Taille minimale, rare |
| `machine` | Plex Mono 400 | 13 / 1.6 | Provenance, refs |

### Les trois registres

La **mécanique** de l'interface est monospace, en casse normale et sans interlettrage : boutons, onglets, liens de nav (`ui-control`), dates, compteurs, pourcentages, aide de champ (`ui-meta`), badges (`ui-badge`), étiquettes au-dessus d'un titre (`ui-eyebrow`). La **prose** de l'interface reste Plex Sans : `ui-section`, `ui-title`, `ui-body`, `ui-caption`, et le texte saisi dans un champ. La **voix** reste Spectral : `voice-display`, `voice-page`, `voice-doc-title`, `voice-doc-body`.

### Interdits typographiques

Pas de capitales en label (« BRANCHEMENTS » devient « Connexions » en `ui-section`). Pas d'interlettrage positif. Pas de graisse au-delà de 500 en Plex ni de 400 en Spectral dans l'app. Pas de monospace côté client : Lait n'a pas de registre machine.

## 5. Formes, élévation, lumière, mouvement

**Rayons.** `sm` 6 px pour badges et tooltips, `md` 8 px pour contrôles et champs, `lg` 10 px pour cartes et toasts, `pane` 16 px pour la paroi. `full` uniquement pour les avatars et les points de statut.

**Élévation.** Par paliers de surface (ground → 1 → 2 → 3) et par hairline, jamais par ombre dans Encre. Une carte cliquable au survol : `surface-2` et `hairline-strong`, rien d'autre. Dans Lait, l'ombre existe une seule fois, sous la paroi (`lait-pane-shadow`).

**La paroi.** `encre-pane` + `encre-pane-line` + reflet `inset 0 1px 0 encre-pane-highlight` + `backdrop-filter: blur(22px) saturate(1.1)` (préfixe `-webkit-` inclus) + rayon `pane` (16 px). Autorisée sur : dialogue, panneau latéral, palette de commandes, et le hero de la landing. Une par écran. Interdite sur cartes, nav, champs, toasts.

**La lumière.** Au plus une source par écran, toujours *derrière* un objet et jamais globale. Sur la landing, c'est l'illustration du hero (`public/images/illustration.png`) : une onde de lignes pâles sur fond transparent, statique, débordant des deux côtés, percée en son centre pour qu'aucun mot ne se lise à travers une ligne ; dans l'app, derrière la porte (la carte du document client) ou derrière un état vide. Un dégradé radial en `encre-light`, statique. Aucune animation de lumière, aucune dépendance (`SideRays` / `ogl` sont retirés). Le seul glow est `encre-bloom` au survol du bouton primaire, jamais permanent.

**Le test de suppression.** Pour chaque effet : retire-le, la composition doit tenir. Sinon, on refait la composition, pas l'effet.

**Mouvement.** `fast` 160 ms pour survol, focus, changement d'état. `enter` 220 ms pour l'apparition d'un dialogue (opacité + translation 8 px). `prefers-reduced-motion` respecté partout. Pas de respiration, pas de pulsation, pas de rotation continue : le point de statut est fixe.

## 6. Composants

Le stack est shadcn sur Tailwind ; les composants ci-dessous sont des surcharges des primitives shadcn, pas de nouveaux composants. Mapping des variables en § 9.

### Bouton

| Variante | Repos | Survol | Actif | Focus | Désactivé |
|---|---|---|---|---|---|
| Primaire | `action` / `on-action` | `action-hover` + `bloom` | `action-active` | `ring` 2 px offset 2 px | opacité 38 %, pas de bloom |
| Secondaire | `surface-2`, bordure `hairline`, `text` | `surface-3`, `hairline-strong` | `surface-3` | idem | idem |
| Fantôme | transparent, `text-2` | `surface-1`, `text` | `surface-2` | idem | idem |
| Destructif | transparent, bordure `hairline`, `danger` | `danger-bg` | `danger-bg` | idem | idem |

Tailles : `sm` 32 px, `md` 36 px, `lg` 44 px (landing). Rayon `md`. Police `ui-control`. Chargement : spinner dans la couleur du texte, libellé conservé. Une seule action primaire par vue.

### Champ

`surface-1`, bordure `hairline-strong`, rayon `md`, hauteur 36 px, texte `ui-body` 15 px en `text`, placeholder `text-3`. Focus : bordure → `text-2`, `ring` 2 px. Erreur : bordure `danger`, message `ui-meta` en `danger` sous le champ. Aide : `ui-meta` en `text-3`. Label : `ui-meta` 500 en `text-2`, jamais en capitales.

### Carte

`surface-1`, bordure `hairline`, rayon `lg`, padding 20 / 24 px, aucune ombre, jamais de verre. Cliquable : `surface-2` + `hairline-strong` au survol, `ring` au focus, l'ensemble de la carte est le lien. Titre `ui-title`, métadonnées `ui-meta` en `text-3`. L'icône dans un carré `surface-2` de 40 px disparaît : une carte de projet n'a pas besoin d'un pictogramme de dossier pour dire qu'elle est un projet.

### Dialogue et panneau latéral (la paroi)

Voile `encre-overlay`. Contenu en `pane` (voir § 5), largeur 480 px (dialogue) ou 420 px (panneau), padding 28 / 32 px. Titre `ui-section`, corps `ui-body`, actions à droite, secondaire à gauche de la primaire. Entrée `enter`, sortie `fast`. Focus piégé, `Esc` ferme, le focus revient à l'élément déclencheur.

### Badge de statut

`ui-meta` 500, padding 2 / 8 px, rayon `sm`, texte + fond alpha selon § 3, pas de bordure. Un point de 6 px devant le libellé, fixe.

### Barre de progression

Hauteur 2 px, piste `hairline`, remplissage `text`, rayon `full`. Pourcentage en `ui-meta` `text-3` aligné à droite, sur la même ligne que le libellé, pas en dessous.

### Ligne de liste

Padding 16 px vertical, séparateur `hairline` plein (les pointillés disparaissent). Titre `ui-title`, description `ui-body` en `text-2` avec une icône 16 px en `text-3` devant, action ou statut aligné à droite et centré verticalement. Survol si cliquable : `surface-1` débordant de 12 px.

### Navigation

Transparente sur `ground`, hairline en bas, hauteur 56 px. Emblème 22 px en `text` (SVG inline ou masque CSS, pour éliminer le pervenche résiduel du PNG) + « Diaphane » `ui-title`. À droite : avatar 28 px `full` + nom `ui-body` en `text-2`. Aucune diffusion sur le wordmark.

### Toast, tooltip, onglets

Toast : `surface-2`, bordure `hairline-strong`, rayon `lg`, jamais de verre. Tooltip : `surface-3`, `text`, rayon `sm`, `ui-caption`. Onglets : texte `ui-control`, actif `text` avec soulignement 1 px `text`, inactif `text-2`.

### État vide

Titre `ui-title`, phrase `ui-body` en `text-2`, action primaire. C'est l'un des deux endroits où une source de lumière est permise derrière.

## 7. Les deux patterns signature

### La porte

La carte du document client, dans l'espace de travail. Elle est la seule surface Lait dans l'Encre : fond `lait-ground`, texte `lait-text`, rayon `lg`, aucune bordure, aucune ombre ; le contraste avec le sol suffit. Contenu : titre du document en `voice-doc-title`, deux lignes d'extrait en `voice-doc-body` 15 px, une ligne de métadonnées en `ui-meta` `lait-text-3` (« Publié le 2 septembre » ou « Aucun document, à commencer »), et l'action « Voir comme le client » en `lait-action`. La lumière de l'écran, s'il y en a une, est derrière cette carte. Elle remplace la carte « Documentation client » actuelle et la « Signature Card » à iris.

### Source derrière, traduction devant

Le bloc de l'éditeur. À gauche, le contenu rédigé en `voice-doc-body`. À droite, une colonne de provenance de 240 px en `machine` `encre-machine` : les commits, pages Notion ou cartes de board dont ce bloc est issu, chacun sur une ligne, hash ou identifiant en tête. Au repos, la colonne est présente mais discrète ; au survol ou au focus du bloc, ses textes passent en `text-2` et une hairline relie le bloc à ses sources. En dessous de 900 px, la colonne passe sous le bloc, repliée, avec un compteur (« 3 sources »). À la publication, la colonne disparaît : dans Lait, elle devient une phrase en Plex Sans.

C'est la landing devenue fonctionnalité : la tech derrière, en faible contraste ; ce qui se lit, devant.

## 8. Les deux coquilles

### Espace de travail (Encre)

Nav § 6. Contenu en 1120 px max, padding 24 px (48 px ≥ 1024 px). En-tête de page : fil d'Ariane en `ui-meta` `text-3` (« ← Vos projets »), titre `voice-page`, action primaire alignée à droite sur la ligne du titre. Sections séparées par une hairline et 40 px, titre `ui-section`. Grille de cartes 1 → 2 → 3 colonnes, gap 20 px.

### Lecture client (Lait)

Pas de nav applicative. En-tête : nom du projet `ui-title`, « Documents publiés par {prénom} » `ui-meta` `lait-text-3`, à droite « Mis à jour le … ». Sommaire optionnel à gauche en `ui-meta`, colonne de lecture 68ch centrée, titres `voice-doc-title`, corps `voice-doc-body`, encarts en `surface-1`. Pied de page « Publié avec Diaphane » en `ui-caption`. Aucun monospace, aucun bouton hormis télécharger / imprimer.

## 9. Migration

### Correspondance des tokens

| Ancien | Nouveau |
|---|---|
| `background-black` | `encre-ground` |
| `elevated-surface` | `encre-surface-1` |
| `soft-surface` | `encre-surface-2` |
| `recessed-black` | `encre-surface-1` (le palier « recessed » disparaît) |
| `primary-text` / `secondary-text` / `faint-text` | `encre-text` / `encre-text-2` / `encre-text-3` |
| `pure-white` | `encre-action-hover` |
| `optical-light`, `optical-mid`, `cold-halo` | supprimés ; lumière → `encre-light`, focus → `encre-ring` |
| `glass`, `glass-border` | `encre-pane`, `encre-pane-line` (couches flottantes uniquement) |
| `surface-client` | `lait-ground` |
| `subtle-border` / `input-border` | `encre-hairline` / `encre-hairline-strong` |
| `destructive` / `success` | `encre-danger` / `encre-success` |
| `iris-*`, `gradient-*` | supprimés |

### Variables shadcn (mode Encre)

`--background` encre-ground · `--foreground` encre-text · `--card` encre-surface-1 · `--card-foreground` encre-text · `--popover` encre-surface-2 · `--muted` encre-surface-1 · `--muted-foreground` encre-text-3 · `--border` encre-hairline · `--input` encre-hairline-strong · `--ring` encre-ring · `--primary` encre-action · `--primary-foreground` encre-on-action · `--secondary` encre-surface-2 · `--secondary-foreground` encre-text · `--accent` encre-surface-2 · `--accent-foreground` encre-text · `--destructive` encre-danger · `--radius` 0.625rem.

Le mode Lait est un `data-theme="lait"` posé sur la route client, avec les mêmes variables remappées sur les tokens `lait-*`.

### Polices

`next/font/google` : Spectral (300, 400, italique 400) → `--font-voice` ; IBM Plex Sans (400, 500) → `--font-ui` ; IBM Plex Mono (400) → `--font-machine`. Urbanist et Geist Mono sont retirés, ainsi que leurs références Tailwind.

### À supprimer

Urbanist, Geist Mono, les tokens optiques et la trio iris, `SideRays` / `hero-rays.tsx` et la dépendance `ogl`, le grain et la vignette, les utilitaires `glow-*` sauf `bloom`, la barre de nav en verre, les eyebrows mono en capitales, les séparateurs pointillés, les icônes en carré dans les cartes, le focus doré, `brand-logo.png` (remplacé par l'emblème SVG).

### Ordre

1. Tokens, variables shadcn, polices, mode `lait`. Rien d'autre ne change encore.
2. Surcharges des primitives : bouton, champ, carte, dialogue, badge, progression, ligne de liste, nav.
3. Coquilles : espace de travail, lecture client.
4. Écrans, dans cet ordre : liste des projets, projet, dialogue nouveau projet, éditeur (avec le pattern source / traduction), vue client, puis les sections de la landing sous le hero.

## 10. Faire / Ne pas faire

| Faire | Ne pas faire |
|---|---|
| Une seule action primaire par vue, en blanc bleuté | Un accent de teinte, sur quoi que ce soit |
| Le verre sur les couches flottantes, une fois par écran | Du verre sur une carte, une nav, un champ, un toast |
| Spectral pour les titres de page et les documents | Spectral dans un bouton, un label, un tableau |
| Le mono pour la provenance, dans l'espace de travail | Du mono côté client, ou comme label d'interface |
| Une lumière derrière un objet, statique | Une lumière globale, animée, ou sur du texte |
| Des surfaces solides par paliers | Des ombres dans Encre, des dégradés nommables |
| Des statuts en texte + fond alpha | Des statuts sur un bouton, ou en bordure colorée |
| Le test de suppression avant tout effet | Renforcer un effet pour sauver une composition |
