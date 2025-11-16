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
    tablet: 360,
    desktop: 400,
    collapsed: 0,
  },

  // Bottom navigation
  bottomNav: {
    height: 64,
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
  mapControls: 100,
  sidebar: 1100,
  header: 1200,
  bottomNav: 1250,
  drawer: 1300,
  modal: 1400,
  snackbar: 1500,
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
