/**
 * Asset Type Definitions
 * STRICT typing for AI-safe asset handling
 */

export type AssetCategory = "monsters" | "objects" | "ui";
export type ObjectType = "collectible" | "background" | "decoration";

/** Base asset metadata (all assets must have these) */
export interface BaseAsset {
  id: string; // kebab-case, globally unique
  name: string; // UI display name
  path: string; // relative to /public, must start with "assets/"
  width: number; // px
  height: number; // px
  description: string; // for context
}

/** Monster asset (playable character) */
export interface MonsterAsset extends BaseAsset {
  category: "monsters";
  northPath?: string; // Rückenansicht für Walk-out
  frames?: number;
  directions?: 1 | 4 | 8;
  tags: string[];
}

/** Game object (items, decorations, collectibles) */
export interface ObjectAsset extends BaseAsset {
  category: "objects";
  objectType: ObjectType;
  tags: string[];
}

/** UI asset (backgrounds, buttons, panels) */
export interface UIAsset extends BaseAsset {
  category: "ui";
  tags: string[];
}

export type Asset = MonsterAsset | ObjectAsset | UIAsset;

/** Complete assets.json structure */
export interface AssetsManifest {
  version: string; // semver
  generatedAt: string; // ISO 8601
  assets: {
    monsters: Record<string, MonsterAsset>;
    objects: Record<string, ObjectAsset>;
    ui: Record<string, UIAsset>;
  };
}

/** Asset validation result */
export interface AssetValidation {
  valid: boolean;
  errors: string[];
}
