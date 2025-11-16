import { useQuery } from '@tanstack/react-query';
import { fetchLines } from '../services/api';
import { Line } from '../types';

export const useLines = () => {
  return useQuery<Line[], Error>({
    queryKey: ['lines'],
    queryFn: fetchLines,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};
