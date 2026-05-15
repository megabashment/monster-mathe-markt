/**
 * Asset Manager
 * Central registry for all game assets with strict validation
 */

import type {
  AssetsManifest,
  Asset,
  AssetCategory,
  MonsterAsset,
  ObjectAsset,
  UIAsset,
  AssetValidation,
} from "../types/assets";

class AssetManager {
  private manifest: AssetsManifest | null = null;
  private loaded = false;

  /**
   * Load and validate assets.json
   * Throws if manifest is invalid or unreachable
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    const response = await fetch("/assets.json");
    if (!response.ok) {
      throw new Error(`[AssetManager] Failed to load assets.json: ${response.statusText}`);
    }

    const data = await response.json();
    const validation = this.validate(data);

    if (!validation.valid) {
      throw new Error(
        `[AssetManager] Invalid assets.json:\n${validation.errors.map((e) => `  - ${e}`).join("\n")}`
      );
    }

    this.manifest = data as AssetsManifest;
    this.loaded = true;
    console.log(
      `[AssetManager] Loaded ${Object.keys(this.manifest.assets.monsters).length} monsters, ` +
        `${Object.keys(this.manifest.assets.objects).length} objects, ` +
        `${Object.keys(this.manifest.assets.ui).length} UI assets`
    );
  }

  /**
   * Get a single asset by category and ID
   * Throws if asset not found or manager not loaded
   */
  getAsset<T extends Asset>(category: AssetCategory, id: string): T {
    if (!this.loaded || !this.manifest) {
      throw new Error("[AssetManager] Assets not loaded. Call load() first.");
    }

    const asset = this.manifest.assets[category][id as never];
    if (!asset) {
      throw new Error(`[AssetManager] Asset not found: ${category}/${id}`);
    }

    return asset as T;
  }

  /**
   * Get a monster asset with type safety
   */
  getMonster(id: string): MonsterAsset {
    return this.getAsset<MonsterAsset>("monsters", id);
  }

  /**
   * Get an object asset with type safety
   */
  getObject(id: string): ObjectAsset {
    return this.getAsset<ObjectAsset>("objects", id);
  }

  /**
   * Get a UI asset with type safety
   */
  getUI(id: string): UIAsset {
    return this.getAsset<UIAsset>("ui", id);
  }

  /**
   * Get all assets in a category
   */
  getAllInCategory(category: AssetCategory): Asset[] {
    if (!this.loaded || !this.manifest) {
      throw new Error("[AssetManager] Assets not loaded. Call load() first.");
    }
    return Object.values(this.manifest.assets[category]);
  }

  /**
   * Get all monsters
   */
  getAllMonsters(): MonsterAsset[] {
    return this.getAllInCategory("monsters") as MonsterAsset[];
  }

  /**
   * Get all objects
   */
  getAllObjects(): ObjectAsset[] {
    return this.getAllInCategory("objects") as ObjectAsset[];
  }

  /**
   * Get all UI assets
   */
  getAllUI(): UIAsset[] {
    return this.getAllInCategory("ui") as UIAsset[];
  }

  /**
   * Filter assets by tag (e.g., "collectible", "cute")
   */
  filterByTag(tag: string, category?: AssetCategory): Asset[] {
    if (!this.loaded || !this.manifest) {
      throw new Error("[AssetManager] Assets not loaded. Call load() first.");
    }

    const searchIn = category
      ? [this.manifest.assets[category]]
      : Object.values(this.manifest.assets);

    return searchIn
      .flatMap((cat) => Object.values(cat))
      .filter((asset) => asset.tags.includes(tag));
  }

  /**
   * Validate manifest structure
   */
  private validate(data: unknown): AssetValidation {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      return { valid: false, errors: ["Invalid manifest: not an object"] };
    }

    const m = data as Record<string, unknown>;

    // Check top-level structure
    if (typeof m.version !== "string" || !m.version.match(/^\d+\.\d+\.\d+$/)) {
      errors.push("Missing or invalid 'version' (must be semver)");
    }

    if (typeof m.generatedAt !== "string") {
      errors.push("Missing 'generatedAt' timestamp");
    }

    if (!m.assets || typeof m.assets !== "object") {
      errors.push("Missing 'assets' object");
      return { valid: false, errors };
    }

    const assets = m.assets as Record<string, unknown>;

    // Check asset categories
    const categories: AssetCategory[] = ["monsters", "objects", "ui"];
    for (const cat of categories) {
      if (!assets[cat] || typeof assets[cat] !== "object") {
        errors.push(`Missing or invalid '${cat}' category`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get current manifest (for debugging)
   */
  getManifest(): AssetsManifest | null {
    return this.manifest;
  }

  /**
   * Check if loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

// Singleton instance
export const assetManager = new AssetManager();
