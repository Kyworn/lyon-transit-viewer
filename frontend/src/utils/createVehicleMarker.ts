/**
 * Creates a modern, neon-style SVG marker for vehicles
 * @param color - The hex color of the line (e.g., "#FF0000")
 * @param mode - The transport mode (bus, metro, tram, funicular) - Used for sizing nuance
 * @returns SVG string as data URL
 */
export const createVehicleMarker = (color: string, mode: string): string => {
  // Ensure color has # prefix
  const hexColor = color.startsWith('#') ? color : `#${color}`;
  const isHeavy = ['metro', 'tram', 'funicular'].includes(mode?.toLowerCase());

  // Size adjustments based on transport mode
  const size = 64;
  const center = size / 2;
  const coreRadius = isHeavy ? 16 : 14;
  const strokeWidth = isHeavy ? 4 : 3;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Neon Glow Filter -->
        <filter id="neon-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
          <feFlood flood-color="${hexColor}" flood-opacity="0.8" result="glowColor"/>
          <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow"/>
          <feMerge>
            <feMergeNode in="softGlow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Group with rotation center -->
      <g transform="translate(${center}, ${center})">
        
        <!-- 1. Intense Outer Glow -->
        <circle cx="0" cy="0" r="${coreRadius + 2}" fill="none" stroke="${hexColor}" stroke-width="2" filter="url(#neon-glow)" opacity="0.6">
           <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite"/>
           <animate attributeName="r" values="${coreRadius + 2};${coreRadius + 6};${coreRadius + 2}" dur="1.5s" repeatCount="indefinite"/>
        </circle>

        <!-- 2. The Puck Body (Black Hole) -->
        <circle cx="0" cy="0" r="${coreRadius}" fill="#000000" stroke="${hexColor}" stroke-width="${strokeWidth}"/>
        
        <!-- 3. Inner White Ring (Detail) -->
        <circle cx="0" cy="0" r="${coreRadius - strokeWidth}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>

        <!-- 4. Direction Indicator (Arrow pointing UP) -->
        <!-- Sharp, high-contrast white arrow -->
        <path d="M -5 ${coreRadius * 0.2} L 0 ${-coreRadius * 0.6} L 5 ${coreRadius * 0.2}" fill="white" stroke="none" />
        
      </g>
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
