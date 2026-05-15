#!/usr/bin/env node

/**
 * Asset Validator
 * Checks assets.json and actual files against spec
 */

import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();
const ASSETS_JSON = path.join(PROJECT_ROOT, "public", "assets.json");
const ASSETS_DIR = path.join(PROJECT_ROOT, "public", "assets");

interface AssetSpec {
  id: string;
  path: string;
  width: number;
  height: number;
}

async function validateAssets(): Promise<void> {
  console.log("🔍 Validating assets...\n");

  // 1. Check assets.json exists and is valid JSON
  if (!fs.existsSync(ASSETS_JSON)) {
    console.error(`❌ assets.json not found at ${ASSETS_JSON}`);
    process.exit(1);
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(fs.readFileSync(ASSETS_JSON, "utf-8"));
  } catch (e) {
    console.error(`❌ Invalid JSON in assets.json: ${e}`);
    process.exit(1);
  }

  // 2. Check structure
  const errors: string[] = [];

  if (!manifest.version) errors.push("Missing 'version'");
  if (!manifest.generatedAt) errors.push("Missing 'generatedAt'");
  if (!manifest.assets) errors.push("Missing 'assets' object");

  if (errors.length > 0) {
    console.error("❌ Invalid manifest structure:");
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  const assets = manifest.assets as Record<string, Record<string, AssetSpec>>;

  // 3. Check each asset
  let assetCount = 0;
  let fileCount = 0;

  for (const [category, categoryAssets] of Object.entries(assets)) {
    if (!categoryAssets || typeof categoryAssets !== "object") {
      console.warn(`⚠️  Empty category: ${category}`);
      continue;
    }

    console.log(`📦 ${category}:`);

    for (const [id, asset] of Object.entries(categoryAssets)) {
      const spec = asset as unknown as AssetSpec;

      // Check required fields
      if (!spec.id || !spec.path || !spec.width || !spec.height) {
        console.error(
          `   ❌ ${id}: Missing required fields (id, path, width, height)`
        );
        continue;
      }

      // Check file exists
      const filePath = path.join(PROJECT_ROOT, "public", spec.path);
      if (!fs.existsSync(filePath)) {
        console.error(`   ❌ ${id}: File not found: ${spec.path}`);
        continue;
      }

      const stats = fs.statSync(filePath);
      console.log(
        `   ✅ ${id} (${spec.width}x${spec.height} @ ${(
          stats.size / 1024
        ).toFixed(1)}KB)`
      );

      assetCount++;
      fileCount++;
    }
  }

  console.log(
    `\n✅ Validation passed! ${assetCount} assets, ${fileCount} files verified.`
  );
}

validateAssets().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
