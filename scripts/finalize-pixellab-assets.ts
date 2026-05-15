#!/usr/bin/env node

/**
 * Finalize Pixellab Assets
 * Downloads completed assets, renames to spec, and updates assets.json
 *
 * Run after poll-pixellab-jobs.ts shows "completed"
 */

import https from "https";
import fs from "fs";
import path from "path";

const AUTH_TOKEN = process.env.PIXELLAB_TOKEN || "05993614-8bde-41d9-9c12-d2eeb198bcb1";
const PROJECT_ROOT = process.cwd();
const ASSETS_DIR = path.join(PROJECT_ROOT, "public", "assets");

interface JobResult {
  job_id: string;
  status: "completed" | "processing" | "pending" | "failed";
  asset_name: string;
  target_path: string;
  asset_metadata: Record<string, unknown>;
}

// Define what we're expecting from Pixellab
const EXPECTED_ASSETS = {
  "monster-blubbo": {
    tool: "get_character",
    target_path: "monsters/monster-blubbo-idle-64px-v1.png",
    metadata: {
      id: "blubbo",
      name: "Blubbo",
      width: 64,
      height: 64,
      frames: 1,
      directions: 8,
      description: "Süßes rundes Monster",
      tags: ["cute", "rounded", "friendly"],
    },
  },
  "object-coin-gold": {
    tool: "get_map_object",
    target_path: "objects/object-coin-gold-32px-v1.png",
    metadata: {
      id: "coin-gold",
      name: "Goldmünze",
      width: 32,
      height: 32,
      objectType: "collectible",
      description: "Sammelbar für Belohnungen",
      tags: ["collectible", "currency", "reward"],
    },
  },
  "ui-background-shop": {
    tool: "get_map_object",
    target_path: "ui/ui-background-shop-512x256px-v1.png",
    metadata: {
      id: "background-shop",
      name: "Shop-Hintergrund",
      width: 512,
      height: 256,
      description: "Shop-Screen Hintergrund",
      tags: ["background", "shop", "ui"],
    },
  },
  "object-coin-1e": {
    tool: "get_character",
    target_path: "objects/coin-1e.png",
    metadata: {
      id: "coin-1e",
      name: "1 Euro Münze",
      width: 32,
      height: 32,
      description: "1 Euro Münze im Pokémon Stil",
      tags: ["item", "money", "euro"],
    },
  },
  "object-coin-2e": {
    tool: "get_character",
    target_path: "objects/coin-2e.png",
    metadata: {
      id: "coin-2e",
      name: "2 Euro Münze",
      width: 32,
      height: 32,
      description: "2 Euro Münze im Pokémon Stil",
      tags: ["item", "money", "euro"],
    },
  },
  "object-bottle": {
    tool: "get_map_object",
    target_path: "objects/item-bottle.png",
    metadata: {
      id: "item-bottle",
      name: "Saftflasche",
      width: 32,
      height: 32,
      description: "Saftflasche für das Regal",
      tags: ["item", "shop", "filling"],
    },
  },
  "object-apple": {
    tool: "get_map_object",
    target_path: "objects/item-apple.png",
    metadata: {
      id: "item-apple",
      name: "Apfel",
      width: 32,
      height: 32,
      description: "Frischer Apfel für das Regal",
      tags: ["item", "shop", "filling"],
    },
  },
};

async function callPixellab(job_id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.pixellab.ai",
      port: 443,
      path: `/v2/background-jobs/${job_id}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function finalizeAssets() {
  console.log("📦 Finalizing Pixellab Assets...\n");

  const jobsFile = path.join(PROJECT_ROOT, ".claude", "pixellab-jobs.json");
  if (!fs.existsSync(jobsFile)) {
    console.error(`❌ Job file not found: ${jobsFile}`);
    process.exit(1);
  }

  const jobsData = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));

  // Ensure asset directories exist
  for (const dir of ["monsters", "objects", "ui"]) {
    const dirPath = path.join(ASSETS_DIR, dir);
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const results: JobResult[] = [];

  for (const [key, spec] of Object.entries(EXPECTED_ASSETS)) {
    const jobRecord = jobsData.jobs[key];
    if (!jobRecord?.job_id) {
      console.log(`⏭️  ${key}: No job ID found\n`);
      continue;
    }

    try {
      console.log(`📥 Fetching ${key}...`);

      const response = await callPixellab(jobRecord.job_id);
      const pixelabData = response as any;
      const lastResponse = pixelabData.last_response || {};

      if (pixelabData.status !== "completed") {
        console.error(`   ❌ Job not ready: ${pixelabData.status}`);
        continue;
      }

      let imageBuffer: Buffer;
      if (lastResponse.image) {
        imageBuffer = Buffer.from(lastResponse.image, "base64");
      } else if (lastResponse.images) {
        const south = lastResponse.images.south || Object.values(lastResponse.images)[0];
        imageBuffer = Buffer.from(south.base64, "base64");
      } else {
        console.error(`   ❌ No image data found`);
        continue;
      }

      // Save to target path
      const targetPath = path.join(ASSETS_DIR, spec.target_path);
      fs.writeFileSync(targetPath, imageBuffer);
      console.log(`   ✅ Saved to ${spec.target_path} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

      results.push({
        job_id: jobRecord.job_id,
        status: "completed",
        asset_name: key,
        target_path: spec.target_path,
        asset_metadata: spec.metadata,
      });

      console.log();
    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }

  // Update assets.json
  if (results.length > 0) {
    console.log("📝 Updating assets.json...");
    updateAssetsJson(results);
    console.log("✅ Complete!\n");
  }
}

function updateAssetsJson(results: JobResult[]): void {
  const assetsJsonPath = path.join(PROJECT_ROOT, "public", "assets.json");

  let manifest: Record<string, unknown> = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    assets: {
      monsters: {},
      objects: {},
      ui: {},
    },
  };

  // Load existing if present
  if (fs.existsSync(assetsJsonPath)) {
    manifest = JSON.parse(fs.readFileSync(assetsJsonPath, "utf-8"));
  }

  // Add new assets
  for (const result of results) {
    const spec = EXPECTED_ASSETS[result.asset_name as keyof typeof EXPECTED_ASSETS];
    const metadata = spec.metadata as Record<string, unknown>;
    const category = result.target_path.split("/")[0]; // "monsters", "objects", "ui"

    const asset = {
      ...metadata,
      path: `assets/${result.target_path}`,
    };

    (manifest.assets as Record<string, Record<string, unknown>>)[category][
      metadata.id as string
    ] = asset;
  }

  manifest.generatedAt = new Date().toISOString();

  fs.writeFileSync(assetsJsonPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`   ✅ Updated ${assetsJsonPath}`);
}

finalizeAssets().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
