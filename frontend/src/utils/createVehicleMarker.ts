/**
 * Creates an animated SVG marker for vehicles
 * @param color - The hex color of the line (e.g., "#FF0000")
 * @param mode - The transport mode (bus, metro, tram, funicular)
 * @returns SVG string as data URL
 */
export const createVehicleMarker = (color: string, mode: string): string => {
  const normalizedMode = mode?.toLowerCase();

  // Transport mode icons (simplified Material Design icons)
  const getIconPath = (mode: string): string => {
    switch (mode) {
      case 'metro':
      case 'subway':
        return 'M12 2C8 2 4 2.5 4 6V15.5C4 17.43 5.57 19 7.5 19L6 20.5V21H7.5L9.5 19H14.5L16.5 21H18V20.5L16.5 19C18.43 19 20 17.43 20 15.5V6C20 2.5 16 2 12 2M7.5 17C6.67 17 6 16.33 6 15.5S6.67 14 7.5 14 9 14.67 9 15.5 8.33 17 7.5 17M11 10H6V6H11V10M13 10V6H18V10H13M16.5 17C15.67 17 15 16.33 15 15.5S15.67 14 16.5 14 18 14.67 18 15.5 17.33 17 16.5 17Z';
      case 'tram':
      case 'tramway':
        return 'M12 2L9 5L10 6H8L7 8H17L16 6H14L15 5L12 2M17 9H7C5.9 9 5 9.9 5 11V19C5 20.11 5.9 21 7 21H8.5L7 22.5V23H8.5L11 20.5H13L15.5 23H17V22.5L15.5 21H17C18.1 21 19 20.11 19 19V11C19 9.9 18.1 9 17 9M8.5 19C7.67 19 7 18.33 7 17.5S7.67 16 8.5 16 10 16.67 10 17.5 9.33 19 8.5 19M12 12H7V10H12V12M15.5 19C14.67 19 14 18.33 14 17.5S14.67 16 15.5 16 17 16.67 17 17.5 16.33 19 15.5 19M17 12H12V10H17V12Z';
      case 'funicular':
      case 'funiculaire':
        return 'M16.39 2L14.75 8H18L17 11H13.91L12 18.06L13 21H19L18 24H6L7 21H10L12 11.94L10 3L4 3L5 0H13L14.64 6H11L12 3L16.39 2M7.64 11H11.14L10.14 15H6.64L7.64 11Z';
      case 'bus':
      default:
        return 'M18 11H6V6H18M16.5 17C15.67 17 15 16.33 15 15.5C15 14.67 15.67 14 16.5 14C17.33 14 18 14.67 18 15.5C18 16.33 17.33 17 16.5 17M7.5 17C6.67 17 6 16.33 6 15.5C6 14.67 6.67 14 7.5 14C8.33 14 9 14.67 9 15.5C9 16.33 8.33 17 7.5 17M4 16C4 16.88 4.39 17.67 5 18.22V20C5 20.55 5.45 21 6 21H7C7.55 21 8 20.55 8 20V19H16V20C16 20.55 16.45 21 17 21H18C18.55 21 19 20.55 19 20V18.22C19.61 17.67 20 16.88 20 16V6C20 2.5 16.42 2 12 2C7.58 2 4 2.5 4 6V16Z';
    }
  };

  const iconPath = getIconPath(normalizedMode);

  // Ensure color has # prefix
  const hexColor = color.startsWith('#') ? color : `#${color}`;

  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="gradient-${color.replace('#', '')}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${hexColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${hexColor};stop-opacity:0.7" />
        </linearGradient>
      </defs>

      <!-- Outer glow ring (animated pulse) -->
      <circle cx="20" cy="20" r="18" fill="none" stroke="${hexColor}" stroke-width="2" opacity="0.3">
        <animate attributeName="r" values="18;20;18" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>

      <!-- Main circle background -->
      <circle cx="20" cy="20" r="14" fill="url(#gradient-${color.replace('#', '')})" filter="url(#shadow)"/>

      <!-- Border ring -->
      <circle cx="20" cy="20" r="14" fill="none" stroke="white" stroke-width="2"/>

      <!-- Inner white circle for icon -->
      <circle cx="20" cy="20" r="11" fill="white" opacity="0.95"/>

      <!-- Transport icon -->
      <g transform="translate(8, 8) scale(0.5)">
        <path d="${iconPath}" fill="${hexColor}"/>
      </g>

      <!-- Small status indicator -->
      <circle cx="29" cy="11" r="3" fill="#4CAF50" stroke="white" stroke-width="1.5">
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Converts an SVG data URL to an HTMLImageElement
 * @param dataUrl - The SVG data URL
 * @returns Promise that resolves to an HTMLImageElement
 */
export const loadSVGMarker = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
};
