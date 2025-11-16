import { useQuery } from '@tanstack/react-query';

interface PricingZone {
  id: string;
  name: string;
  geojson: {
    type: string;
    coordinates: number[][][];
  };
}

const fetchPricingZones = async (): Promise<PricingZone[]> => {
  const response = await fetch('/api/tcl/pricing-zones');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  return data.data;
};

export const usePricingZones = () => {
  return useQuery<PricingZone[], Error>({
    queryKey: ['pricingZones'],
    queryFn: fetchPricingZones,
    staleTime: 24 * 60 * 60 * 1000, // Zones don't change often, cache for 24h
  });
};
