// Web Audio synthesizer for Meta Ray-Ban Display HUD sound effects

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playBeep(frequency = 440, gain = 0.08, duration = 0.08): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Graceful fallback if audio is disallowed
  }
}

export function playMoveTone(): void {
  playBeep(320, 0.04, 0.05);
}

export function playRowTone(): void {
  playBeep(400, 0.04, 0.05);
}

export function playBuildTone(): void {
  playBeep(660, 0.12, 0.12);
}

export function playUpgradeTone(): void {
  playBeep(880, 0.12, 0.15);
}

export function playSellTone(): void {
  playBeep(330, 0.1, 0.15);
}

export function playResearchTone(): void {
  playBeep(700, 0.12, 0.2);
}

export function playWaveTone(): void {
  playBeep(440, 0.12, 0.18);
}

export function playErrorBuzz(): void {
  playBeep(120, 0.15, 0.22);
}

export function playHitTone(): void {
  playBeep(1000, 0.02, 0.03);
}

export function playVictoryJingle(): void {
  setTimeout(() => playBeep(523, 0.1, 0.1), 0);
  setTimeout(() => playBeep(659, 0.1, 0.1), 120);
  setTimeout(() => playBeep(784, 0.1, 0.15), 240);
  setTimeout(() => playBeep(1046, 0.15, 0.3), 380);
}

export function playDefeatJingle(): void {
  setTimeout(() => playBeep(350, 0.12, 0.15), 0);
  setTimeout(() => playBeep(290, 0.12, 0.18), 160);
  setTimeout(() => playBeep(220, 0.15, 0.35), 340);
}
