import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TowerType,
  PlacedTower,
  CreepInstance,
  Projectile,
  HitEffect,
  FocusRow,
  GameStatus,
  WaveState,
  ResearchState,
  ResearchItem,
} from './types';
import {
  SCREEN_SIZE,
  GRID_SIZE,
  CELL_SIZE,
  CELL_GAP,
  GRID_PADDING,
  TOWERS,
  MAP_PATH,
  PATH_SET,
  canBuildAt,
  gridToPixel,
  getWaveModifiers,
  generateWaveCreeps,
} from './constants';
import {
  playBeep,
  playMoveTone,
  playRowTone,
  playBuildTone,
  playUpgradeTone,
  playSellTone,
  playResearchTone,
  playWaveTone,
  playErrorBuzz,
  playHitTone,
  playVictoryJingle,
  playDefeatJingle,
  getAudioContext,
} from './utils/audio';
import { TactileControls } from './components/TactileControls';

interface GameEngineState {
  towers: PlacedTower[];
  creeps: CreepInstance[];
  projectiles: Projectile[];
  hitEffects: HitEffect[];
  spawnQueue: Array<ReturnType<typeof generateWaveCreeps>[0]>;
  spawnTimer: number;
  nextId: number;
  wave: number;
  gold: number;
  lives: number;
  wood: number;
  interestLvl: number;
  research: ResearchState;
  score: number;
  cursor: { x: number; y: number };
  totalGoldEarned: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // HUD and Reactive State
  const [gold, setGold] = useState<number>(40);
  const [lives, setLives] = useState<number>(20);
  const [wave, setWave] = useState<number>(1);
  const [wood, setWood] = useState<number>(0);
  const [interestLvl, setInterestLvl] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('start');
  const [researchState, setResearchState] = useState<ResearchState>({
    water: 0,
    earth: 0,
    fire: 0,
    combo: 0,
  });

