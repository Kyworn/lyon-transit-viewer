import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

// Metro Icon
export const MetroIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M12 2C8 2 4 2.5 4 6V15.5C4 17.43 5.57 19 7.5 19L6 20.5V21H7.5L9.5 19H14.5L16.5 21H18V20.5L16.5 19C18.43 19 20 17.43 20 15.5V6C20 2.5 16 2 12 2M7.5 17C6.67 17 6 16.33 6 15.5S6.67 14 7.5 14 9 14.67 9 15.5 8.33 17 7.5 17M11 10H6V6H11V10M13 10V6H18V10H13M16.5 17C15.67 17 15 16.33 15 15.5S15.67 14 16.5 14 18 14.67 18 15.5 17.33 17 16.5 17Z" />
  </SvgIcon>
);

// Bus Icon
export const BusIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M18 11H6V6H18M16.5 17C15.67 17 15 16.33 15 15.5C15 14.67 15.67 14 16.5 14C17.33 14 18 14.67 18 15.5C18 16.33 17.33 17 16.5 17M7.5 17C6.67 17 6 16.33 6 15.5C6 14.67 6.67 14 7.5 14C8.33 14 9 14.67 9 15.5C9 16.33 8.33 17 7.5 17M4 16C4 16.88 4.39 17.67 5 18.22V20C5 20.55 5.45 21 6 21H7C7.55 21 8 20.55 8 20V19H16V20C16 20.55 16.45 21 17 21H18C18.55 21 19 20.55 19 20V18.22C19.61 17.67 20 16.88 20 16V6C20 2.5 16.42 2 12 2C7.58 2 4 2.5 4 6V16Z" />
  </SvgIcon>
);

// Tram Icon
export const TramIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M12 2L9 5L10 6H8L7 8H17L16 6H14L15 5L12 2M17 9H7C5.9 9 5 9.9 5 11V19C5 20.11 5.9 21 7 21H8.5L7 22.5V23H8.5L11 20.5H13L15.5 23H17V22.5L15.5 21H17C18.1 21 19 20.11 19 19V11C19 9.9 18.1 9 17 9M8.5 19C7.67 19 7 18.33 7 17.5S7.67 16 8.5 16 10 16.67 10 17.5 9.33 19 8.5 19M12 12H7V10H12V12M15.5 19C14.67 19 14 18.33 14 17.5S14.67 16 15.5 16 17 16.67 17 17.5 16.33 19 15.5 19M17 12H12V10H17V12Z" />
  </SvgIcon>
);

// Funicular Icon
export const FunicularIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M16.39 2L14.75 8H18L17 11H13.91L12 18.06L13 21H19L18 24H6L7 21H10L12 11.94L10 3L4 3L5 0H13L14.64 6H11L12 3L16.39 2M7.64 11H11.14L10.14 15H6.64L7.64 11Z" />
  </SvgIcon>
);

// Train Icon
export const TrainIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M12 2C8 2 4 2.5 4 6V15.5C4 17.43 5.57 19 7.5 19L6 20.5V21H7.5L9.5 19H14.5L16.5 21H18V20.5L16.5 19C18.43 19 20 17.43 20 15.5V6C20 2.5 16 2 12 2M7.5 17C6.67 17 6 16.33 6 15.5S6.67 14 7.5 14 9 14.67 9 15.5 8.33 17 7.5 17M11 10H6V6H11V10M13 10V6H18V10H13M16.5 17C15.67 17 15 16.33 15 15.5S15.67 14 16.5 14 18 14.67 18 15.5 17.33 17 16.5 17Z" />
  </SvgIcon>
);

// Boat Icon
export const BoatIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M20 21C18.5 21 17.2 20.8 16 20.5C14.8 20.8 13.5 21 12 21C10.5 21 9.2 20.8 8 20.5C6.8 20.8 5.5 21 4 21H3V19H4C5.7 19 7 18.5 8 18.3V8.25L6.4 8.8L6 7.8L12 5.5L18 7.8L17.6 8.8L16 8.25V18.3C17 18.5 18.3 19 20 19H21V21H20M14 9V13H10V9H14M16 16.5V18C16.7 18.2 17.6 18.4 18.5 18.5L19 18.3V9.8L16 8.7V10C16 10 15.5 12 13 12C11 12 10.5 10 10.5 10L10.4 8.6L7 9.8V18.3L7.5 18.5C8.4 18.4 9.3 18.2 10 18V16.5C10 15.7 10.7 15 11.5 15H12.5C13.3 15 14 15.7 14 16.5Z" />
  </SvgIcon>
);

// Get icon component by transport mode
export const getTransportIcon = (mode: string): React.ComponentType<SvgIconProps> => {
  const normalizedMode = mode?.toLowerCase();

  switch (normalizedMode) {
    case 'metro':
    case 'subway':
      return MetroIcon;
    case 'bus':
      return BusIcon;
    case 'tram':
    case 'tramway':
      return TramIcon;
    case 'funicular':
    case 'funiculaire':
      return FunicularIcon;
    case 'train':
    case 'rail':
      return TrainIcon;
    case 'boat':
    case 'ferry':
      return BoatIcon;
    default:
      return BusIcon; // Default fallback
  }
};
