import kaplay from "kaplay";
import { assetManager } from "./logic/AssetManager";
import { audioManager } from "./logic/AudioManager";
import { registerMenuScene } from "./scenes/menu";
import { registerGameScene } from "./scenes/game";
import { registerFeedbackScene } from "./scenes/feedback";
import { registerAlbumScene } from "./scenes/album";
import { isAdminOpen, openAdminOverlay } from "./ui/AdminOverlay";

window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason);
});

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) {
  console.error("[Main] Canvas element #game not found in DOM");
  throw new Error("Canvas #game element not found");
}

let k;
try {
  console.log("[Main] Initializing Kaplay...");
  k = kaplay({
    width: 800,
    height: 540,
    letterbox: true,
    background: [230, 210, 255],
    canvas: canvas,
  });
  console.log("[Main] Kaplay initialized successfully");
} catch (e) {
  console.error("[Main] Kaplay init failed:", e);
  document.getElementById('debug')!.innerHTML += '<br><span style="color:#f00;">KAPLAY ERROR: ' + String(e) + '</span>';
  throw e;
}

async function init() {
  try {
    await assetManager.load();
  } catch (e) {
    console.error("[Init] AssetManager.load() failed:", e);
    throw e;
  }

  // Sprites laden
  for (const m of assetManager.getAllMonsters()) {
    k.loadSprite(m.id, m.path);
    if (m.northPath) k.loadSprite(`${m.id}-north`, m.northPath);
  }
  for (const o of assetManager.getAllObjects())  k.loadSprite(o.id, o.path);
  for (const u of assetManager.getAllUI())        k.loadSprite(u.id, u.path);

  // Sounds laden
  audioManager.register();
  for (const s of audioManager.getAll()) {
    k.loadSound(s.id, s.path);
  }

  k.loadFont("bubble", `${(import.meta as any).env.BASE_URL}assets/fonts/FredokaOne-Regular.ttf`);

  // Scenes
  registerMenuScene(k);
  registerGameScene(k);
  registerFeedbackScene(k);
  registerAlbumScene(k);

  // Admin overlay: Shift+A öffnet den Profil-Editor in jeder Szene.
  k.onKeyPress("a", () => {
    if (k.isKeyDown("shift") && !isAdminOpen()) openAdminOverlay(k);
  });

  k.go("menu");
}

init().catch((err) => {
  console.error("[Game] Failed to init:", err);
});
