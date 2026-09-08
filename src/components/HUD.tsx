import React from 'react';
import { Undo, ZoomIn, ZoomOut, Info } from 'lucide-react';

interface HUDProps {
  totalScore: number;
  isAnchored: boolean;
  currentAreaSize: number;
  onUndo: () => void;
  canUndo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenHelp: () => void;
  pathPointCount: number;
  zoomMilesEstimate: number;
  gpsStatus?: 'acquiring' | 'active' | 'denied';
}

export const HUD: React.FC<HUDProps> = ({
  totalScore,
  isAnchored,
  currentAreaSize,
  onUndo,
  canUndo,
  onZoomIn,
  onZoomOut,
  onOpenHelp,
  pathPointCount,
  zoomMilesEstimate,
  gpsStatus = 'active',
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top Header Row */}
      <div className="flex items-start justify-between w-full">
        {/* Top Left: Current Area Size (shown when anchored) or Live Status */}
        <div className="flex flex-col items-start min-h-[52px]">
          {isAnchored ? (
            <div
              id="current-area-card"
              className="bg-white/85 border border-slate-300 p-4 rounded-xl shadow-lg backdrop-blur-md animate-fade-in pointer-events-auto"
            >
              <p
                id="current-area-title"
                className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1"
              >
                Current Area Size
              </p>
              <p
                id="current-area-value"
                className="text-3xl md:text-4xl font-mono font-black text-blue-700 tracking-tight"
              >
                {currentAreaSize.toFixed(2)}{' '}
                <span className="text-lg font-sans font-bold text-blue-600">mi²</span>
              </p>
            </div>
          ) : (
            <div className="bg-white/90 border border-slate-300 px-4 py-2.5 rounded-xl shadow-md backdrop-blur-md flex items-center gap-2.5 text-xs text-slate-800 font-semibold pointer-events-auto">
              <span
                className={`w-2.5 h-2.5 rounded-full border border-black ${
                  gpsStatus === 'acquiring'
                    ? 'bg-amber-400 animate-ping'
                    : gpsStatus === 'denied'
                    ? 'bg-rose-500'
                    : 'bg-blue-500 animate-pulse'
                }`}
              />
              <span>
                {gpsStatus === 'acquiring'
                  ? 'Acquiring GPS Signal...'
                  : gpsStatus === 'denied'
                  ? 'GPS Offline • Fallback Mode'
                  : pathPointCount < 2
                  ? 'Tracking GPS: Walk to Draw Path'
                  : 'Blue Dot Synchronized (10s Cycle)'}
              </span>
            </div>
          )}
        </div>

        {/* Top Right: Score (Large bold black letters with white outline) */}
        <div className="flex flex-col items-end pointer-events-auto">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-700 drop-shadow-[0_1px_1px_rgba(255,255,255,1)] mb-0.5">
            Total Score
          </p>
          <p
            id="mrbd-score-value"
            className="text-5xl md:text-7xl font-black text-black tracking-tighter"
            style={{
              textShadow:
                '-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {totalScore.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Bottom Area: Left Technical Legend & Right Neo-Brutalist Controls */}
      <div className="flex items-end justify-between w-full pointer-events-auto gap-4">
        {/* Left Bottom Legend Card */}
        <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200 shadow-md backdrop-blur-sm flex flex-col gap-1.5 pointer-events-auto min-w-[170px]">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 bg-yellow-400 border border-black rounded-xs"></div>
            <span className="text-[11px] font-bold uppercase text-slate-800 tracking-wider">
              Target Path
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 bg-blue-500 border border-black rounded-full"></div>
            <span className="text-[11px] font-bold uppercase text-slate-800 tracking-wider">
              Sync Point
            </span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Swipe Up/Down To Zoom
            </p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              mrbd.dev/troubleshoot
            </p>
          </div>
        </div>

        {/* Right Bottom Controls */}
        <div className="flex flex-col gap-3 items-end pointer-events-auto">
          {/* Zoom Level Indicator */}
          <div className="bg-black/85 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-3 shadow-xl backdrop-blur-sm border border-white/15">
            <span className="opacity-60 text-[10px] tracking-wider uppercase">ZOOM LEVEL</span>
            <span className="font-mono font-bold text-amber-400">~{zoomMilesEstimate} mi</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              id="mrbd-undo-button"
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo point"
              className={`bg-white border-2 border-black px-5 py-2.5 rounded-2xl font-black text-xs md:text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 ${
                canUndo
                  ? 'hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none cursor-pointer text-slate-900'
                  : 'opacity-40 cursor-not-allowed text-slate-400 border-slate-400 shadow-none'
              }`}
            >
              <Undo className="w-4 h-4 stroke-[2.5]" />
              <span>Undo Point</span>
            </button>

            <button
              id="mrbd-help-button"
              type="button"
              onClick={onOpenHelp}
              title="Meta Ray-Ban Display Setup & Gesture Guide"
              className="bg-white border-2 border-black p-2.5 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none text-slate-900 cursor-pointer"
            >
              <Info className="w-5 h-5" />
            </button>

            <div className="flex items-center bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <button
                id="mrbd-zoom-in"
                type="button"
                onClick={onZoomIn}
                title="Zoom In (or Swipe Up on Glasses)"
                aria-label="Zoom in"
                className="p-2.5 hover:bg-slate-100 text-black active:bg-slate-200 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4 stroke-[2.5]" />
              </button>
              <div className="w-[1.5px] h-6 bg-black" />
              <button
                id="mrbd-zoom-out"
                type="button"
                onClick={onZoomOut}
                title="Zoom Out (or Swipe Down on Glasses, Max 100mi)"
                aria-label="Zoom out"
                className="p-2.5 hover:bg-slate-100 text-black active:bg-slate-200 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

