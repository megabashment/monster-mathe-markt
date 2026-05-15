#!/usr/bin/env node
/// <reference types="node" />

/**
 * Pixellab Asset Generation — Monster-Mathe-Markt
 *
 * Arbeitet in 3er-Batches mit automatischem Polling:
 *   Batch submit → warte 2min → poll → warte 1min → poll → warte 30s → poll → ...
 * Speichert fertige Assets direkt lokal und aktualisiert assets.json.
 */

import https from "https";
import fs from "fs";
import path from "path";

const AUTH_TOKEN = process.env.PIXELLAB_TOKEN || "05993614-8bde-41d9-9c12-d2eeb198bcb1";
const PROJECT_ROOT = process.cwd();
const ASSETS_DIR = path.join(PROJECT_ROOT, "public", "assets");
const ASSETS_JSON = path.join(PROJECT_ROOT, "public", "assets.json");

// PokeAPI Integration
const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2/pokemon-species/";

// Mapping from PokeAPI shape to Pixellab template_id
// Valid template_id values: 'mannequin' (humanoid), 'bear', 'cat', 'dog', 'horse', 'lion'
const POKEAPI_SHAPE_TO_TEMPLATE_ID: Record<string, string> = {
  "quadruped":  "dog",       // kleine Vierbeiner
  "legs":       "dog",       // Mehrbeiner
  "upright":    "mannequin",
  "humanoid":   "mannequin",
  "bipedal":    "mannequin",
  "wings":      "mannequin",
  "blob":       "bear",      // runder Körper → bär-förmig
  "heads":      "bear",
  "armor":      "mannequin",
  "tentacles":  "mannequin",
  "serpentine": "mannequin",
  "bug":        "cat",
  "fish":       "mannequin",
  "fin":        "mannequin",
  "default":    "mannequin",
};

// ── Style-Konstanten ──────────────────────────────────────────────────────────
const SEED = 42069;
const SCALE = 12.0;
const CHAR_STYLE = { outline: "single color black outline", shading: "flat shading", detail: "high detail" };
const OBJ_STYLE  = { outline: "single color outline", shading: "medium shading", detail: "medium detail" };

// ── Job-Definitionen ──────────────────────────────────────────────────────────
// Neue Monster hier hinzufügen. Jeder Job wird in 3er-Batches verarbeitet.
interface JobDef {
  endpoint: string;
  params: Record<string, unknown>;
  targetPath: string;       // relativ zu public/assets/
  northPath?: string;       // wenn vorhanden: north-Sprite separat speichern
  metadata: Record<string, unknown>;
  pokeapi_ref?: string | number; // NEW: Optional PokeAPI reference (e.g., "squirtle" or 7)
}

const JOBS: Record<string, JobDef> = {
  // Beispiel — hier neue Monster eintragen:
  "monster-ripple": {
    endpoint: "/create-character-with-8-directions",
    params: {
      description: "Ripple, a cute water creature, round chubby jelly-like body with tiny stubby arms, big round glossy blue eyes with white highlight and black pupils, vibrant cobalt blue and sky blue color palette, soft white belly, clean bold black pixel art outline, vibrant saturated colors, happy cheerful expression, distinct round blob silhouette, no weapons, no scary elements, school-appropriate for 7-8 year old girls.",
      mode: "pro",
      seed: SEED,
      text_guidance_scale: SCALE,
      ...CHAR_STYLE,
    },
    targetPath: "monsters/monster-ripple-idle-128px-v1.png",
    northPath: "monsters/monster-ripple-north-128px-v1.png",
    metadata: { id: "ripple", name: "Ripple", width: 184, height: 184, tags: ["water", "cute"] },
    pokeapi_ref: 7 // Squirtle's species ID
  },
  "monster-flarky": {
    endpoint: "/create-character-with-8-directions",
    params: {
      description: "Flarky, a fiery lizard creature, with a flame on its tail, big round glossy red eyes with white highlight and black pupils, vibrant red and orange color palette, clean bold black pixel art outline, vibrant saturated colors, fierce but friendly expression, distinct lizard silhouette, no weapons, no scary elements, school-appropriate for 7-8 year old girls.",
      mode: "pro",
      seed: SEED + 1,
      text_guidance_scale: SCALE,
      ...CHAR_STYLE,
    },
    targetPath: "monsters/monster-flarky-idle-128px-v1.png",
    northPath: "monsters/monster-flarky-north-128px-v1.png",
    metadata: { id: "flarky", name: "Flarky", width: 184, height: 184, tags: ["fire", "lizard"] },
    pokeapi_ref: 4 // Charmander's species ID
  },
};

