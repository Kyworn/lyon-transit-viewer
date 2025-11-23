import { createTheme, alpha } from '@mui/material/styles';

// --- PROJECT NEON DESIGN SYSTEM ---

// 1. CORE PALETTE (OLED & NEON)
const NEON_CYAN = '#00F0FF';
const NEON_MAGENTA = '#FF003C';
const NEON_LIME = '#CCFF00';
const NEON_YELLOW = '#FCEE0A';
const OLED_BLACK = '#000000';
const DEEP_SPACE = '#050505';

// 2. GLASSMORPHISM 3.0 (Hyper-Modern)
const GLASS_BG = 'rgba(0, 0, 0, 0.4)'; // More transparent
const GLASS_BORDER = 'rgba(255, 255, 255, 0.08)';
const GLASS_BLUR = '40px'; // Extreme blur
const NEON_GLOW = (color: string) => `0 0 20px ${alpha(color, 0.4)}, 0 0 40px ${alpha(color, 0.2)}`;

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: NEON_CYAN,
      light: '#5FFFFF',
      dark: '#00B8C4',
      contrastText: OLED_BLACK,
    },
    secondary: {
      main: NEON_MAGENTA,
      light: '#FF4D79',
      dark: '#C4002E',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#FF2A2A',
    },
    warning: {
      main: NEON_YELLOW,
    },
    success: {
      main: NEON_LIME,
    },
    info: {
      main: '#2D9CDB',
    },
    background: {
      default: OLED_BLACK,
      paper: DEEP_SPACE,
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.6)',
    },
    divider: 'rgba(255, 255, 255, 0.1)',
  },
  typography: {
    fontFamily: '"Space Grotesk", "Inter", sans-serif',
    h1: { fontFamily: 'Space Grotesk', fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontFamily: 'Space Grotesk', fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontFamily: 'Space Grotesk', fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontFamily: 'Space Grotesk', fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontFamily: 'Space Grotesk', fontWeight: 600 },
    h6: { fontFamily: 'Space Grotesk', fontWeight: 600 },
    subtitle1: { fontFamily: 'Inter', fontWeight: 500 },
    subtitle2: { fontFamily: 'Inter', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' },
    body1: { fontFamily: 'Inter', lineHeight: 1.6 },
    body2: { fontFamily: 'Inter', lineHeight: 1.5 },
    button: { fontFamily: 'Space Grotesk', fontWeight: 700, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12, // Sharper, technical look
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: OLED_BLACK,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: GLASS_BG,
          backdropFilter: `blur(${GLASS_BLUR})`,
          border: `1px solid ${GLASS_BORDER}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Technical, not pill
          padding: '10px 24px',
          fontSize: '0.95rem',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        },
        containedPrimary: {
          background: NEON_CYAN,
          color: OLED_BLACK,
          boxShadow: NEON_GLOW(NEON_CYAN),
          '&:hover': {
            background: '#5FFFFF',
            boxShadow: `0 0 30px ${alpha(NEON_CYAN, 0.6)}, 0 0 60px ${alpha(NEON_CYAN, 0.3)}`,
            transform: 'translateY(-2px)',
          },
        },
        containedSecondary: {
          background: NEON_MAGENTA,
          color: '#FFFFFF',
          boxShadow: NEON_GLOW(NEON_MAGENTA),
          '&:hover': {
            background: '#FF4D79',
            boxShadow: `0 0 30px ${alpha(NEON_MAGENTA, 0.6)}, 0 0 60px ${alpha(NEON_MAGENTA, 0.3)}`,
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          '&:hover': {
            borderColor: '#FFFFFF',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 32,
          backgroundColor: 'rgba(5, 5, 5, 0.6)', // Slightly darker for cards
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          fontWeight: 700,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        filled: {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(40px)',
          border: 'none',
          boxShadow: '0 0 50px rgba(0,0,0,0.8)',
        },
      },
    },
  },
});

export default theme;