import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stop, Line, Vehicle } from '../types';

export type ThemeMode = 'dark' | 'light';

export interface AppState {
  /* Selection & Navigation State */
  selectedItem: any; // Can be Vehicle or Stop
  selectedLine: Line | null;
  selectedStop: Stop | null;
  centerCoordinates: { lng: number; lat: number } | null;
  zoom: number;
  selectedJourney: any;
  currentJourneyStep: number | null;

  /* Favorites State */
  favoriteLines: string[]; // line_sort_code
  favoriteStops: string[]; // stop id

  /* Panel/Modal Open States */
  sidebarOpen: boolean;
  alertsPanelOpen: boolean;
  dashboardOpen: boolean;
  adminDashboardOpen: boolean;
  routePlannerOpen: boolean;

  /* Map Layer Visibility */
  vehiclesVisible: boolean;
  stopsVisible: boolean;
  linesVisible: boolean;
  velovVisible: boolean;
  autopartageVisible: boolean;
  toiletsVisible: boolean;
  vehiclesHeatmapVisible: boolean;
  nightBusOnly: boolean;
  userLocation: { lng: number; lat: number; accuracy?: number } | null;
  layersPanelOpen: boolean;
  favoritesPanelOpen: boolean;

  /* Theme State */
  themeMode: ThemeMode;

  /* Selection Actions */
  setSelectedItem: (item: any) => void;
  setSelectedLine: (line: Line | null) => void;
  setSelectedStop: (stop: Stop | null) => void;
  setCenterCoordinates: (coords: { lng: number; lat: number } | null) => void;
  setZoom: (zoom: number) => void;
  setSelectedJourney: (journey: any) => void;
  setCurrentJourneyStep: (step: number | null) => void;

  /* Favorites Actions */
  addFavoriteLine: (lineCode: string) => void;
  removeFavoriteLine: (lineCode: string) => void;
  addFavoriteStop: (stopId: string) => void;
  removeFavoriteStop: (stopId: string) => void;
  clearAllFavorites: () => void;

  /* Panel Actions */
  setSidebarOpen: (open: boolean) => void;
  setAlertsPanelOpen: (open: boolean) => void;
  setDashboardOpen: (open: boolean) => void;
  setAdminDashboardOpen: (open: boolean) => void;
  setRoutePlannerOpen: (open: boolean) => void;
  closeAllPanels: () => void;

  /* Layer Actions */
  toggleVehicles: () => void;
  toggleStops: () => void;
  toggleLines: () => void;
  toggleVelov: () => void;
  toggleAutopartage: () => void;
  toggleToilets: () => void;
  toggleVehiclesHeatmap: () => void;
  toggleNightBusOnly: () => void;
  setUserLocation: (loc: { lng: number; lat: number; accuracy?: number } | null) => void;
  setLayersPanelOpen: (open: boolean) => void;
  setFavoritesPanelOpen: (open: boolean) => void;

  /* Theme Actions */
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* Initial State values */
      selectedItem: null,
      selectedLine: null,
      selectedStop: null,
      centerCoordinates: { lng: 4.8357, lat: 45.7640 }, // Center of Lyon
      zoom: 12,
      selectedJourney: null,
      currentJourneyStep: null,
      
      favoriteLines: [],
      favoriteStops: [],

      sidebarOpen: false,
      alertsPanelOpen: false,
      dashboardOpen: false,
      adminDashboardOpen: false,
      routePlannerOpen: false,

      vehiclesVisible: true,
      stopsVisible: true,
      linesVisible: true,
      velovVisible: false,
      autopartageVisible: false,
      toiletsVisible: false,
      vehiclesHeatmapVisible: false,
      nightBusOnly: false,
      userLocation: null,
      layersPanelOpen: false,
      favoritesPanelOpen: false,

      themeMode: 'dark',