// ── HTTP-Helpers ──────────────────────────────────────────────────────────────
function httpsRequest(options: https.RequestOptions, body?: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error(`Parse error: ${e}`)); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function authHeader() {
  return { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" };
}

async function fetchPokeData(id: string | number): Promise<{
  flavorText: string;
  shape: string;
  color: string;
  genus: string;
} | null> {
  try {
    const res = await httpsRequest({
      hostname: "pokeapi.co",
      path: `/api/v2/pokemon-species/${id}/`,
      method: "GET",
    });

    const data = res as any;

    // Get English flavor text (e.g., from version 'red' for classic feel)
    const flavorTextEntry = data.flavor_text_entries.find(
      (entry: any) => entry.language.name === "en" && entry.version.name === "red"
    );
    const flavorText = flavorTextEntry ? flavorTextEntry.flavor_text.replace(/\n/g, " ") : "";

    const shape = data.shape ? data.shape.name : "default";
    const color = data.color ? data.color.name : "default";
    const genusEntry = data.genera.find((entry: any) => entry.language.name === "en");
    const genus = genusEntry ? genusEntry.genus.replace(" Pokémon", "") : ""; // Remove " Pokémon" suffix

    return { flavorText, shape, color, genus };
  } catch (error) {
    console.error(`Error fetching PokeAPI data for ID ${id}:`, error);
    return null;
  }
}

async function fetchPokeSprite(id: string | number): Promise<{ base64: string; width: number; height: number } | null> {
  try {
    const res = await httpsRequest({
      hostname: "pokeapi.co",
      path: `/api/v2/pokemon/${id}/`,
      method: "GET",
    }) as any;

    const artworkUrl: string | undefined = res.sprites?.other?.["official-artwork"]?.front_default;
    if (!artworkUrl) return null;

    const imgBuffer = await new Promise<Buffer>((resolve, reject) => {
      https.get(artworkUrl, (imgRes) => {
        if (imgRes.statusCode === 302 || imgRes.statusCode === 301) {
          https.get(imgRes.headers.location!, (r2) => {
            const chunks: Buffer[] = [];
            r2.on("data", (c: Buffer) => chunks.push(c));
            r2.on("end", () => resolve(Buffer.concat(chunks)));
            r2.on("error", reject);
          }).on("error", reject);
          return;
        }
        const chunks: Buffer[] = [];
        imgRes.on("data", (c: Buffer) => chunks.push(c));
        imgRes.on("end", () => resolve(Buffer.concat(chunks)));
        imgRes.on("error", reject);
      }).on("error", reject);
    });

    return { base64: imgBuffer.toString("base64"), width: 475, height: 475 };
  } catch (error) {
    console.error(`   ⚠️  fetchPokeSprite failed for ${id}:`, error);
    return null;
  }
}

async function submitJob(endpoint: string, params: Record<string, unknown>, pokeapi_ref?: string | number): Promise<string> {
  let finalParams = { ...params };

  // Always request 128px for higher quality
  finalParams.image_size = { width: 128, height: 128 };

  if (pokeapi_ref) {
    const [pokeData, pokeSprite] = await Promise.all([
      fetchPokeData(pokeapi_ref),
      fetchPokeSprite(pokeapi_ref),
    ]);

    if (pokeData) {
      const currentDescription = finalParams.description as string;
      const templateId = POKEAPI_SHAPE_TO_TEMPLATE_ID[pokeData.shape] ?? POKEAPI_SHAPE_TO_TEMPLATE_ID.default;

      finalParams.description = `${currentDescription} ${pokeData.flavorText} ${pokeData.genus} body, primary color ${pokeData.color}.`;
      finalParams.template_id = templateId;

      // chibi proportions for humanoid templates — big head, short limbs
      if (templateId === "mannequin") {
        finalParams.proportions = { type: "preset", name: "chibi" };
      }

      console.log(`   ℹ️  PokeAPI: ${pokeData.genus} | shape=${pokeData.shape} → template_id=${templateId}`);
    }

    if (pokeSprite) {
      finalParams.color_image = {
        type: "base64",
        base64: pokeSprite.base64,
        width: pokeSprite.width,
        height: pokeSprite.height,
      };
      console.log(`   🎨  color_image: official artwork attached (${pokeSprite.width}x${pokeSprite.height})`);
    }
  }

  const body = JSON.stringify(finalParams);
  const res = await httpsRequest({
    hostname: "api.pixellab.ai", port: 443,
    path: `/v2${endpoint}`, method: "POST",
    headers: { ...authHeader(), "Content-Length": Buffer.byteLength(body) },
  }, body) as any;
  if (!res.background_job_id) throw new Error(`API Error: ${JSON.stringify(res)}`);
  return res.background_job_id;
}

async function pollJob(jobId: string): Promise<{ status: string; data: unknown }> {
  const res = await httpsRequest({
    hostname: "api.pixellab.ai", port: 443,
    path: `/v2/background-jobs/${jobId}`, method: "GET",
    headers: authHeader(),
  }) as any;
  return { status: res.status ?? "unknown", data: res };
}

async function downloadPng(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (e) => { fs.unlink(dest, () => {}); reject(e); });
  });
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ── Polling mit abnehmendem Intervall ─────────────────────────────────────────
const POLL_INTERVALS_MS = [2 * 60_000, 60_000, 30_000]; // 2min → 1min → 30s

