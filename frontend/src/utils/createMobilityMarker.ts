// Neon-style SVG markers matching the project aesthetic (cf. createVehicleMarker).
// Used for Vélo'v stations and autopartage stations.

const svgToDataUrl = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

const BIKE_PATH = `
  <circle cx="-7" cy="3" r="4.5" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="7" cy="3" r="4.5" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M -7 3 L -2 -4 L 4 -4 L 7 3 L 0 -1 L -2 -4 M 4 -4 L 5 -7 L 7 -7" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
`;

const CAR_PATH = `
  <path d="M -10 2 L -8 -3 Q -7 -5 -5 -5 L 5 -5 Q 7 -5 8 -3 L 10 2 L 10 5 L -10 5 Z" fill="white" stroke="none"/>
  <circle cx="-6" cy="5" r="2" fill="#0a0a0c" stroke="white" stroke-width="1"/>
  <circle cx="6" cy="5" r="2" fill="#0a0a0c" stroke="white" stroke-width="1"/>
`;

interface MobilityMarkerOptions {
  color: string;
  shape: 'bike' | 'car';
  pulse?: boolean;
}

export const createMobilityMarker = ({ color, shape, pulse = false }: MobilityMarkerOptions): string => {
  const size = 56;
  const c = size / 2;
  const ring = 14;
  const stroke = 2.5;
  const icon = shape === 'bike' ? BIKE_PATH : CAR_PATH;
  const filterId = `mob-glow-${shape}-${color.replace('#', '')}`;

  const pulseAnim = pulse
    ? `
      <animate attributeName="opacity" values="0.55;0.15;0.55" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="${ring + 2};${ring + 6};${ring + 2}" dur="1.6s" repeatCount="indefinite"/>
    `
    : '';

  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="${filterId}" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feFlood flood-color="${color}" flood-opacity="0.85" result="glow"/>
      <feComposite in="glow" in2="blur" operator="in" result="soft"/>
      <feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g transform="translate(${c}, ${c})">
    <circle cx="0" cy="0" r="${ring + 2}" fill="none" stroke="${color}" stroke-width="2" filter="url(#${filterId})" opacity="0.55">
      ${pulseAnim}
    </circle>
    <circle cx="0" cy="0" r="${ring}" fill="#0a0a0c" stroke="${color}" stroke-width="${stroke}"/>
    <circle cx="0" cy="0" r="${ring - stroke}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    ${icon}
  </g>
</svg>`;

  return svgToDataUrl(svg);
};

export const loadMobilityMarker = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
};