      /* Selection Setters */
      setSelectedItem: (item) => set({ selectedItem: item }),
      setSelectedLine: (line) => set({ selectedLine: line }),
      setSelectedStop: (stop) => set({ selectedStop: stop }),
      setCenterCoordinates: (coords) => set({ centerCoordinates: coords }),
      setZoom: (zoom) => set({ zoom }),
      setSelectedJourney: (journey) => set({ 
        selectedJourney: journey, 
        currentJourneyStep: journey ? 0 : null 
      }),
      setCurrentJourneyStep: (step) => set({ currentJourneyStep: step }),

      /* Favorites Setters */
      addFavoriteLine: (lineCode) => set((state) => ({
        favoriteLines: state.favoriteLines.includes(lineCode)
          ? state.favoriteLines
          : [...state.favoriteLines, lineCode]
      })),
      removeFavoriteLine: (lineCode) => set((state) => ({
        favoriteLines: state.favoriteLines.filter(code => code !== lineCode)
      })),
      addFavoriteStop: (stopId) => set((state) => ({
        favoriteStops: state.favoriteStops.includes(stopId)
          ? state.favoriteStops
          : [...state.favoriteStops, stopId]
      })),
      removeFavoriteStop: (stopId) => set((state) => ({
        favoriteStops: state.favoriteStops.filter(id => id !== stopId)
      })),
      clearAllFavorites: () => set({ favoriteLines: [], favoriteStops: [] }),

      /* Panel Setters */
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setAlertsPanelOpen: (open) => set({ alertsPanelOpen: open }),
      setDashboardOpen: (open) => set({ dashboardOpen: open }),
      setAdminDashboardOpen: (open) => set({ adminDashboardOpen: open }),
      setRoutePlannerOpen: (open) => set({ routePlannerOpen: open }),
      closeAllPanels: () => set({
        sidebarOpen: false,
        alertsPanelOpen: false,
        dashboardOpen: false,
        adminDashboardOpen: false,
        routePlannerOpen: false
      }),

      /* Layer Setters */
      toggleVehicles: () => set((state) => ({ vehiclesVisible: !state.vehiclesVisible })),
      toggleStops: () => set((state) => ({ stopsVisible: !state.stopsVisible })),
      toggleLines: () => set((state) => ({ linesVisible: !state.linesVisible })),
      toggleVelov: () => set((state) => ({ velovVisible: !state.velovVisible })),
      toggleAutopartage: () => set((state) => ({ autopartageVisible: !state.autopartageVisible })),
      toggleToilets: () => set((state) => ({ toiletsVisible: !state.toiletsVisible })),
      toggleVehiclesHeatmap: () => set((state) => ({ vehiclesHeatmapVisible: !state.vehiclesHeatmapVisible })),
      toggleNightBusOnly: () => set((state) => ({ nightBusOnly: !state.nightBusOnly })),
      setUserLocation: (loc) => set({ userLocation: loc }),
      setLayersPanelOpen: (open) => set({ layersPanelOpen: open }),
      setFavoritesPanelOpen: (open) => set({ favoritesPanelOpen: open }),

      /* Theme Setters */
      toggleTheme: () => set((state) => ({
        themeMode: state.themeMode === 'dark' ? 'light' : 'dark'
      })),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'lyon-transit-unified-storage',
      partialize: (state) => ({
        selectedLine: state.selectedLine,
        centerCoordinates: state.centerCoordinates,
        zoom: state.zoom,
        favoriteLines: state.favoriteLines,
        favoriteStops: state.favoriteStops,
        vehiclesVisible: state.vehiclesVisible,
        stopsVisible: state.stopsVisible,
        linesVisible: state.linesVisible,
        velovVisible: state.velovVisible,
        autopartageVisible: state.autopartageVisible,
        toiletsVisible: state.toiletsVisible,
        vehiclesHeatmapVisible: state.vehiclesHeatmapVisible,
        nightBusOnly: state.nightBusOnly,
        themeMode: state.themeMode
      }),
    }
  )
);
