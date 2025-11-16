import { useQuery } from '@tanstack/react-query';
import { fetchStops } from '../services/api';
import { Stop } from '../types';

export const useStops = (enabled: boolean) => {
  return useQuery<Stop[], Error>({
    queryKey: ['stops'],
    queryFn: fetchStops,
    enabled,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};