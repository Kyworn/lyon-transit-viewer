/**
 * Responsive Design System
 * Centralizes all responsive breakpoints, dimensions, and utilities
 */

// Breakpoints (matching Material-UI defaults but explicit)
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const;

// Single source of truth for the "phone / full-screen sheet" boundary.
// Aligned with the media queries the panels already use so layouts don't shift.
// Anything with width <= MOBILE_MAX renders panels as full-screen dismissible
// overlays (X + backdrop + Escape + swipe-down); above it, side drawers.
export const MOBILE_MAX = 768;

// Responsive dimensions
export const DIMENSIONS = {
  // Header heights
  header: {
    mobile: 56,
    tablet: 64,
    desktop: 70,
  },

  // Sidebar widths
  sidebar: {
    mobile: '100vw', // Full width on mobile
    tablet: 380,
    desktop: 440,
    collapsed: 0,
  },

  // Bottom navigation
  bottomNav: {
    height: { xs: 80, md: 88 },
  },

  // FABs
  fab: {
    small: 48,
    medium: 56,
    large: 64,
  },

  // Spacing for FABs and controls
  spacing: {
    mobile: 16,
    tablet: 24,
    desktop: 32,
  },

  // Drawer/Modal widths
  drawer: {
    mobile: '100vw',
    tablet: '80vw',
    desktop: 400,
  },
} as const;

// Z-index layers
export const Z_INDEX = {
  map: 0,
  mapControls: 1150,
  sidebar: 1300, // Above dock on mobile
  header: 1200,
  bottomNav: 1250,
  drawer: 1400,
  modal: 1500,
  snackbar: 1600,
} as const;

// Aura Design Tokens (2026)
export const AURA_TOKENS = {
  glass: {
    dark: 'rgba(10, 10, 12, 0.72)',
    light: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.08)',
    blur: '24px',
  },
  glow: {
    primary: 'rgba(14, 165, 233, 0.25)',
    secondary: 'rgba(249, 115, 22, 0.2)',
    success: 'rgba(34, 197, 94, 0.2)',
  },
  borderRadius: {
    panel: 32,
    widget: 24,
    button: 16,
  }
} as const;

// Media queries helpers
export const MEDIA_QUERIES = {
  mobile: `@media (max-width: ${BREAKPOINTS.sm - 1}px)`,
  tablet: `@media (min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.md - 1}px)`,
  desktop: `@media (min-width: ${BREAKPOINTS.md}px)`,
  largeDesktop: `@media (min-width: ${BREAKPOINTS.lg}px)`,

  // Utility queries
  touchDevice: '@media (hover: none) and (pointer: coarse)',
  belowTablet: `@media (max-width: ${BREAKPOINTS.md - 1}px)`,
  aboveTablet: `@media (min-width: ${BREAKPOINTS.md}px)`,
} as const;

// Responsive values helper
export const responsive = {
  // Get value based on breakpoint
  value: (mobile: number | string, tablet?: number | string, desktop?: number | string) => ({
    xs: mobile,
    sm: tablet ?? mobile,
    md: desktop ?? tablet ?? mobile,
  }),

  // Get display value based on breakpoint
  display: {
    mobileOnly: { xs: 'flex', md: 'none' },
    tabletUp: { xs: 'none', sm: 'flex' },
    desktopOnly: { xs: 'none', md: 'flex' },
    tabletOnly: { xs: 'none', sm: 'flex', md: 'none' },
  },
} as const;

// Animation durations
export const ANIMATION = {
  fast: 200,
  normal: 300,
  slow: 500,
  drawer: 400,
} as const;

// Touch/gesture constants
export const GESTURES = {
  swipeThreshold: 50, // Minimum distance for swipe
  swipeVelocity: 0.3, // Minimum velocity for swipe
  dragThreshold: 10, // Minimum distance to start drag
} as const;
