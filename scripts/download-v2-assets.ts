#!/usr/bin/env node
/**
 * Download Pixellab v2 Assets
 * Ruft abgeschlossene Jobs ab und speichert RGBA-Bytes als PNG
 */
import https from "https";
import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";

const TOKEN = "05993614-8bde-41d9-9c12-d2eeb198bcb1";
const BASE_URL = "api.pixellab.ai";
const OUT_DIR = path.join(process.cwd(), "public");

const JOBS = {
  "monster-blubbo": {
    type: "character",
    job_id: "f360d48a-3066-4be5-a134-4caaf01616a1",
    target: "assets/monsters/monster-blubbo-idle-64px-v1.png",
    direction: "south",
  },
  "object-coin-gold": {
    type: "map_object",
    job_id: "0a1bd23b-d9ea-41e0-ab14-337fa96ef286",
    target: "assets/objects/object-coin-gold-32px-v1.png",
    direction: null,
  },
  "ui-background-shop": {
    type: "map_object",
    job_id: "60eb5d7b-d1e8-483b-ba62-86317411c9d3",
    target: "assets/ui/ui-background-shop-400x200px-v1.png",
    direction: null,
  },
} as const;

async function get(urlPath: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: urlPath,
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
    };
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error(`Parse error`)); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function rgbaBytesToPng(base64: string, width: number, height: number): Buffer {
  const raw = Buffer.from(base64, "base64");
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  raw.copy(Buffer.from(imageData.data.buffer));
  ctx.putImageData(imageData, 0, 0);
  return canvas.toBuffer("image/png");
}

async function downloadAll() {
  // Ensure dirs
  for (const dir of ["assets/monsters", "assets/objects", "assets/ui"]) {
    fs.mkdirSync(path.join(OUT_DIR, dir), { recursive: true });
  }

  for (const [name, job] of Object.entries(JOBS)) {
    console.log(`\n📥 ${name}...`);
    try {
      const res = await get(`/v2/background-jobs/${job.job_id}`) as Record<string, unknown>;

      if (res.status !== "completed") {
        console.log(`   ⏳ Status: ${res.status}`);
        continue;
      }

      const lastResponse = res.last_response as Record<string, unknown>;
      let imageData: { base64: string; width: number; height: number } | null = null;

      if (job.type === "character") {
        const images = lastResponse.images as Record<string, { base64: string; width: number; height: number }>;
        // Prefer south, fallback to east
        const dir = job.direction || "south";
        imageData = images[dir] || Object.values(images)[0];
      } else {
        // map_object
        const image = lastResponse.image as { base64: string; width: number; height: number };
        imageData = image;
      }

      if (!imageData?.base64) {
        console.log(`   ❌ No image data found`);
        continue;
      }

      const png = rgbaBytesToPng(imageData.base64, imageData.width, imageData.height);
      const outPath = path.join(OUT_DIR, job.target);
      fs.writeFileSync(outPath, png);
      console.log(`   ✅ Saved: ${job.target} (${imageData.width}x${imageData.height}, ${(png.length / 1024).toFixed(1)}KB)`);
    } catch (e) {
      console.error(`   ❌ Error: ${e}`);
    }
  }

  console.log("\n✅ All assets downloaded!");
}

downloadAll();
