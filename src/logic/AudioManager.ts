import type { SoundId, SoundDef } from "../types/audio";

const SOUNDS: SoundDef[] = [
  {
    id: "btn-click",
    path: "/assets/audio/kenney-ui/Audio/click1.ogg",
    volume: 0.6,
  },
  {
    id: "btn-hover",
    path: "/assets/audio/kenney-ui/Audio/rollover1.ogg",
    volume: 0.3,
  },
  {
    id: "answer-correct",
    path: "/assets/audio/kenney-interface/Audio/confirmation_002.ogg",
    volume: 0.4,
  },
  {
    id: "answer-wrong",
    path: "/assets/audio/kenney-interface/Audio/error_001.ogg",
    volume: 0.7,
  },
  {
    id: "coin-collect",
    path: "/assets/audio/kenney-digital/Audio/pepSound1.ogg",
    volume: 0.5,
  },
  {
    id: "game-start",
    path: "/assets/audio/kenney-digital/Audio/phaseJump1.ogg",
    volume: 0.5,
  },
  {
    id: "door-bell",
    path: "/assets/audio/kenney-interface/Audio/drop_003.ogg",
    volume: 0.4,
  },
  {
    id: "arrival-pop",
    path: "/assets/audio/kenney-digital/Audio/pepSound3.ogg",
    volume: 0.3,
  },
  {
    id: "think-pop",
    path: "/assets/audio/kenney-digital/Audio/pepSound2.ogg",
    volume: 0.2,
  },
  {
    id: "trash-impact",
    path: "/assets/audio/kenney-ui/Audio/click3.ogg",
    volume: 0.4,
  },
  {
    id: "shelf-place",
    path: "/assets/audio/kenney-digital/Audio/pepSound4.ogg",
    volume: 0.3,
  },
  {
    id: "unlock-fanfare",
    path: "/assets/audio/kenney-digital/Audio/powerUp7.ogg",
    volume: 0.6,
  },
  {
    id: "monster-jump",
    path: "/assets/audio/kenney-digital/Audio/phaseJump5.ogg",
    volume: 0.4,
  },
  {
    id: "pj1",
    path: "/assets/audio/kenney-digital/Audio/phaseJump1.ogg",
    volume: 0.4,
  },
  {
    id: "pj2",
    path: "/assets/audio/kenney-digital/Audio/phaseJump2.ogg",
    volume: 0.4,
  },
  {
    id: "bgm-menu",
    path: "/assets/audio/kenney-loops/cheerfulannoyance.ogg",
    volume: 0.1,
  },
  {
    id: "bgm-game",
    path: "/assets/audio/kenney-loops/farmfrolics.ogg",
    volume: 0.1,
  },
  {
    id: "alphadance",
    path: "/assets/audio/kenney-loops/alphadance.ogg",
    volume: 0.1,
  },
];

class AudioManager {
  private registry = new Map<SoundId, SoundDef>();

  getAll(): SoundDef[] {
    return SOUNDS;
  }

  get(id: SoundId): SoundDef {
    const s = this.registry.get(id);
    if (!s) throw new Error(`[AudioManager] Sound not found: ${id}`);
    return s;
  }

  register(): void {
    for (const s of SOUNDS) {
      this.registry.set(s.id, s);
    }
  }

  /**
   * Fadet einen Sound sanft aus.
   */
  fadeOut(k: any, handle: any, duration: number = 1) {
    if (!handle) return;
    return k.tween(
      handle.volume,
      0,
      duration,
      (v: number) => (handle.volume = v),
      k.easings.linear
    );
  }

  /**
   * Fadet einen Sound auf die Ziel-Lautstärke ein.
   */
  fadeIn(k: any, handle: any, targetVolume: number, duration: number = 1) {
    if (!handle) return;
    handle.volume = 0;
    return k.tween(
      0,
      targetVolume,
      duration,
      (v: number) => (handle.volume = v),
      k.easings.linear
    );
  }
}

export const audioManager = new AudioManager();
