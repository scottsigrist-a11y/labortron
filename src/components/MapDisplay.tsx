import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LatLng, CapturedArea } from '../types';

interface MapDisplayProps {
  currentLocation: LatLng | null;
  pathPoints: LatLng[];
  blueDotPosition: LatLng | null;
  isAnchored: boolean;
  anchoredDotPosition: LatLng | null;
  capturedAreas: CapturedArea[];
  candidatePolygonPoints: LatLng[];
  zoomLevel: number;
  onMapReady?: (map: L.Map) => void;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({
  currentLocation,
  pathPoints,
  blueDotPosition,
  isAnchored,
  anchoredDotPosition,
  capturedAreas,
  candidatePolygonPoints,
  zoomLevel,
  onMapReady,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layer references
  const pathOutlineLayerRef = useRef<L.Polyline | null>(null);
  const pathFillLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const blueDotMarkerRef = useRef<L.Marker | null>(null);
  const anchorLineOutlineRef = useRef<L.Polyline | null>(null);
  const anchorLineFillRef = useRef<L.Polyline | null>(null);
  const candidatePolygonRef = useRef<L.Polygon | null>(null);
  const capturedAreasLayerRef = useRef<L.FeatureGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter = currentLocation ? [currentLocation.lat, currentLocation.lng] : [37.7749, -122.4194];

    // Create Leaflet map with touch & drag enabled, no zoom control (custom gesture zoom)
    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: zoomLevel,
      zoomControl: false,
      attributionControl: true,
      minZoom: 8, // Max zoom out is 100 miles
      maxZoom: 19,
    });

    // Free OpenStreetMap Tiles (No API key, No license required)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Feature group for captured scored areas
    const capturedGroup = L.featureGroup().addTo(map);
    capturedAreasLayerRef.current = capturedGroup;

    // Outer thick black outline for the path (matches design stroke-width 14)
    pathOutlineLayerRef.current = L.polyline([], {
      color: '#000000',
      weight: 14,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 1,
    }).addTo(map);

    // Inner vibrant yellow for the path (matches design #fbbf24 stroke-width 10)
    pathFillLayerRef.current = L.polyline([], {
      color: '#FBBF24',
      weight: 10,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 1,
    }).addTo(map);

    // Candidate polygon preview layer (shaded region matching design rgba(59, 130, 246, 0.2))
    candidatePolygonRef.current = L.polygon([], {
      color: '#3B82F6',
      weight: 2,
      dashArray: '5, 5',
      fillColor: '#3B82F6',
      fillOpacity: 0.22,
    }).addTo(map);

    // Anchor line outline and fill (connects blue dot to device location with dashed blue line)
    anchorLineOutlineRef.current = L.polyline([], {
      color: '#000000',
      weight: 5,
      lineCap: 'round',
      opacity: 0.8,
    }).addTo(map);

    anchorLineFillRef.current = L.polyline([], {
      color: '#3B82F6',
      weight: 3,
      dashArray: '4, 4',
      lineCap: 'round',
      opacity: 1,
    }).addTo(map);

    // User location precision reticle marker (Custom DivIcon from Professional Polish design)
    const renderReticleHtml = (lat: number, lng: number) => `
      <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-24px, -24px); pointer-events:none;">
        <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:100%; height:2px; background-color:#ef4444;"></div>
          <div style="position:absolute; height:100%; width:2px; background-color:#ef4444;"></div>
          <div style="width:32px; height:32px; border:2px solid #ef4444; border-radius:50%; background:rgba(239,68,68,0.08);"></div>
        </div>
        <div style="margin-top:2px; background:rgba(0,0,0,0.75); color:#ffffff; font-family:monospace; font-size:9px; padding:2px 6px; border-radius:4px; backdrop-filter:blur(4px); white-space:nowrap; border:1px solid rgba(255,255,255,0.15);">
          LAT: ${lat.toFixed(4)} / LON: ${lng.toFixed(4)}
        </div>
      </div>
    `;

