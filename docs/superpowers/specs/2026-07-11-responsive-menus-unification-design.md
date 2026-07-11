# Unification du comportement responsive des menus/panneaux

**Date:** 2026-07-11
**Statut:** Approuvé (design), à implémenter

## Problème

Les panneaux overlay (Sidebar, RoutePlanner, AlertsPanel, LayersPanel,
FavoritesPanel, Stats, AdminDashboard, plus les modals de détail) ouvrent et
ferment de façon incohérente entre mobile et desktop. Le **design visuel est
validé et ne doit pas changer** — seul le comportement (breakpoints, fermeture,
exclusion mutuelle, z-index, animations) est en cause.

### 7 incohérences constatées (audit)

1. **Aucune détection de breakpoint en JS.** Chaque panneau injecte son propre
   `<style>` avec `@media (max-width: 768px)` codé en dur (9 occurrences).
   `Header.tsx` invente en plus 992px et 520px. Les constantes
   `BREAKPOINTS` de `responsive.ts` (sm:600, md:900) ne sont importées nulle
   part → code mort. 4 seuils « mobile » coexistent.
2. **Sidebar sans bouton fermer sur mobile.** Elle devient plein écran
   (`z-index:130`) au-dessus du dock ; son unique bouton d'en-tête bascule vers
   RoutePlanner au lieu de fermer (`Sidebar.tsx:511-532`).
3. **AdminDashboard**: clic backdrop ne ferme pas, alors que le modal Stats
   jumeau (même pattern visuel) ferme au clic backdrop.
4. **Exclusion mutuelle incohérente.** `closeAllPanels` (`useAppStore.ts:158`)
   ne réinitialise que 5 flags, jamais `layersPanelOpen`/`favoritesPanelOpen`.
   `toggleLayers`/`toggleFavorites` sont de simples self-toggles. Les toggles
   Alertes/Admin du Header (`Header.tsx:201,226`) contournent `closeAllPanels`
   → « ouvrir Alertes » agit différemment selon dock vs header.
5. **2 patterns d'animation exit** mélangés : certains panneaux jouent l'exit
   (`{open && <motion/>}` dans `AnimatePresence`), d'autres disparaissent sec
   (montés/démontés par le parent, exit jamais joué).
6. **Aucune touche Escape** nulle part.
7. **z-index anarchique** (100/110/120/130/199/200/1100/2000), aucun ne matche
   la table `Z_INDEX` déclarée dans `responsive.ts`.

## Objectif

Comportement d'ouverture/fermeture **identique et prévisible** sur tous les
panneaux et à tous les breakpoints, sans modifier l'apparence.

## Design

### 1. Source unique de breakpoint

- Ajouter `MOBILE_MAX = 768` dans `constants/responsive.ts` (valeur alignée sur
  les media queries existantes, pour ne pas casser les layouts).
- Nouveau hook `hooks/useBreakpoint.ts` : `matchMedia('(max-width: 767px)')`,
  retourne `{ isMobile: boolean }`, réactif au resize (listener sur le
  `MediaQueryList`), nettoyage à l'unmount.
- Les `<style>` injectés qui utilisent `768px` référencent `MOBILE_MAX` via
  template literal (`@media (max-width: ${MOBILE_MAX}px)`). Header : ses seuils
  992/520 sont des ajustements cosmétiques propres (marges, horloge) — on garde
  520 pour l'horloge mais on aligne le reset de marge sur `MOBILE_MAX`.

### 2. Hook de fermeture partagé

- `hooks/usePanelDismiss.ts` : `usePanelDismiss(open, onClose)` câble un
  listener `keydown` Escape (actif seulement si `open`), retiré au cleanup.
- Le clic backdrop reste géré dans chaque panneau (markup local), mais tous
  appellent le même `onClose`.

### 3. Comportement uniforme des panneaux

Pour **chaque** panneau overlay :
- **Mobile (<768)** : overlay plein écran (pattern déjà en place) avec, garantis,
  **X + clic backdrop + Escape**. Ajout du bouton X manquant sur la Sidebar
  mobile (fermeture standalone, distincte du bouton « aller à Itinéraire »).
- **Desktop** : drawer latéral inchangé.
- Pattern d'animation homogénéisé : gate `{open && <motion/>}` dans
  `AnimatePresence` partout, pour que l'exit joue (corrige les modals de détail
  montés/démontés par le parent — passer le flag au composant plutôt que
  monter/démonter, ou accepter l'absence d'exit de façon documentée).

### 4. Exclusion mutuelle cohérente

- `closeAllPanels` inclut `layersPanelOpen` et `favoritesPanelOpen`.
- `toggleLayers`/`toggleFavorites` appellent `closeAllPanels()` puis set (comme
  les 4 autres).
- Les boutons Alertes/Admin du Header passent par les mêmes actions store que le
  FloatingDock (une action `openPanel(name)` centralisée dans le store qui fait
  `closeAllPanels()` + set le flag, appelée par dock ET header).

### 5. z-index centralisé

- Chaque panneau importe la table `Z_INDEX` de `responsive.ts` au lieu de
  valeurs magiques. Réconcilier la table avec la hiérarchie réelle voulue :
  map < dock < panneaux < détail-popover < modals plein écran (Stats/Admin) <
  snackbar. Ajuster les valeurs de la table si besoin pour refléter cet ordre.
- AdminDashboard : ajouter `onClick={onClose}` sur le backdrop (avec
  `stopPropagation` sur la carte).

### 6. Dock mobile

- `FloatingDock` : sur mobile les 7 boutons débordent. Passer le conteneur en
  `overflow-x: auto` (scroll horizontal) ou `flex-wrap`. Choix retenu : scroll
  horizontal (garde une seule rangée, évite de pousser la carte).

## Hors périmètre (YAGNI)

- Swipe-to-close (X + backdrop suffisent).
- Reconstruction des shells en composant `<OverlayPanel>` partagé : trop de
  risque de régression visuelle sur un design validé. On unifie le comportement,
  pas le markup.
- Refonte de `responsive.ts` au-delà de l'ajout de `MOBILE_MAX` et de
  l'ajustement de `Z_INDEX`.

## Fichiers touchés (~8-10)

- `constants/responsive.ts` (ajout MOBILE_MAX, ajuste Z_INDEX)
- `hooks/useBreakpoint.ts` (nouveau)
- `hooks/usePanelDismiss.ts` (nouveau)
- `stores/useAppStore.ts` (closeAllPanels + action openPanel)
- `components/ui/FloatingDock.tsx` (toggles via openPanel, dock scroll)
- `components/ui/Header.tsx` (toggles via store, seuils alignés)
- `components/sidebar/Sidebar.tsx` (bouton X mobile, Escape/backdrop, z-index)
- `components/route/RoutePlanner.tsx` (Escape/backdrop, z-index)
- `components/ui/AlertsPanel.tsx` (Escape/backdrop, z-index)
- `components/ui/LayersPanel.tsx` + `FavoritesPanel.tsx` (openPanel, z-index)
- `components/dashboard/AdminDashboard.tsx` (backdrop close, z-index)

## Vérification

- Build prod `npm run build` passe.
- Captures playwright (méthode CLI + `--load-storage`, éprouvée) à 3 viewports
  (390px, 768px, 1600px) montrant : chaque panneau ouvre/ferme via X, backdrop,
  Escape ; ouvrir un panneau ferme les autres ; dock entièrement accessible sur
  mobile ; Sidebar mobile fermable.
