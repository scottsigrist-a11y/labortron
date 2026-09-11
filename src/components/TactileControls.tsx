import React from 'react';
import { FocusRow } from '../types';

interface TactileControlsProps {
  currentFocus: FocusRow;
  onDirection: (direction: 'up' | 'down' | 'left' | 'right' | 'select') => void;
  onSelectRow: (row: FocusRow) => void;
  isTouchExpanded: boolean;
  onToggleExpanded: () => void;
}

export const TactileControls: React.FC<TactileControlsProps> = ({
  currentFocus,
  onDirection,
  onSelectRow,
  isTouchExpanded,
  onToggleExpanded,
}) => {
  if (!isTouchExpanded) {
    return (
      <button
        id="mrbd-toggle-hud"
        onClick={onToggleExpanded}
        className="absolute bottom-1 right-1 z-40 bg-black/80 hover:bg-neutral-900 border border-neutral-700 text-[9px] text-neutral-400 hover:text-white px-2 py-0.5 rounded shadow-lg backdrop-blur-sm transition-all"
        title="Toggle Companion Touch D-Pad"
      >
        📱 Companion D-Pad
      </button>
    );
  }

  return (
    <div
      id="mrbd-companion-panel"
      className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 border-t border-neutral-700 p-2 text-white font-mono backdrop-blur-md flex flex-col gap-1.5 shadow-2xl"
    >
      <div className="flex items-center justify-between text-[9px] text-neutral-400 px-1">
        <span className="text-emerald-400 font-bold tracking-wider">
          👓 MRBD COMPANION D-PAD
        </span>
        <button
          onClick={onToggleExpanded}
          className="text-neutral-400 hover:text-white underline text-[9px]"
        >
          [Minimize to HUD]
        </button>
      </div>

      {/* Row shortcuts */}
      <div className="flex items-center justify-between gap-1 text-[8px]">
        {(['MAP', 'BUILD', 'UPGRADE', 'RESEARCH', 'WAVE'] as FocusRow[]).map((row) => {
          const isActive = currentFocus === row;
          return (
            <button
              key={row}
              onClick={() => onSelectRow(row)}
              className={`flex-1 py-1 rounded border font-bold text-center transition-all ${
                isActive
                  ? 'bg-amber-400 text-black border-amber-400 shadow'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
              }`}
            >
              {row}
            </button>
          );
        })}
      </div>

      {/* Directional Pad */}
      <div className="flex items-center justify-center gap-2">
        <div className="grid grid-cols-3 gap-1 w-[130px]">
          <div></div>
          <button
            onClick={() => onDirection('up')}
            className="h-8 bg-neutral-800 active:bg-amber-400 active:text-black border border-neutral-600 rounded flex items-center justify-center text-xs font-bold shadow"
            title="Up (Row or Map Cursor)"
          >
            ▲
          </button>
          <div></div>

          <button
            onClick={() => onDirection('left')}
            className="h-8 bg-neutral-800 active:bg-amber-400 active:text-black border border-neutral-600 rounded flex items-center justify-center text-xs font-bold shadow"
            title="Left (Map Cursor or Cycle Item)"
          >
            ◀
          </button>
          <button
            onClick={() => onDirection('select')}
            className="h-8 bg-amber-400 hover:bg-amber-300 active:bg-white text-black border border-amber-300 rounded flex items-center justify-center text-[10px] font-black shadow"
            title="Enter / Select Action"
          >
            ENTER
          </button>
          <button
            onClick={() => onDirection('right')}
            className="h-8 bg-neutral-800 active:bg-amber-400 active:text-black border border-neutral-600 rounded flex items-center justify-center text-xs font-bold shadow"
            title="Right (Map Cursor or Cycle Item)"
          >
            ▶
          </button>

          <div></div>
          <button
            onClick={() => onDirection('down')}
            className="h-8 bg-neutral-800 active:bg-amber-400 active:text-black border border-neutral-600 rounded flex items-center justify-center text-xs font-bold shadow"
            title="Down (Row or Map Cursor)"
          >
            ▼
          </button>
          <div></div>
        </div>

        <div className="flex-1 text-[8px] text-neutral-400 leading-tight space-y-0.5 border-l border-neutral-700 pl-2">
          <div><b className="text-white">Temple Swipes:</b> Forward/Back (◀/▶)</div>
          <div><b className="text-white">Temple Tap:</b> Enter / Build / Send</div>
          <div><b className="text-white">Temple Vertical:</b> Up/Down rows (▲/▼)</div>
        </div>
      </div>
    </div>
  );
};
