import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SelectionState {
  selectedItem: any;
  setSelectedItem: (item: any) => void;
  selectedLine: any;
  setSelectedLine: (line: any) => void;
  centerCoordinates: { lng: number; lat: number } | null;
  setCenterCoordinates: (coords: { lng: number; lat: number } | null) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  selectedJourney: any;
  setSelectedJourney: (journey: any) => void;
  currentJourneyStep: number | null;
  setCurrentJourneyStep: (step: number | null) => void;
}

export const useSelectionStore = create<SelectionState>()(
  persist(
    (set) => ({
      selectedItem: null,
      setSelectedItem: (item) => set({ selectedItem: item }),
      selectedLine: null,
      setSelectedLine: (line) => set({ selectedLine: line }),
      centerCoordinates: null, // Don't persist center by default to avoid getting stuck? Actually user wants it.
      setCenterCoordinates: (coords) => set({ centerCoordinates: coords }),
      zoom: 12,
      setZoom: (zoom) => set({ zoom }),
      selectedJourney: null,
      setSelectedJourney: (journey) => set({ selectedJourney: journey, currentJourneyStep: journey ? 0 : null }),
      currentJourneyStep: null,
      setCurrentJourneyStep: (step) => set({ currentJourneyStep: step }),
    }),
    {
      name: 'lyon-transit-storage',
      partialize: (state) => ({
        // Only persist specific fields
        selectedLine: state.selectedLine,
        centerCoordinates: state.centerCoordinates,
        zoom: state.zoom,
        // Don't persist journeys or selected items as they might be stale
      }),
    }
  )
);