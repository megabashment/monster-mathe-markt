import kaplay from "kaplay";
import { assetManager } from "./logic/AssetManager";
import { audioManager } from "./logic/AudioManager";
import { registerMenuScene } from "./scenes/menu";
import { registerGameScene } from "./scenes/game";
import { registerFeedbackScene } from "./scenes/feedback";
import { registerAlbumScene } from "./scenes/album";
import { isAdminOpen, openAdminOverlay } from "./ui/AdminOverlay";

const k = kaplay({
  width: 800,
  height: 540,
  letterbox: true,
  background: [230, 210, 255],
  canvas: document.querySelector<HTMLCanvasElement>("#game")!,
});

async function init() {
  await assetManager.load();

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

  k.loadFont("bubble", "/assets/fonts/FredokaOne-Regular.ttf");

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
