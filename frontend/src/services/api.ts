import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchStops = async () => {
  const { data } = await apiClient.get('/stops');
  return data;
};

export const fetchLines = async () => {
  const { data } = await apiClient.get('/lines');
  return data;
};

export const fetchVehicles = async () => {
  const { data } = await apiClient.get('/vehicles');
  return data;
};

export const fetchAlerts = async () => {
    const { data } = await apiClient.get('/alerts');
    return data;
};

export const fetchLineIcons = async () => {
    const { data } = await apiClient.get('/line-icons');
    return data;
};

export const fetchNextPassages = async (stopId: string) => {
    if (!stopId) {
        return [];
    }
    const { data } = await apiClient.get(`/stops/${stopId}/next-passages`);
    return data;
};