    const userReticleIcon = L.divIcon({
      className: 'mrbd-reticle-icon',
      html: renderReticleHtml(initialCenter[0], initialCenter[1]),
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    userMarkerRef.current = L.marker(initialCenter as L.LatLngExpression, {
      icon: userReticleIcon,
      zIndexOffset: 900,
    }) as unknown as L.CircleMarker;
    (userMarkerRef.current as any).addTo(map);

    // Blue dot with black outline marker (Custom DivIcon matching design r=10 fill=black, r=7 fill=#3b82f6)
    const blueDotIcon = L.divIcon({
      className: 'mrbd-blue-dot-icon',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #3B82F6;
          border: 3px solid #000000;
          box-shadow: 0 0 8px rgba(59,130,246,0.5);
          box-sizing: border-box;
          transform: translate(-10px, -10px);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    blueDotMarkerRef.current = L.marker(initialCenter as L.LatLngExpression, {
      icon: blueDotIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    mapRef.current = map;
    if (onMapReady) {
      onMapReady(map);
    }

    // Resize observer to ensure map tiles & center adapt dynamically to viewport / orientation
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        if (currentLocation) {
          mapRef.current.panTo([currentLocation.lat, currentLocation.lng], { animate: false });
        }
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update zoom level when prop changes while maintaining center
  useEffect(() => {
    if (mapRef.current && mapRef.current.getZoom() !== zoomLevel) {
      if (currentLocation) {
        mapRef.current.setView([currentLocation.lat, currentLocation.lng], zoomLevel, { animate: true });
      } else {
        mapRef.current.setZoom(zoomLevel, { animate: true });
      }
    }
  }, [zoomLevel, currentLocation]);

  // Update user current location and keep it strictly centered
  useEffect(() => {
    if (!mapRef.current || !currentLocation) return;
    const latLng: L.LatLngTuple = [currentLocation.lat, currentLocation.lng];

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng);
      // Update HTML with current coordinates
      const newHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-24px, -24px); pointer-events:none;">
          <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:100%; height:2px; background-color:#ef4444;"></div>
            <div style="position:absolute; height:100%; width:2px; background-color:#ef4444;"></div>
            <div style="width:32px; height:32px; border:2px solid #ef4444; border-radius:50%; background:rgba(239,68,68,0.08);"></div>
          </div>
          <div style="margin-top:2px; background:rgba(0,0,0,0.75); color:#ffffff; font-family:monospace; font-size:9px; padding:2px 6px; border-radius:4px; backdrop-filter:blur(4px); white-space:nowrap; border:1px solid rgba(255,255,255,0.15);">
            LAT: ${currentLocation.lat.toFixed(4)} / LON: ${currentLocation.lng.toFixed(4)}
          </div>
        </div>
      `;
      (userMarkerRef.current as any).setIcon(
        L.divIcon({
          className: 'mrbd-reticle-icon',
          html: newHtml,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        })
      );
    }

    // Always keep current location centered
    mapRef.current.panTo(latLng, { animate: true });
  }, [currentLocation]);

  // Update path points (Thick yellow with black outline)
  useEffect(() => {
    const latLngs: L.LatLngTuple[] = pathPoints.map((p) => [p.lat, p.lng]);
    if (pathOutlineLayerRef.current) {
      pathOutlineLayerRef.current.setLatLngs(latLngs);
    }
    if (pathFillLayerRef.current) {
      pathFillLayerRef.current.setLatLngs(latLngs);
    }
  }, [pathPoints]);

  // Update blue dot position
  useEffect(() => {
    if (!blueDotMarkerRef.current) return;
    const targetPos = isAnchored ? anchoredDotPosition : blueDotPosition;
    if (targetPos) {
      blueDotMarkerRef.current.setLatLng([targetPos.lat, targetPos.lng]);
      blueDotMarkerRef.current.setOpacity(1);
    } else {
      blueDotMarkerRef.current.setOpacity(0);
    }
  }, [blueDotPosition, isAnchored, anchoredDotPosition]);

  // Update anchor line (from blue dot to current location)
  useEffect(() => {
    if (isAnchored && anchoredDotPosition && currentLocation) {
      const linePts: L.LatLngTuple[] = [
        [anchoredDotPosition.lat, anchoredDotPosition.lng],
        [currentLocation.lat, currentLocation.lng],
      ];
      anchorLineOutlineRef.current?.setLatLngs(linePts);
      anchorLineFillRef.current?.setLatLngs(linePts);
    } else {
      anchorLineOutlineRef.current?.setLatLngs([]);
      anchorLineFillRef.current?.setLatLngs([]);
    }
  }, [isAnchored, anchoredDotPosition, currentLocation]);

  // Update candidate polygon (shaded area that would be created)
  useEffect(() => {
    if (isAnchored && candidatePolygonPoints.length >= 3) {
      const polygonCoords: L.LatLngTuple[] = candidatePolygonPoints.map((p) => [p.lat, p.lng]);
      candidatePolygonRef.current?.setLatLngs(polygonCoords);
    } else {
      candidatePolygonRef.current?.setLatLngs([]);
    }
  }, [isAnchored, candidatePolygonPoints]);

  // Update captured scored areas
  useEffect(() => {
    if (!capturedAreasLayerRef.current) return;
    capturedAreasLayerRef.current.clearLayers();

    capturedAreas.forEach((area) => {
      const coords: L.LatLngTuple[] = area.points.map((p) => [p.lat, p.lng]);
      const polygon = L.polygon(coords, {
        color: '#000000',
        weight: 3,
        fillColor: '#10B981', // Emerald green for scored territory
        fillOpacity: 0.45,
      });

      // Tooltip displaying score
      polygon.bindTooltip(`+${area.areaSqMiles.toFixed(2)} mi²`, {
        permanent: true,
        direction: 'center',
        className: 'mrbd-score-badge',
      });

      capturedAreasLayerRef.current?.addLayer(polygon);
    });
  }, [capturedAreas]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#d4d4d8]">
      <div
        ref={mapContainerRef}
        id="mrbd-map"
        className="w-full h-full relative z-0 touch-none select-none bg-black"
      />
      {/* Subtle precision grid pattern overlay from Professional Polish design */}
      <div className="absolute inset-0 pointer-events-none opacity-25 z-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mrbd-grid-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#71717a" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mrbd-grid-pattern)" />
        </svg>
      </div>
    </div>
  );
};
