/**
 * Creates a modern, neon-style SVG marker for stops
 * @param type - The type of stop (bus, tram, metro, funicular, fluvial)
 * @param colorOverride - Optional color override (typically selected line color)
 * @returns SVG string as data URL
 */
export const createStopMarker = (type: string, colorOverride?: string): string => {
  const size = 64; // Increased from 32
  const center = size / 2;

  let color = '#FFFFFF'; // Default white
  let innerRadius = 8; // Doubled
  let outerRadius = 16; // Doubled

  switch (type) {
    case 'metro':
      color = '#E30613'; // TCL Red
      innerRadius = 12;
      outerRadius = 20;
      break;
    case 'tram':
      color = '#8e44ad'; // Purple
      innerRadius = 10;
      outerRadius = 18;
      break;
    case 'funicular':
      color = '#f39c12'; // Orange
      innerRadius = 10;
      outerRadius = 18;
      break;
    case 'fluvial':
      color = '#00a3a6'; // Navigone teal
      innerRadius = 10;
      outerRadius = 18;
      break;
    case 'bus':
    default:
      color = '#FFFFFF';
      innerRadius = 6;
      outerRadius = 12;
      break;
  }

  if (colorOverride && colorOverride.trim()) {
    color = colorOverride.trim();
  }

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <g transform="translate(${center}, ${center})">
        <!-- Outer Ring (Glow) -->
        <circle cx="0" cy="0" r="${outerRadius}" fill="none" stroke="${color}" stroke-width="3" opacity="0.8" filter="url(#glow)" />
        
        <!-- Inner Dot (Solid) -->
        <circle cx="0" cy="0" r="${innerRadius}" fill="${color}" />
      </g>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const loadStopMarker = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
};