async function waitAndPollBatch(
  batch: Array<{ key: string; jobId: string; def: JobDef }>
): Promise<void> {
  const pending = new Map(batch.map((b) => [b.jobId, b]));
  let intervalIdx = 0;

  while (pending.size > 0) {
    const delay = POLL_INTERVALS_MS[Math.min(intervalIdx, POLL_INTERVALS_MS.length - 1)];
    console.log(`\n⏳ Warte ${delay / 1000}s auf ${pending.size} Job(s)...`);
    await sleep(delay);
    intervalIdx++;

    for (const [jobId, item] of pending) {
      const { status, data } = await pollJob(jobId);
      const d = data as any;

      if (status === "completed") {
        console.log(`✅ ${item.key} fertig`);
        await saveAsset(item.key, item.def, d);
        pending.delete(jobId);
      } else if (status === "failed") {
        console.error(`❌ ${item.key} fehlgeschlagen`);
        pending.delete(jobId);
      } else {
        console.log(`   ⏳ ${item.key}: ${status}`);
      }
    }
  }
}

// ── Asset speichern + assets.json updaten ─────────────────────────────────────
function extractImage(data: any): Buffer | null {
  const r = data.last_response ?? data;
  if (r.image) return Buffer.from(r.image, "base64");
  if (r.images?.south) return Buffer.from(r.images.south.base64 ?? r.images.south, "base64");
  const first = Object.values(r.images ?? {})[0] as any;
  if (first) return Buffer.from(first.base64 ?? first, "base64");
  return null;
}

function extractNorthImage(data: any): Buffer | null {
  const r = data.last_response ?? data;
  if (r.images?.north) return Buffer.from(r.images.north.base64 ?? r.images.north, "base64");
  return null;
}

async function saveAsset(key: string, def: JobDef, data: unknown): Promise<void> {
  const img = extractImage(data);
  if (!img) { console.error(`   ⚠️  Kein Bild in Response für ${key}`); return; }

  const dest = path.join(ASSETS_DIR, def.targetPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, img);
  console.log(`   💾 ${def.targetPath} (${(img.length / 1024).toFixed(1)}KB)`);

  if (def.northPath) {
    const north = extractNorthImage(data);
    if (north) {
      const northDest = path.join(ASSETS_DIR, def.northPath);
      fs.writeFileSync(northDest, north);
      console.log(`   💾 ${def.northPath}`);
    }
  }

  updateAssetsJson(def);
}

function updateAssetsJson(def: JobDef): void {
  let manifest: any = { version: "1.2.0", generatedAt: "", assets: { monsters: {}, objects: {}, ui: {} } };
  if (fs.existsSync(ASSETS_JSON)) manifest = JSON.parse(fs.readFileSync(ASSETS_JSON, "utf-8"));

  const category = def.targetPath.split("/")[0] as "monsters" | "objects" | "ui";
  const id = def.metadata.id as string;
  manifest.assets[category][id] = {
    ...def.metadata,
    path: `assets/${def.targetPath}`,
    ...(def.northPath ? { northPath: `assets/${def.northPath}` } : {}),
  };
  manifest.generatedAt = new Date().toISOString();

  fs.writeFileSync(ASSETS_JSON, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`   📝 assets.json → ${category}/${id}`);
}

// ── Haupt-Loop: Batches à 3 ───────────────────────────────────────────────────
async function run(): Promise<void> {
  const entries = Object.entries(JOBS);
  if (entries.length === 0) {
    console.log("ℹ️  Keine Jobs definiert. Trage Monster in JOBS ein und starte erneut.");
    return;
  }

  console.log(`🎨 Starte ${entries.length} Job(s) in 3er-Batches...\n`);

  for (let i = 0; i < entries.length; i += 3) {
    const batchEntries = entries.slice(i, i + 3);
    const batchNum = Math.floor(i / 3) + 1;
    const totalBatches = Math.ceil(entries.length / 3);
    console.log(`\n── Batch ${batchNum}/${totalBatches}: ${batchEntries.map(([k]) => k).join(", ")} ──`);

    // Alle 3 gleichzeitig submitten
    const batch: Array<{ key: string; jobId: string; def: JobDef }> = [];
    for (const [key, def] of batchEntries) {
      try {
        const jobId = await submitJob(def.endpoint, def.params, def.pokeapi_ref);
        console.log(`   📤 ${key} → Job ${jobId}`);
        batch.push({ key, jobId, def });
      } catch (err) {
        console.error(`   ❌ ${key}: ${err}`);
      }
    }

    if (batch.length > 0) await waitAndPollBatch(batch);
  }

  console.log("\n✅ Alle Assets generiert und gespeichert.");
}

run().catch((err) => { console.error("Fatal:", err); process.exit(1); });
