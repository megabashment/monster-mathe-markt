#!/usr/bin/env npx tsx
/**
 * Generiert das Ash Ketchup Portrait-Sprite für den Händler-Overlay.
 * Einmal ausführen, dann Datei löschen.
 */

import https from "https";
import fs from "fs";
import path from "path";

const AUTH_TOKEN = process.env.PIXELLAB_TOKEN || "05993614-8bde-41d9-9c12-d2eeb198bcb1";
const OUT_PATH = path.join(process.cwd(), "public/assets/ui/merchant-ash-ketchup.png");

function req(options: https.RequestOptions, body?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const r = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

const headers = { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" };

async function submit(): Promise<string> {
  const body = JSON.stringify({
    description: "Pokémon-inspired pixel art trainer character named Ash Ketchup. Big round glossy brown eyes with white highlight dot and black pupils. Compact chibi trainer silhouette — large head, short body. Red backwards baseball cap, blue sleeveless vest over white shirt, carrying a small glowing potion bottle. Confident cheerful salesperson expression with a wide grin. Vibrant red and blue color palette, saturated colors. No weapons, school-appropriate for 7-8 year old girls.",
    image_size: { width: 88, height: 88 },
    seed: 42069,
    text_guidance_scale: 12.0,
    outline: "single color black outline",
    shading: "medium shading",
    detail: "high detail",
    proportions: { type: "preset", name: "chibi" },
  });
  const res = await req({
    hostname: "api.pixellab.ai", port: 443,
    path: "/v2/create-character-with-8-directions", method: "POST",
    headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
  }, body);
  if (!res.background_job_id) throw new Error(`Submit failed: ${JSON.stringify(res)}`);
  console.log(`📤 Job submitted: ${res.background_job_id}`);
  return res.background_job_id;
}

async function poll(jobId: string): Promise<Buffer> {
  const intervals = [60_000, 30_000, 20_000];
  let idx = 0;
  while (true) {
    const wait = intervals[Math.min(idx++, intervals.length - 1)];
    console.log(`⏳ Warte ${wait / 1000}s...`);
    await new Promise(r => setTimeout(r, wait));

    const res = await req({
      hostname: "api.pixellab.ai", port: 443,
      path: `/v2/background-jobs/${jobId}`, method: "GET",
      headers,
    });

    if (res.status === "completed") {
      const r = res.last_response ?? res;
      const img = r.images?.south?.base64 ?? r.images?.south ?? r.image;
      if (!img) throw new Error("No image in response");
      console.log("✅ Fertig!");
      return Buffer.from(img, "base64");
    } else if (res.status === "failed") {
      throw new Error(`Job failed: ${JSON.stringify(res)}`);
    } else {
      console.log(`   Status: ${res.status}`);
    }
  }
}

async function main() {
  const jobId = await submit();
  const img = await poll(jobId);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, img);
  console.log(`💾 Gespeichert: ${OUT_PATH} (${(img.length / 1024).toFixed(1)} KB)`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
