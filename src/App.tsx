import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LatLng, CapturedArea } from './types';
import {
  calculatePolygonAreaSqMiles,
  haversineDistanceMiles,
  interpolatePointAlongPath,
} from './utils/geo';
import { MapDisplay } from './components/MapDisplay';
import { HUD } from './components/HUD';
import { MRBDSetupModal } from './components/MRBDSetupModal';

// Zoom level 8 roughly corresponds to ~100 miles visible across screen
const MIN_ZOOM = 8;
const MAX_ZOOM = 19;
const INITIAL_ZOOM = 16;

export default function App() {
  // Device & Path State
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [pathPoints, setPathPoints] = useState<LatLng[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(INITIAL_ZOOM);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'active' | 'denied'>('acquiring');

  // Blue Dot Oscillation State
  const [blueDotPosition, setBlueDotPosition] = useState<LatLng | null>(null);
  const dotStartTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // Pinch / Anchor State
  const [isAnchored, setIsAnchored] = useState<boolean>(false);
  const [anchoredDotPosition, setAnchoredDotPosition] = useState<LatLng | null>(null);
  const [anchoredPathIndex, setAnchoredPathIndex] = useState<number>(0);

  // Scoring & Territories
  const [totalScore, setTotalScore] = useState<number>(0.0);
  const [currentAreaSize, setCurrentAreaSize] = useState<number>(0.0);
  const [candidatePolygon, setCandidatePolygon] = useState<LatLng[]>([]);
  const [capturedAreas, setCapturedAreas] = useState<CapturedArea[]>([]);

  // Setup / Help Modal State
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Touch gesture tracking for Swipes (Up = Zoom in, Down = Zoom out)
  const touchStartYRef = useRef<number | null>(null);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(MAX_ZOOM, prev + 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    // Max zoom out is 100 miles (MIN_ZOOM = 8)
    setZoomLevel((prev) => Math.max(MIN_ZOOM, prev - 1));
  }, []);

  // Approximate miles visible at current zoom
  const zoomMilesEstimate = Math.round(100 / Math.pow(2, zoomLevel - MIN_ZOOM));

  // Geolocation Setup
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('denied');
      // Default to San Francisco if unsupported
      const fallback = { lat: 37.7749, lng: -122.4194 };
      setCurrentLocation(fallback);
      setPathPoints([fallback]);
      return;
    }

    let initialResolved = false;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newCoord: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setCurrentLocation(newCoord);
        setGpsStatus('active');

        setPathPoints((prev) => {
          if (prev.length === 0) {
            return [newCoord];
          }
          const lastPoint = prev[prev.length - 1];
          // Filter tiny GPS jitter (< 3 meters / ~0.0018 miles)
          const distMiles = haversineDistanceMiles(lastPoint, newCoord);
          if (distMiles > 0.0015) {
            return [...prev, newCoord];
          }
          return prev;
        });

        initialResolved = true;
      },
      (err) => {
        console.warn('Geolocation notice:', err.message);
        if (!initialResolved) {
          setGpsStatus('denied');
          const fallback = { lat: 37.7749, lng: -122.4194 };
          setCurrentLocation(fallback);
          setPathPoints([fallback]);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 10-Second Back-and-Forth Blue Dot Animation along Path
  useEffect(() => {
    if (isAnchored || pathPoints.length < 2) {
      if (pathPoints.length === 1 && !blueDotPosition) {
        setBlueDotPosition(pathPoints[0]);
      }
      return;
    }

    const animateDot = (time: number) => {
      const elapsed = (time - dotStartTimeRef.current) % 20000; // 20s full round trip
      const progress = elapsed / 10000; // 10s one-way travel
      const fraction = progress <= 1 ? progress : 2 - progress; // Triangle wave [0, 1]

      const pointOnPath = interpolatePointAlongPath(pathPoints, fraction);
      setBlueDotPosition(pointOnPath);

      animFrameRef.current = requestAnimationFrame(animateDot);
    };

    animFrameRef.current = requestAnimationFrame(animateDot);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isAnchored, pathPoints]);

  // Compute Candidate Polygon and Area when Anchored
  useEffect(() => {
    if (!isAnchored || !anchoredDotPosition || !currentLocation) {
      setCandidatePolygon([]);
      setCurrentAreaSize(0);
      return;
    }

    // Build the candidate polygon:
    // From anchoredDotPosition, along the path to currentLocation, closed with a straight line
    const pointsAfterAnchor = pathPoints.slice(anchoredPathIndex);
    const candidateVertices: LatLng[] = [
      anchoredDotPosition,
      ...pointsAfterAnchor,
      currentLocation,
    ];

    setCandidatePolygon(candidateVertices);

    const area = calculatePolygonAreaSqMiles(candidateVertices);
    setCurrentAreaSize(area);
  }, [isAnchored, anchoredDotPosition, currentLocation, pathPoints, anchoredPathIndex]);

  // Handle Pinch / Enter / Select Gesture
  const handleSelectPinch = useCallback(() => {
    if (!isAnchored) {
      // Step 1: Anchor the blue dot
      // If path has fewer than 2 points, seed a point so user can test immediately
      let currentDot = blueDotPosition;
      if (!currentDot && currentLocation) {
        currentDot = currentLocation;
      }
      if (!currentDot) return;

      setAnchoredDotPosition(currentDot);
      setAnchoredPathIndex(Math.max(0, pathPoints.length - 1));
      setIsAnchored(true);
    } else {
      // Step 2: Second pinch - draw line from user location back to blue dot, close area, calculate score
      if (candidatePolygon.length >= 3 && currentAreaSize > 0) {
        const scoredArea = currentAreaSize;
        const newCaptured: CapturedArea = {
          id: `area-${Date.now()}`,
          points: [...candidatePolygon],
          areaSqMiles: scoredArea,
          timestamp: Date.now(),
        };

        setCapturedAreas((prev) => [...prev, newCaptured]);
        setTotalScore((prev) => Math.round((prev + scoredArea) * 100) / 100);
      }

      // Reset state for new blue dot to start moving along path again
      setIsAnchored(false);
      setAnchoredDotPosition(null);
      setCandidatePolygon([]);
      setCurrentAreaSize(0);
      dotStartTimeRef.current = performance.now(); // Reset 10s timer
    }
  }, [isAnchored, blueDotPosition, currentLocation, pathPoints, candidatePolygon, currentAreaSize]);

  // Undo button logic: removes last placed point or cancels current anchor
  const handleUndo = useCallback(() => {
    if (isAnchored) {
      // Undo anchor
      setIsAnchored(false);
      setAnchoredDotPosition(null);
      setCandidatePolygon([]);
      setCurrentAreaSize(0);
      dotStartTimeRef.current = performance.now();
      return;
    }

    if (pathPoints.length > 1) {
      setPathPoints((prev) => prev.slice(0, prev.length - 1));
    }
  }, [isAnchored, pathPoints.length]);

  // Keyboard Event Listeners for MRBD Gestures (Pinch = Enter, Swipe Up = ArrowUp, Swipe Down = ArrowDown)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelectPinch();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === 'Backspace' || e.key === 'u' || e.key === 'U') {
        handleUndo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelectPinch, handleZoomIn, handleZoomOut, handleUndo]);

  // Touch Swipe Gesture Handlers (Swipe Up = Zoom In, Swipe Down = Zoom Out)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null && e.changedTouches.length === 1) {
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      if (deltaY < -35) {
        // Swiped Up => Zoom in
        handleZoomIn();
      } else if (deltaY > 35) {
        // Swiped Down => Zoom out
        handleZoomOut();
      }
    }
    touchStartYRef.current = null;
  };

  return (
    <div
      id="mrbd-app-root"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-screen overflow-hidden bg-zinc-100 text-slate-900 font-sans select-none"
    >
      {/* 600x600 Display Frame on Desktop with High-Contrast Optical Waveguide styling */}
      <div className="relative w-full h-full">
        <MapDisplay
          currentLocation={currentLocation}
          pathPoints={pathPoints}
          blueDotPosition={blueDotPosition}
          isAnchored={isAnchored}
          anchoredDotPosition={anchoredDotPosition}
          capturedAreas={capturedAreas}
          candidatePolygonPoints={candidatePolygon}
          zoomLevel={zoomLevel}
        />

        {/* Heads Up Display (HUD) */}
        <HUD
          totalScore={totalScore}
          isAnchored={isAnchored}
          currentAreaSize={currentAreaSize}
          onUndo={handleUndo}
          canUndo={isAnchored || pathPoints.length > 1}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onOpenHelp={() => setIsHelpOpen(true)}
          pathPointCount={pathPoints.length}
          zoomMilesEstimate={zoomMilesEstimate}
          gpsStatus={gpsStatus}
        />

        {/* Setup & Troubleshooting Modal */}
        <MRBDSetupModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      </div>
    </div>
  );
}
