import { useQuery } from '@tanstack/react-query';
import { LineIcon } from '../types';

const fetchLineIcons = async (): Promise<LineIcon[]> => {
  const response = await fetch('/api/line-icons');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const useLineIcons = () => {
  return useQuery<LineIcon[], Error>({
    queryKey: ['lineIcons'],
    queryFn: fetchLineIcons,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};