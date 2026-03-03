import { alpha, createTheme } from '@mui/material/styles';

const BRAND_NAVY = '#0F172A';
const BRAND_STEEL = '#1E293B';
const BRAND_SKY = '#0EA5E9';
const BRAND_MINT = '#22C55E';
const BRAND_AMBER = '#F59E0B';
const BRAND_CORAL = '#F97316';
const PAPER_GLASS = 'rgba(15, 23, 42, 0.74)';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: BRAND_SKY,
      light: '#38BDF8',
      dark: '#0284C7',
      contrastText: '#F8FAFC',
    },
    secondary: {
      main: BRAND_CORAL,
      light: '#FB923C',
      dark: '#EA580C',
      contrastText: '#F8FAFC',
    },
    success: { main: BRAND_MINT },
    warning: { main: BRAND_AMBER },
    error: { main: '#EF4444' },
    info: { main: '#38BDF8' },
    background: {
      default: '#020617',
      paper: BRAND_NAVY,
    },
    text: {
      primary: '#E2E8F0',
      secondary: '#94A3B8',
    },
    divider: alpha('#94A3B8', 0.22),
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"IBM Plex Sans", "Space Grotesk", sans-serif',
    h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    button: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#020617',
          backgroundImage:
            'radial-gradient(1200px circle at 15% -10%, rgba(14,165,233,0.18), transparent 55%), radial-gradient(900px circle at 110% 110%, rgba(249,115,22,0.14), transparent 50%)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: PAPER_GLASS,
          backdropFilter: 'blur(18px)',
          border: `1px solid ${alpha('#94A3B8', 0.18)}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(BRAND_NAVY, 0.86),
          border: `1px solid ${alpha('#94A3B8', 0.18)}`,
          borderRadius: 20,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: 16,
          paddingBlock: 9,
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${BRAND_SKY} 0%, #2563EB 100%)`,
          boxShadow: `0 10px 24px ${alpha(BRAND_SKY, 0.28)}`,
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${BRAND_CORAL} 0%, #DC2626 100%)`,
          boxShadow: `0 10px 24px ${alpha(BRAND_CORAL, 0.25)}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: alpha(BRAND_NAVY, 0.92),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(BRAND_STEEL, 0.8)}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
