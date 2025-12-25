import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

// SVG Body silhouette component
export const BodyMap = ({ markers = [], onAddMarker, onRemoveMarker }) => {
  const svgRef = useRef(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);

  const handleSvgClick = (e) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicking on existing marker
    const clickedMarkerIndex = markers.findIndex((m) => {
      const dx = m.x - x;
      const dy = m.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 3;
    });

    if (clickedMarkerIndex >= 0) {
      // If clicking on marker, don't add new one
      return;
    }

    onAddMarker({ x, y, id: Date.now() });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Front View */}
      <div className="flex-1">
        <p className="text-sm font-medium text-center mb-2">Vista Anteriore</p>
        <div className="relative border rounded-lg p-4 bg-slate-50">
          <svg
            ref={svgRef}
            viewBox="0 0 200 400"
            className="w-full max-w-[200px] mx-auto cursor-crosshair"
            onClick={handleSvgClick}
            data-testid="body-map-front"
          >
            {/* Human body silhouette - Front view */}
            <g fill="none" stroke="#94a3b8" strokeWidth="1.5">
              {/* Head */}
              <ellipse cx="100" cy="30" rx="25" ry="28" />
              
              {/* Neck */}
              <line x1="90" y1="58" x2="90" y2="70" />
              <line x1="110" y1="58" x2="110" y2="70" />
              
              {/* Shoulders */}
              <line x1="90" y1="70" x2="50" y2="85" />
              <line x1="110" y1="70" x2="150" y2="85" />
              
              {/* Torso */}
              <path d="M 50 85 L 50 180 Q 60 200 100 200 Q 140 200 150 180 L 150 85" />
              
              {/* Arms */}
              <path d="M 50 85 Q 35 100 30 140 Q 28 160 25 180 Q 22 195 20 210" />
              <path d="M 150 85 Q 165 100 170 140 Q 172 160 175 180 Q 178 195 180 210" />
              
              {/* Hands */}
              <ellipse cx="20" cy="215" rx="8" ry="12" />
              <ellipse cx="180" cy="215" rx="8" ry="12" />
              
              {/* Legs */}
              <path d="M 70 200 L 65 280 L 60 340 L 55 380" />
              <path d="M 130 200 L 135 280 L 140 340 L 145 380" />
              
              {/* Inner legs */}
              <path d="M 90 200 L 85 280 L 80 340 L 75 380" />
              <path d="M 110 200 L 115 280 L 120 340 L 125 380" />
              
              {/* Feet */}
              <path d="M 55 380 Q 50 395 65 395 Q 80 395 75 380" />
              <path d="M 145 380 Q 150 395 135 395 Q 120 395 125 380" />
            </g>

            {/* Lesion Markers */}
            {markers.map((marker, index) => (
              <g
                key={marker.id || index}
                className="body-map-marker"
                onMouseEnter={() => setHoveredMarker(index)}
                onMouseLeave={() => setHoveredMarker(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMarker(index);
                }}
              >
                <circle
                  cx={marker.x * 2}
                  cy={marker.y * 4}
                  r="6"
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth="2"
                />
                {hoveredMarker === index && (
                  <text
                    x={marker.x * 2 + 10}
                    y={marker.y * 4 + 4}
                    fontSize="10"
                    fill="#ef4444"
                  >
                    Rimuovi
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Back View */}
      <div className="flex-1">
        <p className="text-sm font-medium text-center mb-2">Vista Posteriore</p>
        <div className="relative border rounded-lg p-4 bg-slate-50">
          <svg
            viewBox="0 0 200 400"
            className="w-full max-w-[200px] mx-auto cursor-crosshair"
            onClick={handleSvgClick}
            data-testid="body-map-back"
          >
            {/* Human body silhouette - Back view (same as front, simplified) */}
            <g fill="none" stroke="#94a3b8" strokeWidth="1.5">
              {/* Head */}
              <ellipse cx="100" cy="30" rx="25" ry="28" />
              
              {/* Neck */}
              <line x1="90" y1="58" x2="90" y2="70" />
              <line x1="110" y1="58" x2="110" y2="70" />
              
              {/* Shoulders */}
              <line x1="90" y1="70" x2="50" y2="85" />
              <line x1="110" y1="70" x2="150" y2="85" />
              
              {/* Torso */}
              <path d="M 50 85 L 50 180 Q 60 200 100 200 Q 140 200 150 180 L 150 85" />
              
              {/* Arms */}
              <path d="M 50 85 Q 35 100 30 140 Q 28 160 25 180 Q 22 195 20 210" />
              <path d="M 150 85 Q 165 100 170 140 Q 172 160 175 180 Q 178 195 180 210" />
              
              {/* Hands */}
              <ellipse cx="20" cy="215" rx="8" ry="12" />
              <ellipse cx="180" cy="215" rx="8" ry="12" />
              
              {/* Legs */}
              <path d="M 70 200 L 65 280 L 60 340 L 55 380" />
              <path d="M 130 200 L 135 280 L 140 340 L 145 380" />
              
              {/* Inner legs */}
              <path d="M 90 200 L 85 280 L 80 340 L 75 380" />
              <path d="M 110 200 L 115 280 L 120 340 L 125 380" />
              
              {/* Feet */}
              <path d="M 55 380 Q 50 395 65 395 Q 80 395 75 380" />
              <path d="M 145 380 Q 150 395 135 395 Q 120 395 125 380" />
            </g>
          </svg>
        </div>
      </div>

      {/* Feet View */}
      <div className="flex-1">
        <p className="text-sm font-medium text-center mb-2">Piedi</p>
        <div className="relative border rounded-lg p-4 bg-slate-50">
          <svg
            viewBox="0 0 200 150"
            className="w-full max-w-[200px] mx-auto cursor-crosshair"
            onClick={handleSvgClick}
            data-testid="body-map-feet"
          >
            {/* Feet - Top view */}
            <g fill="none" stroke="#94a3b8" strokeWidth="1.5">
              {/* Labels */}
              <text x="30" y="15" fontSize="10" fill="#64748b">DX</text>
              <text x="150" y="15" fontSize="10" fill="#64748b">SX</text>
              
              {/* Right foot outline */}
              <path d="M 20 30 Q 10 50 15 90 Q 20 120 50 130 Q 70 125 70 90 Q 70 50 60 30 Q 40 20 20 30" />
              {/* Right foot toes */}
              <ellipse cx="25" cy="30" rx="5" ry="8" />
              <ellipse cx="35" cy="25" rx="4" ry="7" />
              <ellipse cx="45" cy="23" rx="4" ry="7" />
              <ellipse cx="53" cy="25" rx="3" ry="6" />
              <ellipse cx="60" cy="30" rx="3" ry="5" />
              
              {/* Left foot outline */}
              <path d="M 180 30 Q 190 50 185 90 Q 180 120 150 130 Q 130 125 130 90 Q 130 50 140 30 Q 160 20 180 30" />
              {/* Left foot toes */}
              <ellipse cx="175" cy="30" rx="5" ry="8" />
              <ellipse cx="165" cy="25" rx="4" ry="7" />
              <ellipse cx="155" cy="23" rx="4" ry="7" />
              <ellipse cx="147" cy="25" rx="3" ry="6" />
              <ellipse cx="140" cy="30" rx="3" ry="5" />
            </g>
          </svg>
        </div>
      </div>

      {/* Markers List */}
      {markers.length > 0 && (
        <div className="w-full md:w-auto">
          <p className="text-sm font-medium mb-2">Lesioni segnate ({markers.length})</p>
          <div className="space-y-2">
            {markers.map((marker, index) => (
              <div
                key={marker.id || index}
                className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm"
              >
                <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">
                  {index + 1}
                </span>
                <span className="flex-1">Lesione {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-500 hover:text-red-700"
                  onClick={() => onRemoveMarker(index)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyMap;
