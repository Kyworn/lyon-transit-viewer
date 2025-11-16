import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Line, Stop } from '../types';

interface FavoritesState {
  favoriteLines: string[]; // line_sort_code
  favoriteStops: string[]; // stop id

  addFavoriteLine: (lineCode: string) => void;
  removeFavoriteLine: (lineCode: string) => void;
  isFavoriteLine: (lineCode: string) => boolean;

  addFavoriteStop: (stopId: string) => void;
  removeFavoriteStop: (stopId: string) => void;
  isFavoriteStop: (stopId: string) => boolean;

  clearAllFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteLines: [],
      favoriteStops: [],

      addFavoriteLine: (lineCode: string) => set((state) => ({
        favoriteLines: state.favoriteLines.includes(lineCode)
          ? state.favoriteLines
          : [...state.favoriteLines, lineCode]
      })),

      removeFavoriteLine: (lineCode: string) => set((state) => ({
        favoriteLines: state.favoriteLines.filter(code => code !== lineCode)
      })),

      isFavoriteLine: (lineCode: string) => get().favoriteLines.includes(lineCode),

      addFavoriteStop: (stopId: string) => set((state) => ({
        favoriteStops: state.favoriteStops.includes(stopId)
          ? state.favoriteStops
          : [...state.favoriteStops, stopId]
      })),

      removeFavoriteStop: (stopId: string) => set((state) => ({
        favoriteStops: state.favoriteStops.filter(id => id !== stopId)
      })),

      isFavoriteStop: (stopId: string) => get().favoriteStops.includes(stopId),

      clearAllFavorites: () => set({
        favoriteLines: [],
        favoriteStops: []
      })
    }),
    {
      name: 'tcl-favorites-storage', // localStorage key
    }
  )
);
