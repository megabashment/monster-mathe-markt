// Pixellab Asset Generation für Monster-Mathe-Markt
// Generiert Assets nach .claude/ASSET_SPEC.md

interface PixelLabCharacterRequest {
  name: string;
  style?: string;
  size?: number;
  proportions?: string;
}

interface PixelLabObjectRequest {
  name: string;
  style?: string;
  size?: number;
  background?: "transparent" | "white";
}

// Monster: Blubbo (cute, round, 64px)
const monsterRequest: PixelLabCharacterRequest = {
  name: "Blubbo - cute round monster for 2nd grade math game",
  style: "cute kawaii chibi",
  size: 64,
  proportions: "round chubby"
};

// Object 1: Gold Coin (32px)
const coinRequest: PixelLabObjectRequest = {
  name: "Gold coin for collectible rewards",
  style: "simple cute pixel art",
  size: 32,
  background: "transparent"
};

// Object 2: Shop Background (512x256)
const shopBackgroundRequest: PixelLabObjectRequest = {
  name: "Cute magic shop interior for 2nd graders - warm welcoming colors",
  style: "pixel art pastel",
  background: "white" // UI background needs white
};

console.log("Asset Generation Requests Ready:");
console.log("\n1. Monster (Blubbo):", monsterRequest);
console.log("\n2. Coin Object:", coinRequest);
console.log("\n3. Shop Background:", shopBackgroundRequest);