  // D-Pad and Focus navigation
  const [focusRow, setFocusRow] = useState<FocusRow>('MAP');
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 5, y: 5 });
  const [buildIndex, setBuildIndex] = useState<number>(0);
  const [upgradeActionIdx, setUpgradeActionIdx] = useState<number>(0); // 0: upgrade, 1: sell
  const [researchIndex, setResearchIndex] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>(
    'MAP: Arrows move cursor 12x12 • Enter to Build/Upgrade'
  );
  const [waveStatus, setWaveStatus] = useState<WaveState>('idle');
  const [showCompanionControls, setShowCompanionControls] = useState<boolean>(false);

  // Mutable Game Engine Reference
  const engineRef = useRef<GameEngineState>({
    towers: [],
    creeps: [],
    projectiles: [],
    hitEffects: [],
    spawnQueue: [],
    spawnTimer: 0,
    nextId: 1,
    wave: 1,
    gold: 40,
    lives: 20,
    wood: 0,
    interestLvl: 0,
    research: { water: 0, earth: 0, fire: 0, combo: 0 },
    score: 0,
    cursor: { x: 5, y: 5 },
    totalGoldEarned: 40,
  });

  // Touch gesture tracking for glasses temple swipes
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Unlocked towers list
  const getUnlockedTowers = useCallback(() => {
    const res = engineRef.current.research;
    const list = [TOWERS.arrow, TOWERS.cannon, TOWERS.air];
    if (res.water) list.push(TOWERS.water);
    if (res.earth) list.push(TOWERS.earth);
    if (res.fire) list.push(TOWERS.fire);
    if (res.combo) list.push(TOWERS.combo);
    return list;
  }, []);

  // Research items list
  const getResearchItems = useCallback((): ResearchItem[] => {
    const res = engineRef.current.research;
    const w = engineRef.current.wood;
    const items: ResearchItem[] = [];

    if (!res.water) {
      items.push({
        key: 'water',
        label: 'Water',
        cost: 1,
        available: w >= 1,
        desc: 'Slow 40% 2s',
        owned: false,
      });
    }
    if (!res.earth) {
      items.push({
        key: 'earth',
        label: 'Earth',
        cost: 1,
        available: w >= 1,
        desc: 'High dmg 40',
        owned: false,
      });
    }
    if (!res.fire) {
      items.push({
        key: 'fire',
        label: 'Fire',
        cost: 1,
        available: w >= 1,
        desc: 'Splash fire',
        owned: false,
      });
    }
    if (engineRef.current.interestLvl < 5) {
      const cur = 5 + engineRef.current.interestLvl * 2;
      const next = 7 + engineRef.current.interestLvl * 2;
      items.push({
        key: 'interest',
        label: `Int ${cur}%→${next}%`,
        cost: 1,
        available: w >= 1,
        desc: 'Max 15% int',
        owned: false,
      });
    }
    if (res.water && res.earth && res.fire && !res.combo) {
      items.push({
        key: 'combo',
        label: 'Rocket',
        cost: 1,
        available: w >= 1,
        desc: 'Ultimate 80 dmg',
        owned: false,
      });
    }
    if (items.length === 0) {
      items.push({
        key: 'none',
        label: 'All Researched',
        cost: 0,
        available: false,
        desc: 'Max tech reached',
        owned: true,
      });
    }
    return items;
  }, []);

  // Sync React state with engine
  const syncState = useCallback(() => {
    const eng = engineRef.current;
    setGold(eng.gold);
    setLives(eng.lives);
    setWave(eng.wave);
    setWood(eng.wood);
    setInterestLvl(eng.interestLvl);
    setScore(eng.score);
    setResearchState({ ...eng.research });
    setCursor({ ...eng.cursor });
  }, []);

  // Restart / Start Game
  const restartGame = useCallback(() => {
    getAudioContext();
    engineRef.current = {
      towers: [],
      creeps: [],
      projectiles: [],
      hitEffects: [],
      spawnQueue: [],
      spawnTimer: 0,
      nextId: 1,
      wave: 1,
      gold: 40,
      lives: 20,
      wood: 0,
      interestLvl: 0,
      research: { water: 0, earth: 0, fire: 0, combo: 0 },
      score: 0,
      cursor: { x: 5, y: 5 },
      totalGoldEarned: 40,
    };
    setGameStatus('playing');
    setWaveStatus('idle');
    setFocusRow('MAP');
    setBuildIndex(0);
    setUpgradeActionIdx(0);
    setResearchIndex(0);
    setStatusMsg('MAP [5,5] - Arrows move cursor • Enter → Build/Upgrade');
    syncState();
    playBeep(520, 0.1, 0.1);
  }, [syncState]);

  // Send Wave Action
  const sendWave = useCallback((): boolean => {
    const eng = engineRef.current;
    if (eng.spawnQueue.length > 0 || waveStatus !== 'idle') return false;

    const w = eng.wave;
    const creeps = generateWaveCreeps(w);
    eng.spawnQueue = [...creeps];
    eng.spawnTimer = 0;
    setWaveStatus('spawning');
    setStatusMsg(`Wave ${w} sent - ${creeps.length} creeps incoming`);
    playWaveTone();
    setFocusRow('MAP');
    return true;
  }, [waveStatus]);

  // Build Tower Action
  const buildTower = useCallback(
    (type: TowerType): boolean => {
      const eng = engineRef.current;
      const cfg = TOWERS[type];
      const { x, y } = eng.cursor;

      if (!canBuildAt(x, y, eng.towers)) {
        setStatusMsg(`Can't build at [${x},${y}]`);
        playErrorBuzz();
        return false;
      }
      if (eng.gold < cfg.cost) {
        setStatusMsg(`Need ${cfg.cost}g (have ${eng.gold}g)`);
        playErrorBuzz();
        return false;
      }

      eng.gold -= cfg.cost;
      const newTower: PlacedTower = {
        id: eng.nextId++,
        type,
        x,
        y,
        level: 0,
        damage: cfg.damage,
        range: cfg.range,
        fireRate: cfg.fireRate,
        splash: cfg.splash,
        cooldown: 0,
        invested: cfg.cost,
        kills: 0,
      };

      eng.towers.push(newTower);
      setStatusMsg(`Built ${cfg.name} at [${x},${y}] - Up→Map • Down→Upgrade`);
      playBuildTone();
      syncState();
      return true;
    },
    [syncState]
  );

  // Upgrade Tower Action
  const upgradeTower = useCallback(() => {
    const eng = engineRef.current;
    const tower = eng.towers.find((t) => t.x === eng.cursor.x && t.y === eng.cursor.y);
    if (!tower) {
      setStatusMsg('No tower at cursor');
      playErrorBuzz();
      return;
    }
    if (tower.level >= 3) {
      setStatusMsg('Tower already MAX Level 4');
      playErrorBuzz();
      return;
    }

    const cfg = TOWERS[tower.type];
    const costMult = [0.6, 1.0, 1.6][tower.level];
    const cost = Math.floor(cfg.cost * costMult);

    if (eng.gold < cost) {
      setStatusMsg(`Need ${cost}g for Lv${tower.level + 2}`);
      playErrorBuzz();
      return;
    }

    eng.gold -= cost;
    tower.invested += cost;
    tower.level++;
    tower.damage *= 1.5;
    tower.range *= 1.15;
    tower.fireRate *= 0.87;

    setStatusMsg(`Upgraded to ${cfg.name} Lv${tower.level + 1}!`);
    playUpgradeTone();
    syncState();
  }, [syncState]);

  // Sell Tower Action
  const sellTower = useCallback(() => {
    const eng = engineRef.current;
    const idx = eng.towers.findIndex((t) => t.x === eng.cursor.x && t.y === eng.cursor.y);
    if (idx < 0) {
      setStatusMsg('No tower to sell at cursor');
      playErrorBuzz();
      return;
    }

    const tower = eng.towers[idx];
    const refund = Math.floor(tower.invested * 0.7);
    eng.gold += refund;
    eng.towers.splice(idx, 1);

    setStatusMsg(`Sold for +${refund}g`);
    playSellTone();
    syncState();
  }, [syncState]);

  // Perform Research Action
  const performResearch = useCallback(
    (key: string) => {
      const eng = engineRef.current;
      if (key === 'none') {
        setStatusMsg('All research complete');
        playErrorBuzz();
        return;
      }
      if (eng.wood < 1) {
        setStatusMsg('Need 1 wood (earned on wave 7/14/21/28/35)');
        playErrorBuzz();
        return;
      }

      if (key === 'interest') {
        if (eng.interestLvl >= 5) {
          setStatusMsg('Interest already at maximum 15%');
          return;
        }
        eng.wood--;
        eng.interestLvl++;
        setStatusMsg(`Interest upgraded to ${5 + eng.interestLvl * 2}%`);
      } else if (key === 'water' || key === 'earth' || key === 'fire' || key === 'combo') {
        if (eng.research[key]) {
          setStatusMsg('Already researched');
          return;
        }
        if (key === 'combo' && !(eng.research.water && eng.research.earth && eng.research.fire)) {
          setStatusMsg('Need Water, Earth, and Fire unlocked first!');
          playErrorBuzz();
          return;
        }
        eng.wood--;
        eng.research[key] = 1;
        setStatusMsg(`${key.toUpperCase()} tower unlocked!`);
      }

      playResearchTone();
      syncState();
    },
    [syncState]
  );

  // Directional Input Handler (Used by keyboard, touch gestures, postMessage, and companion D-pad)
  const handleDirection = useCallback(
    (action: 'up' | 'down' | 'left' | 'right' | 'select') => {
      getAudioContext();

      if (gameStatus === 'start' || gameStatus === 'gameover' || gameStatus === 'win') {
        if (action === 'select') {
          restartGame();
        }
        return;
      }

      const rows: FocusRow[] = ['BUILD', 'UPGRADE', 'RESEARCH', 'WAVE'];

      const inspectMapCell = (cx: number, cy: number) => {
        syncState();
        const hasTower = engineRef.current.towers.some((t) => t.x === cx && t.y === cy);
        if (PATH_SET.has(`${cx},${cy}`)) {
          setStatusMsg(`MAP [${cx},${cy}] Path - blocked`);
        } else if (hasTower) {
          setStatusMsg(`MAP [${cx},${cy}] Tower - Enter → UPGRADE`);
        } else {
          setStatusMsg(`MAP [${cx},${cy}] Grass - Enter → BUILD`);
        }
      };

      // MAP FOCUS MODE
      if (focusRow === 'MAP') {
        if (action === 'up') {
          engineRef.current.cursor.y = Math.max(0, engineRef.current.cursor.y - 1);
          inspectMapCell(engineRef.current.cursor.x, engineRef.current.cursor.y);
          playMoveTone();
        } else if (action === 'down') {
          engineRef.current.cursor.y = Math.min(GRID_SIZE - 1, engineRef.current.cursor.y + 1);
          inspectMapCell(engineRef.current.cursor.x, engineRef.current.cursor.y);
          playMoveTone();
        } else if (action === 'left') {
          engineRef.current.cursor.x = Math.max(0, engineRef.current.cursor.x - 1);
          inspectMapCell(engineRef.current.cursor.x, engineRef.current.cursor.y);
          playMoveTone();
        } else if (action === 'right') {
          engineRef.current.cursor.x = Math.min(GRID_SIZE - 1, engineRef.current.cursor.x + 1);
          inspectMapCell(engineRef.current.cursor.x, engineRef.current.cursor.y);
          playMoveTone();
        } else if (action === 'select') {
          const eng = engineRef.current;
          const { x, y } = eng.cursor;
          if (PATH_SET.has(`${x},${y}`)) {
            setStatusMsg(`Path [${x},${y}] blocked - move cursor to grass`);
            playErrorBuzz();
            return;
          }
          const existingTower = eng.towers.find((t) => t.x === x && t.y === y);
          if (existingTower) {
            setFocusRow('UPGRADE');
            setUpgradeActionIdx(0);
            setStatusMsg(
              `${TOWERS[existingTower.type].name} Lv${existingTower.level + 1} - ◀ ▶ Up/Sell • Enter • Down→Res • Up→Build`
            );
            playRowTone();
          } else {
            if (!canBuildAt(x, y, eng.towers)) {
              setStatusMsg(`Cannot build at [${x},${y}]`);
              playErrorBuzz();
              return;
            }
            setFocusRow('BUILD');
            setBuildIndex(0);
            setStatusMsg(
              `BUILD at [${x},${y}] - ◀ ▶ choose • Enter build • Down→Upgrade • Up→Map`
            );
            playRowTone();
          }
        }
        return;
      }

      // LOWER DRAWER ROWS NAVIGATION
      if (rows.includes(focusRow)) {
        const curIdx = rows.indexOf(focusRow);

        if (action === 'down') {
          if (curIdx < rows.length - 1) {
            const nextRow = rows[curIdx + 1];
            setFocusRow(nextRow);
            if (nextRow === 'UPGRADE') setStatusMsg('UPGRADE: ◀ ▶ Up/Sell • Enter exec • Up→Build • Down→Res');
            if (nextRow === 'RESEARCH') setStatusMsg('RESEARCH: ◀ ▶ choose • Enter tech • Up→Upg • Down→Wave');
            if (nextRow === 'WAVE') setStatusMsg('WAVE: Enter sends wave → Map • Up→Res • Down→Map');
          } else {
            setFocusRow('MAP');
            const { x, y } = engineRef.current.cursor;
            setStatusMsg(`MAP [${x},${y}] - Enter to Build/Upgrade • Arrows move`);
          }
          playRowTone();
          return;
        }

        if (action === 'up') {
          if (curIdx > 0) {
            const prevRow = rows[curIdx - 1];
            setFocusRow(prevRow);
            if (prevRow === 'BUILD') setStatusMsg('BUILD: ◀ ▶ choose • Enter build • Up→Map • Down→Upg');
            if (prevRow === 'UPGRADE') setStatusMsg('UPGRADE: ◀ ▶ Up/Sell • Enter exec • Up→Build • Down→Res');
            if (prevRow === 'RESEARCH') setStatusMsg('RESEARCH: ◀ ▶ choose • Enter tech • Up→Upg • Down→Wave');
            if (prevRow === 'WAVE') setStatusMsg('WAVE: Enter sends wave • Up→Res • Down→Map');
          } else {
            setFocusRow('MAP');
            const { x, y } = engineRef.current.cursor;
            setStatusMsg(`MAP [${x},${y}] - Enter to Build/Upgrade • Arrows move`);
          }
          playRowTone();
          return;
        }

        if (focusRow === 'BUILD') {
          const unlocked = getUnlockedTowers();
          if (action === 'left') {
            setBuildIndex((prev) => (prev - 1 + unlocked.length) % unlocked.length);
            playMoveTone();
          } else if (action === 'right') {
            setBuildIndex((prev) => (prev + 1) % unlocked.length);
            playMoveTone();
          } else if (action === 'select') {
            if (unlocked.length === 0) {
              setStatusMsg('No towers unlocked');
              playErrorBuzz();
              return;
            }
            const targetTower = unlocked[buildIndex % unlocked.length];
            buildTower(targetTower.type);
          }
          return;
        }

        if (focusRow === 'UPGRADE') {
          if (action === 'left' || action === 'right') {
            setUpgradeActionIdx((prev) => (prev === 0 ? 1 : 0));
            playMoveTone();
          } else if (action === 'select') {
            if (upgradeActionIdx === 0) {
              upgradeTower();
            } else {
              sellTower();
            }
          }
          return;
        }

        if (focusRow === 'RESEARCH') {
          const items = getResearchItems();
          if (action === 'left') {
            setResearchIndex((prev) => (prev - 1 + items.length) % items.length);
            playMoveTone();
          } else if (action === 'right') {
            setResearchIndex((prev) => (prev + 1) % items.length);
            playMoveTone();
          } else if (action === 'select') {
            const item = items[researchIndex % items.length];
            if (item) {
              performResearch(item.key);
            }
          }
          return;
        }

        if (focusRow === 'WAVE') {
          if (action === 'select') {
            if (waveStatus === 'idle') {
              if (sendWave()) {
                setFocusRow('MAP');
                const { x, y } = engineRef.current.cursor;
                setStatusMsg(`Wave sent - watching MAP [${x},${y}] • Arrows move`);
              }
            } else {
              setStatusMsg('Wave in progress - please wait');
              playErrorBuzz();
            }
          } else if (action === 'left' || action === 'right') {
            playMoveTone();
          }
          return;
        }
      }
    },
    [
      gameStatus,
      focusRow,
      buildIndex,
      upgradeActionIdx,
      researchIndex,
      waveStatus,
      restartGame,
      sendWave,
      buildTower,
      upgradeTower,
      sellTower,
      performResearch,
      getUnlockedTowers,
      getResearchItems,
      syncState,
    ]
  );

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Enter',
          ' ',
          'w',
          's',
          'a',
          'd',
          'W',
          'S',
          'A',
          'D',
        ].includes(k)
      ) {
        e.preventDefault();
      }

      if (k === 'ArrowUp' || k === 'w' || k === 'W') handleDirection('up');
      else if (k === 'ArrowDown' || k === 's' || k === 'S') handleDirection('down');
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') handleDirection('left');
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') handleDirection('right');
      else if (k === 'Enter' || k === ' ' || k === 'Select' || k === 'OK') handleDirection('select');
      else if (k === 'Escape' || k === 'Backspace') {
        setFocusRow('MAP');
        setStatusMsg('Returned to MAP');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDirection]);

  // Temple Touchpad Gestures for Meta Ray-Ban Glasses
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: performance.now(),
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const dt = performance.now() - touchStartRef.current.time;
      touchStartRef.current = null;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Tap on temple
      if (absX < 20 && absY < 20 && dt < 400) {
        handleDirection('select');
        return;
      }

      // Swipe on temple
      if (absX > 30 && absX > absY) {
        if (dx > 0) handleDirection('right'); // Swipe forward
        else handleDirection('left'); // Swipe backward
      } else if (absY > 30 && absY > absX) {
        if (dy > 0) handleDirection('down'); // Swipe down
        else handleDirection('up'); // Swipe up
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleDirection]);

  // Window postMessage event bridge (Meta View App / Herald Harness)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;

        const cmd = data.type || data.action || data.command;
        if (cmd === 'MRBD_KEY' || cmd === 'KEY_DOWN') {
          if (data.key === 'ArrowUp') handleDirection('up');
          if (data.key === 'ArrowDown') handleDirection('down');
          if (data.key === 'ArrowLeft') handleDirection('left');
          if (data.key === 'ArrowRight') handleDirection('right');
          if (data.key === 'Enter') handleDirection('select');
        } else if (cmd === 'dpad') {
          if (data.direction === 'up') handleDirection('up');
          if (data.direction === 'down') handleDirection('down');
          if (data.direction === 'left') handleDirection('left');
          if (data.direction === 'right') handleDirection('right');
          if (data.direction === 'select') handleDirection('select');
        } else if (cmd === 'tap') {
          handleDirection('select');
        }
      } catch {
        // Ignore unparseable messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleDirection]);

  // Main Game Loop (Physics, Combat, Projectiles, Spawning, Canvas 2D)
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const eng = engineRef.current;

      // 1. Handle Creep Spawning
      if (eng.spawnQueue.length > 0) {
        eng.spawnTimer -= dt;
        if (eng.spawnTimer <= 0) {
          const spec = eng.spawnQueue.shift()!;
          const startPt = MAP_PATH[0];
          const startPx = gridToPixel(startPt.x, startPt.y);

          eng.creeps.push({
            id: eng.nextId++,
            spec,
            hp: spec.hp,
            maxHp: spec.hp,
            speed: spec.speed,
            baseSpeed: spec.speed,
            pathPos: 0,
            x: startPx.px,
            y: startPx.py,
            isAir: spec.isAir,
            isImmune: spec.isImmune,
            isBoss: spec.isBoss,
            slowTimer: 0,
            alive: true,
          });

          eng.spawnTimer = spec.isBoss ? 1.0 : 0.45;
          if (eng.spawnQueue.length === 0) {
            setWaveStatus('active');
          }
        }
      }

      // 2. Update Creeps along Path
      for (let i = eng.creeps.length - 1; i >= 0; i--) {
        const creep = eng.creeps[i];
        if (!creep.alive) continue;

        if (creep.slowTimer > 0) {
          creep.slowTimer -= dt;
          creep.speed = creep.baseSpeed * 0.6;
        } else {
          creep.speed = creep.baseSpeed;
        }

        // Move along path
        creep.pathPos += creep.speed * dt * 2.5;
        const pIdx = Math.floor(creep.pathPos);
        const frac = creep.pathPos - pIdx;

        if (pIdx >= MAP_PATH.length - 1) {
          // Creep leaked!
          creep.alive = false;
          eng.lives--;
          eng.gold = Math.max(0, eng.gold - 1);
          playBeep(180, 0.15, 0.15);

          if (eng.lives <= 0) {
            setGameStatus('gameover');
            playDefeatJingle();
            syncState();
            return;
          }
          syncState();
          continue;
        }

        const p1 = MAP_PATH[pIdx];
        const p2 = MAP_PATH[pIdx + 1];
        const px1 = gridToPixel(p1.x, p1.y);
        const px2 = gridToPixel(p2.x, p2.y);

        creep.x = px1.px + (px2.px - px1.px) * frac;
        creep.y = px1.py + (px2.py - px1.py) * frac;
      }

      // 3. Tower Targeting and Firing
      for (const tower of eng.towers) {
        tower.cooldown -= dt;
        if (tower.cooldown > 0) continue;

        const towerPos = gridToPixel(tower.x, tower.y);
        const rangePixels = tower.range * (CELL_SIZE + CELL_GAP);

        // Find best target (furthest along path in range)
        let bestTarget: CreepInstance | null = null;
        let maxPathPos = -1;

        for (const creep of eng.creeps) {
          if (!creep.alive) continue;

          // Check target compatibility
          const cfg = TOWERS[tower.type];
          if (cfg.target === 'ground' && creep.isAir) continue;
          if (cfg.target === 'air' && !creep.isAir) continue;

          const dx = creep.x - towerPos.px;
          const dy = creep.y - towerPos.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= rangePixels && creep.pathPos > maxPathPos) {
            maxPathPos = creep.pathPos;
            bestTarget = creep;
          }
        }

        if (bestTarget) {
          tower.cooldown = tower.fireRate;
          eng.projectiles.push({
            id: eng.nextId++,
            x: towerPos.px,
            y: towerPos.py,
            targetCreepId: bestTarget.id,
            targetX: bestTarget.x,
            targetY: bestTarget.y,
            speed: tower.type === 'cannon' ? 240 : 380,
            damage: tower.damage,
            splash: tower.splash,
            color: TOWERS[tower.type].color,
            towerType: tower.type,
            slow: TOWERS[tower.type].slow || 0,
          });
        }
      }

      // 4. Update Projectiles
      for (let i = eng.projectiles.length - 1; i >= 0; i--) {
        const proj = eng.projectiles[i];
        const target = eng.creeps.find((c) => c.id === proj.targetCreepId && c.alive);
        const targetX = target ? target.x : proj.targetX;
        const targetY = target ? target.y : proj.targetY;

        const dx = targetX - proj.x;
        const dy = targetY - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = proj.speed * dt;

        if (dist <= step || dist < 6) {
          // Hit target!
          eng.projectiles.splice(i, 1);
          eng.hitEffects.push({
            x: targetX,
            y: targetY,
            color: proj.color,
            radius: proj.splash > 0 ? proj.splash * CELL_SIZE : 8,
            life: 0.15,
          });
          playHitTone();

          const splashRadius = proj.splash * (CELL_SIZE + CELL_GAP);

          for (const creep of eng.creeps) {
            if (!creep.alive) continue;
            const cdx = creep.x - targetX;
            const cdy = creep.y - targetY;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);

            if (cdist <= (splashRadius || 8)) {
              creep.hp -= proj.damage;
              if (proj.slow > 0 && !creep.isImmune) {
                creep.slowTimer = proj.slow;
              }

              if (creep.hp <= 0 && creep.alive) {
                creep.alive = false;
                const reward = creep.isBoss ? 15 : 2;
                eng.gold += reward;
                eng.score += reward;
                eng.totalGoldEarned += reward;
                syncState();
              }
            }
          }
        } else {
          proj.x += (dx / dist) * step;
          proj.y += (dy / dist) * step;
        }
      }

      // 5. Update Hit Effects
      for (let i = eng.hitEffects.length - 1; i >= 0; i--) {
        eng.hitEffects[i].life -= dt;
        if (eng.hitEffects[i].life <= 0) {
          eng.hitEffects.splice(i, 1);
        }
      }

      // 6. Clean up dead creeps and check wave end
      eng.creeps = eng.creeps.filter((c) => c.alive);

      if (eng.spawnQueue.length === 0 && eng.creeps.length === 0 && waveStatus !== 'idle') {
        // Wave Completed!
        setWaveStatus('idle');

        // Award Interest
        const interestRate = 0.05 + eng.interestLvl * 0.02;
        const interestGold = Math.floor(eng.gold * interestRate);
        eng.gold += interestGold;

        // Check Wood Reward (every 7 waves)
        if (eng.wave % 7 === 0) {
          eng.wood++;
          setStatusMsg(
            `Wave ${eng.wave} CLEAR! Earned +${interestGold}g interest & +1 WOOD!`
          );
          playResearchTone();
        } else {
          setStatusMsg(`Wave ${eng.wave} CLEAR! Earned +${interestGold}g interest.`);
          playBeep(600, 0.1, 0.15);
        }

        if (eng.wave >= 39) {
          setGameStatus('win');
          playVictoryJingle();
          syncState();
          return;
        }

        eng.wave++;
        syncState();
      }

      // 7. Render Canvas 2D
      const cvs = canvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext('2d');
        if (ctx) {
          // Clear background (Pitch black for optical display)
          ctx.fillStyle = '#0a0f1d';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          // Draw Grid & Map Tiles
          for (let gy = 0; gy < GRID_SIZE; gy++) {
            for (let gx = 0; gx < GRID_SIZE; gx++) {
              const isPath = PATH_SET.has(`${gx},${gy}`);
              const px = GRID_PADDING + gx * (CELL_SIZE + CELL_GAP);
              const py = GRID_PADDING + gy * (CELL_SIZE + CELL_GAP);

              if (isPath) {
                ctx.fillStyle = '#d6b48a';
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                if ((gx + gy) % 3 === 0) {
                  ctx.fillStyle = '#c19a6b';
                  ctx.fillRect(px + 4, py + 4, 3, 3);
                }
              } else {
                const alt = (gx + gy) % 2 === 0;
                ctx.fillStyle = alt ? '#2d6a4f' : '#40916c';
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
              }
            }
          }

          // Draw Path Guide Line
          ctx.strokeStyle = '#b08968';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let p = 0; p < MAP_PATH.length; p++) {
            const pt = gridToPixel(MAP_PATH[p].x, MAP_PATH[p].y);
            if (p === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          }
          ctx.stroke();

          // Draw Placed Towers
          for (const t of eng.towers) {
            const pos = gridToPixel(t.x, t.y);
            const cfg = TOWERS[t.type];

            // Outer base
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(pos.px, pos.py, 11, 0, Math.PI * 2);
            ctx.fill();

            // Colored element core
            ctx.fillStyle = cfg.color;
            ctx.beginPath();
            ctx.arc(pos.px, pos.py, 8, 0, Math.PI * 2);
            ctx.fill();

            // Level pips
            ctx.fillStyle = '#ffffff';
            for (let lvl = 0; lvl <= t.level; lvl++) {
              const angle = (lvl * Math.PI) / 2;
              const pipX = pos.px + Math.cos(angle) * 4.5;
              const pipY = pos.py + Math.sin(angle) * 4.5;
              ctx.beginPath();
              ctx.arc(pipX, pipY, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }

            // Draw Range if cursor is on this tower
            if (eng.cursor.x === t.x && eng.cursor.y === t.y) {
              ctx.strokeStyle = cfg.color;
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.arc(pos.px, pos.py, t.range * (CELL_SIZE + CELL_GAP), 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          // Draw Creeps
          for (const c of eng.creeps) {
            const radius = c.isBoss ? 9 : c.isAir ? 6 : 7;

            // Health bar background
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(c.x - 8, c.y - radius - 5, 16, 2.5);
            // Health bar fill
            const hpFrac = Math.max(0, c.hp / c.maxHp);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(c.x - 8, c.y - radius - 5, 16 * hpFrac, 2.5);

            // Creep body
            ctx.fillStyle = c.slowTimer > 0 ? '#38bdf8' : c.isBoss ? '#f43f5e' : c.isAir ? '#e0e7ff' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Air creep cross wings
            if (c.isAir) {
              ctx.strokeStyle = '#0284c7';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(c.x - radius, c.y);
              ctx.lineTo(c.x + radius, c.y);
              ctx.moveTo(c.x, c.y - radius);
              ctx.lineTo(c.x, c.y + radius);
              ctx.stroke();
            }

            // Boss crown ring
            if (c.isBoss) {
              ctx.strokeStyle = '#facc15';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(c.x, c.y, radius + 2, 0, Math.PI * 2);
              ctx.stroke();
            }
          }

          // Draw Projectiles
          for (const p of eng.projectiles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.splash > 0 ? 3.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw Hit Explosions
          for (const hit of eng.hitEffects) {
            ctx.strokeStyle = hit.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hit.x, hit.y, hit.radius * (1 - hit.life / 0.15), 0, Math.PI * 2);
            ctx.stroke();
          }

          // Draw Cursor on Grid
          const curPos = gridToPixel(eng.cursor.x, eng.cursor.y);
          const half = CELL_SIZE / 2 + 1;
          ctx.strokeStyle = focusRow === 'MAP' ? '#22d3ee' : '#facc15';
          ctx.lineWidth = 2;
          ctx.strokeRect(curPos.px - half, curPos.py - half, CELL_SIZE + 2, CELL_SIZE + 2);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameStatus, waveStatus, syncState, focusRow]);

  const unlockedTowers = getUnlockedTowers();
  const researchItems = getResearchItems();
  const waveMods = getWaveModifiers(wave);
  const selectedTowerAtCursor = engineRef.current.towers.find(
    (t) => t.x === cursor.x && t.y === cursor.y
  );

  return (
    <main
      id="mrbd-app-root"
      className="w-[600px] h-[600px] max-w-[600px] max-h-[600px] overflow-hidden relative select-none bg-black text-white font-mono flex flex-col"
      style={{ width: SCREEN_SIZE, height: SCREEN_SIZE, backgroundColor: '#000000' }}
    >
      {/* 1. TOP STATS BAR (36px) */}
      <header
        id="mrbd-stats-bar"
        className="h-[36px] bg-black border-b border-neutral-800 flex items-center px-2 gap-1 text-[10px] shrink-0"
      >
        <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
          <span className="text-amber-400">●</span>
          <span className="text-white font-bold">{gold}g</span>
        </div>

        <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
          <span className="text-rose-500">♥</span>
          <span className="text-white font-bold">{lives}</span>
        </div>

        <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
          <span className="text-cyan-400">W</span>
          <span className="text-white font-bold">{wave}/39</span>
          {waveMods.isBossWave && (
            <span className="text-[7px] bg-rose-600 text-white px-1 rounded font-bold">
              BOSS
            </span>
          )}
          {waveMods.isAir && (
            <span className="text-[7px] bg-sky-500 text-black px-1 rounded font-bold">
              AIR
            </span>
          )}
          {waveMods.isFast && (
            <span className="text-[7px] bg-amber-400 text-black px-1 rounded font-bold">
              FAST
            </span>
          )}
          {waveMods.isImmune && (
            <span className="text-[7px] bg-purple-500 text-white px-1 rounded font-bold">
              IMMUNE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
          <span className="text-emerald-400">🪵</span>
          <span className="text-white font-bold">{wood}</span>
        </div>

        <div className="flex items-center gap-1 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-700 text-[9px] text-neutral-300">
          <span>{5 + interestLvl * 2}% int</span>
        </div>

        <div className="ml-auto text-[9px] text-neutral-400 truncate max-w-[140px]">
          {focusRow === 'MAP' ? (
            <span className="text-cyan-400 font-bold">[{cursor.x},{cursor.y}] MAP</span>
          ) : (
            <span className="text-amber-400 font-bold">MODE: {focusRow}</span>
          )}
        </div>
      </header>

      {/* 2. MAP CANVAS (324px) */}
      <section
        id="mrbd-canvas-container"
        className="relative shrink-0 flex items-center justify-center bg-black"
        style={{ height: 324 }}
      >
        <canvas
          id="mrbd-game-canvas"
          ref={canvasRef}
          width={319}
          height={319}
          className="border border-neutral-800 rounded bg-[#0a0f1d] shadow-inner"
        />

        {/* Status ticker overlay at top of canvas */}
        <div className="absolute top-1 left-2 right-2 flex justify-between items-center text-[8px] text-neutral-400 bg-black/70 px-2 py-0.5 rounded backdrop-blur-xs border border-neutral-800 pointer-events-none">
          <span className="text-neutral-200 truncate">{statusMsg}</span>
          <span className="text-cyan-400 shrink-0 ml-1">Score: {score}</span>
        </div>
      </section>

      {/* 3. LOWER UI ACTION ROWS (4 x 60px) */}
      <div className="flex-1 flex flex-col bg-black overflow-hidden select-none">
        {/* ROW A: BUILD */}
        <div
          id="row-build"
          className={`relative h-[60px] shrink-0 border-t flex items-center transition-all ${
            focusRow === 'BUILD'
              ? 'bg-[#0f231e] ring-2 ring-emerald-400 ring-inset border-emerald-400 z-10'
              : 'bg-neutral-950 border-neutral-800'
          }`}
        >
          <div
            className={`absolute left-0 top-0 h-full w-[44px] flex items-center justify-center text-[8px] font-black tracking-widest border-r ${
              focusRow === 'BUILD'
                ? 'bg-emerald-400 text-black border-emerald-400'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800'
            }`}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            BUILD
          </div>

          <div className="ml-[44px] h-full flex items-center gap-1 px-2 overflow-x-auto overflow-y-hidden">
            {unlockedTowers.map((t, idx) => {
              const isSelected = focusRow === 'BUILD' && idx === (buildIndex % unlockedTowers.length);
              const canAfford = gold >= t.cost;
              return (
                <div
                  key={t.type}
                  className={`min-w-[88px] h-[46px] rounded border px-2 flex flex-col justify-center transition-all ${
                    isSelected
                      ? 'bg-white text-black border-white scale-[1.04] shadow-md'
                      : canAfford
                      ? 'bg-neutral-900 text-neutral-200 border-neutral-700'
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] font-bold leading-tight">
                    <span>{t.name}</span>
                    <span className="text-amber-500 font-black">{t.cost}g</span>
                  </div>
                  <div className="text-[7px] text-neutral-400 leading-tight truncate">{t.desc}</div>
                  <div className="text-[7px] text-neutral-400 leading-tight">
                    dmg {t.damage} • rng {t.range}
                  </div>
                </div>
              );
            })}
            {focusRow === 'BUILD' && (
              <span className="text-[8px] text-emerald-400 ml-1 whitespace-nowrap">
                ◀ ▶ cyc • ENTER build • ▲ MAP • ▼ UPG
              </span>
            )}
          </div>
        </div>

        {/* ROW B: UPGRADE & SELL */}
        <div
          id="row-upgrade"
          className={`relative h-[60px] shrink-0 border-t flex items-center transition-all ${
            focusRow === 'UPGRADE'
              ? 'bg-[#1e1b30] ring-2 ring-purple-400 ring-inset border-purple-400 z-10'
              : 'bg-neutral-950 border-neutral-800'
          }`}
        >
          <div
            className={`absolute left-0 top-0 h-full w-[44px] flex items-center justify-center text-[8px] font-black tracking-widest border-r ${
              focusRow === 'UPGRADE'
                ? 'bg-purple-400 text-black border-purple-400'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800'
            }`}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            UPGRADE
          </div>

          <div className="ml-[44px] h-full flex items-center gap-2 px-2">
            {selectedTowerAtCursor ? (
              <>
                <div className="text-[9px] text-neutral-400 w-[95px] leading-tight shrink-0">
                  <div className="text-white font-bold text-[10px]">
                    {TOWERS[selectedTowerAtCursor.type].name} Lv{selectedTowerAtCursor.level + 1}
                  </div>
                  <div>
                    [{selectedTowerAtCursor.x},{selectedTowerAtCursor.y}] inv {selectedTowerAtCursor.invested}g
                  </div>
                </div>

                {[
                  {
                    label:
                      selectedTowerAtCursor.level < 3
                        ? `Upgrade ${Math.floor(
                            TOWERS[selectedTowerAtCursor.type].cost *
                              [0.6, 1.0, 1.6][selectedTowerAtCursor.level]
                          )}g`
                        : 'MAX Lv4',
                    action: 'up',
                    isMax: selectedTowerAtCursor.level >= 3,
                  },
                  {
                    label: `Sell +${Math.floor(selectedTowerAtCursor.invested * 0.7)}g`,
                    action: 'sell',
                    isMax: false,
                  },
                ].map((act, k) => {
                  const isSelected = focusRow === 'UPGRADE' && upgradeActionIdx === k;
                  return (
                    <div
                      key={act.action}
                      className={`min-w-[110px] h-[40px] rounded border flex items-center justify-center text-[10px] font-bold px-2 transition-all ${
                        isSelected
                          ? 'bg-white text-black border-white scale-105 shadow'
                          : 'bg-neutral-900 text-white border-neutral-700'
                      } ${act.isMax ? 'opacity-40' : ''}`}
                    >
                      {act.label}
                    </div>
                  );
                })}

                {focusRow === 'UPGRADE' && (
                  <span className="text-[8px] text-purple-400 ml-1">
                    ◀ ▶ Up/Sell • ENTER • ▲ BUILD • ▼ RES
                  </span>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-[40px] px-3 rounded border border-neutral-800 bg-neutral-900/60 flex items-center text-[9px] text-neutral-400">
                  [No Tower at cursor {cursor.x},{cursor.y}]
                </div>
                {focusRow === 'UPGRADE' && (
                  <span className="text-[8px] text-neutral-500">
                    Enter grass to BUILD • ▼ RES • ▲ BUILD
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ROW C: RESEARCH */}
        <div
          id="row-research"
          className={`relative h-[60px] shrink-0 border-t flex items-center transition-all ${
            focusRow === 'RESEARCH'
              ? 'bg-[#122818] ring-2 ring-cyan-400 ring-inset border-cyan-400 z-10'
              : 'bg-neutral-950 border-neutral-800'
          }`}
        >
          <div
            className={`absolute left-0 top-0 h-full w-[44px] flex items-center justify-center text-[8px] font-black tracking-widest border-r ${
              focusRow === 'RESEARCH'
                ? 'bg-cyan-400 text-black border-cyan-400'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800'
            }`}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            RESEARCH
          </div>

          <div className="ml-[44px] h-full flex items-center gap-1 px-2 overflow-x-auto overflow-y-hidden">
            {researchItems.map((item, idx) => {
              const isSelected = focusRow === 'RESEARCH' && idx === (researchIndex % researchItems.length);
              return (
                <div
                  key={item.key + idx}
                  className={`min-w-[90px] h-[44px] rounded border px-2 flex flex-col justify-center transition-all ${
                    isSelected
                      ? 'bg-lime-400 text-black border-lime-400 scale-[1.05] shadow'
                      : item.available
                      ? 'bg-neutral-900 text-neutral-200 border-neutral-700'
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800 opacity-60'
                  }`}
                >
                  <div className="text-[9px] font-black leading-tight">{item.label}</div>
                  <div className="text-[7px] leading-tight mt-0.5">{item.desc}</div>
                  <div className="text-[7px] mt-0.5 font-bold">
                    {item.owned ? 'OWNED' : item.available ? '1 wood' : 'Need wood'}
                  </div>
                </div>
              );
            })}
            {focusRow === 'RESEARCH' && (
              <span className="text-[8px] text-lime-400 ml-1 whitespace-nowrap">
                ◀ ▶ cyc • ENTER tech • ▲ UPG • ▼ WAVE
              </span>
            )}
          </div>
        </div>

        {/* ROW D: WAVE */}
        <div
          id="row-wave"
          className={`relative h-[60px] shrink-0 border-t flex items-center transition-all ${
            focusRow === 'WAVE'
              ? 'bg-[#2b1e06] ring-2 ring-amber-400 ring-inset border-amber-400 z-10'
              : 'bg-neutral-950 border-neutral-800'
          }`}
        >
          <div
            className={`absolute left-0 top-0 h-full w-[44px] flex items-center justify-center text-[8px] font-black tracking-widest border-r ${
              focusRow === 'WAVE'
                ? 'bg-amber-400 text-black border-amber-400'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800'
            }`}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            WAVE
          </div>

          <div className="ml-[44px] h-full flex items-center gap-3 px-2">
            <div
              className={`h-[42px] min-w-[200px] px-4 rounded font-black text-[12px] tracking-widest flex items-center justify-center border transition-all ${
                focusRow === 'WAVE'
                  ? 'bg-amber-400 text-black border-amber-400 scale-[1.04] shadow-[0_0_18px_rgba(251,191,36,0.6)]'
                  : 'bg-neutral-900 text-amber-400 border-amber-500/30'
              } ${waveStatus !== 'idle' ? 'opacity-60' : ''}`}
            >
              {waveStatus === 'idle'
                ? `▶ SEND WAVE ${wave}`
                : waveStatus === 'spawning'
                ? 'SPAWNING...'
                : `WAVE ${wave} ACTIVE`}
            </div>

            {focusRow === 'WAVE' && (
              <span className="text-[8px] text-amber-200 leading-tight">
                ENTER: Send → MAP
                <br />
                ▲ RES • ▼ MAP (wrap)
              </span>
            )}

            <div className="ml-auto text-[8px] text-neutral-400 text-right leading-tight pr-1">
              Score {score}
              <br />
              {wood} wood • {5 + interestLvl * 2}% int
            </div>
          </div>
        </div>
      </div>

      {/* START SCREEN OVERLAY */}
      {gameStatus === 'start' && (
        <div
          id="mrbd-start-screen"
          className="absolute inset-0 bg-black/95 z-30 flex flex-col items-center justify-center p-4 text-center"
        >
          <h1 className="text-[22px] font-black text-white tracking-[0.15em]">
            FLASH ELEMENT TD
          </h1>
          <p className="text-[10px] text-amber-400 tracking-[0.35em] mt-1">
            META RAY-BAN DISPLAY • 600×600
          </p>

          <div className="mt-3 bg-neutral-900 border border-neutral-700 rounded p-3 w-full max-w-[480px] text-left">
            <div className="text-cyan-400 font-black text-[10px] tracking-widest mb-1.5">
              MRBD TEMPLE & D-PAD CONTROLS
            </div>
            <div className="space-y-1.5 text-[9px] text-neutral-300 leading-snug">
              <div className="flex gap-2">
                <span className="bg-cyan-400 text-black px-1.5 rounded font-bold shrink-0">
                  MAP
                </span>
                <span>
                  ↑↓←→ (or Temple Swipes) moves cursor 12x12. <b>Enter/Tap</b> → BUILD on grass,
                  → UPGRADE on tower.
                </span>
              </div>
              <div className="flex gap-2">
                <span className="bg-neutral-800 text-white px-1.5 rounded font-bold shrink-0">
                  BUILD
                </span>
                <span>
                  ◀ ▶ choose tower • <b>Enter/Tap</b> builds • ▲ MAP • ▼ UPGRADE
                </span>
              </div>
              <div className="flex gap-2">
                <span className="bg-neutral-800 text-white px-1.5 rounded font-bold shrink-0">
                  UPGRADE
                </span>
                <span>
                  ◀ ▶ Upgrade / Sell • <b>Enter/Tap</b> execute • ▲ BUILD • ▼ RESEARCH
                </span>
              </div>
              <div className="flex gap-2">
                <span className="bg-neutral-800 text-white px-1.5 rounded font-bold shrink-0">
                  RESEARCH
                </span>
                <span>
                  ◀ ▶ choose element/interest • <b>Enter/Tap</b> spend 1 wood • ▲ UPG • ▼ WAVE
                </span>
              </div>
              <div className="flex gap-2">
                <span className="bg-amber-400 text-black px-1.5 rounded font-bold shrink-0">
                  WAVE
                </span>
                <span>
                  <b>Enter/Tap</b> sends wave and switches to MAP view • 39 waves to victory!
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={restartGame}
            className="mt-4 bg-white text-black hover:bg-neutral-200 px-8 py-2.5 rounded font-black text-[12px] tracking-[0.2em] shadow-lg transition-transform active:scale-95"
          >
            ENTER TO START
          </button>
          <p className="mt-1.5 text-[8px] text-neutral-500">
            Arrow 10g • Cannon 20g • Air 20g • Water/Earth/Fire 50g • Rocket 120g
          </p>
        </div>
      )}

      {/* GAME OVER / VICTORY OVERLAY */}
      {(gameStatus === 'gameover' || gameStatus === 'win') && (
        <div
          id="mrbd-end-screen"
          className="absolute inset-0 bg-black/92 z-30 flex flex-col items-center justify-center p-6 text-center"
        >
          <h2
            className={`text-[28px] font-black tracking-[0.2em] ${
              gameStatus === 'win' ? 'text-amber-400' : 'text-rose-500'
            }`}
          >
            {gameStatus === 'win' ? 'VICTORY!' : 'DEFEAT'}
          </h2>
          <p className="text-white text-[11px] mt-2">
            Wave {wave} • Score {score} • Gold {gold} • Wood {wood}
          </p>
          <p className="text-neutral-400 text-[9px] mt-2 max-w-[340px]">
            {gameStatus === 'win'
              ? 'Congratulations! You survived all 39 waves on Meta Ray-Ban Display!'
              : 'Lives depleted. Use D-pad temple swipes to place and upgrade towers tighter next run.'}
          </p>
          <button
            onClick={restartGame}
            className="mt-4 bg-white text-black hover:bg-neutral-200 px-8 py-2.5 rounded font-black text-[11px] tracking-wider shadow active:scale-95"
          >
            RESTART (ENTER)
          </button>
        </div>
      )}

      {/* COMPANION TOUCH D-PAD / TESTING CONTROLS OVERLAY */}
      <TactileControls
        currentFocus={focusRow}
        onDirection={handleDirection}
        onSelectRow={(r) => {
          setFocusRow(r);
          playRowTone();
        }}
        isTouchExpanded={showCompanionControls}
        onToggleExpanded={() => setShowCompanionControls((prev) => !prev)}
      />
    </main>
  );
}
