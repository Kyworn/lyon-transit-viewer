import { useQuery } from '@tanstack/react-query';
import { Vehicle } from '../types';

const fetchVehicles = async (lineSortCode?: string, direction?: string): Promise<Vehicle[]> => {
  const url = new URL('/api/vehicles', window.location.origin);
  if (lineSortCode) url.searchParams.append('line_sort_code', lineSortCode);
  if (direction) url.searchParams.append('direction', direction);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const useVehicles = (lineSortCode: string | undefined, direction: string | undefined, enabled: boolean) => {
  return useQuery(['vehicles', lineSortCode, direction], () => fetchVehicles(lineSortCode, direction), {
    refetchInterval: enabled && lineSortCode ? 2000 : false, // Refresh every 2 seconds when a line is selected
    enabled,
    staleTime: 0, // Consider data stale immediately
    cacheTime: 5000, // Keep in cache for 5 seconds
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
};