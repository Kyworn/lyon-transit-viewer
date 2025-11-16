import { useQuery } from '@tanstack/react-query';

interface NextPassage {
  vehicle_ref: string | null;
  line_ref: string | null;
  direction_ref: string;
  destination_name: string | null;
  delay: string;
  stop_point_name: string | null;
  expected_arrival_time: string | null;
  distance_from_stop: number | null;
  published_line_name: string;
  line_destination: string;
  scheduled_arrival_time?: string;
  route_color?: string;
  route_text_color?: string;
}

const fetchNextPassages = async (stopId: string): Promise<NextPassage[]> => {
  const response = await fetch(`/api/stops/${stopId}/next-passages`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const useNextPassages = (stopId: string | null, enabled: boolean) => {
  return useQuery<NextPassage[], Error>({
    queryKey: ['nextPassages', stopId],
    queryFn: () => fetchNextPassages(stopId!),
    enabled: enabled && !!stopId,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000, // Consider data fresh for 5 seconds
    cacheTime: 60000, // Keep in cache for 1 minute
    retry: 1, // Only retry once on failure (instead of 3 times)
    retryDelay: 500, // Wait 500ms before retry
  });
};
