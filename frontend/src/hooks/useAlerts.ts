import { useQuery } from '@tanstack/react-query';
import { fetchAlerts } from '../services/api';

export const useAlerts = () => {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
};
