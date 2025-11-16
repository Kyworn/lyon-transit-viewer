import {create} from 'zustand';

interface SelectionState {
  selectedItem: any;
  setSelectedItem: (item: any) => void;
  selectedLine: any;
  setSelectedLine: (line: any) => void;
  centerCoordinates: { lng: number; lat: number } | null;
  setCenterCoordinates: (coords: { lng: number; lat: number } | null) => void;
  selectedJourney: any;
  setSelectedJourney: (journey: any) => void;
  currentJourneyStep: number | null;
  setCurrentJourneyStep: (step: number | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),
  selectedLine: null,
  setSelectedLine: (line) => set({ selectedLine: line }),
  centerCoordinates: null,
  setCenterCoordinates: (coords) => set({ centerCoordinates: coords }),
  selectedJourney: null,
  setSelectedJourney: (journey) => set({ selectedJourney: journey, currentJourneyStep: journey ? 0 : null }),
  currentJourneyStep: null,
  setCurrentJourneyStep: (step) => set({ currentJourneyStep: step }),
}));