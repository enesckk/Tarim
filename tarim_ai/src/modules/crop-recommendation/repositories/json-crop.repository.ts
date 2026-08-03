import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import {
  cropKnowledgeSchema,
  type CropKnowledge,
} from '../knowledge/schemas/crop-knowledge.schema.js';
import type { CropSummary } from '../types/crop.types.js';
import { KNOWLEDGE_BASE_VERSION } from '../rules/scoring-thresholds.js';
import type { CropRepository } from './crop-repository.interface.js';

function resolveDefaultCropsDir(): string {
  const besideModule = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../knowledge/crops',
  );
  if (hasJsonFiles(besideModule)) {
    return besideModule;
  }
  const fromCwd = path.join(
    process.cwd(),
    'src/modules/crop-recommendation/knowledge/crops',
  );
  if (hasJsonFiles(fromCwd)) {
    return fromCwd;
  }
  throw new Error(
    `Crop knowledge directory not found. Checked: ${besideModule} and ${fromCwd}`,
  );
}

function hasJsonFiles(dir: string): boolean {
  return (
    existsSync(dir) &&
    readdirSync(dir).some((name) => name.endsWith('.json'))
  );
}

/**
 * Loads and validates crop JSON files once into memory.
 * Fails fast on invalid schema or duplicate ids.
 */
export class JsonCropRepository implements CropRepository {
  private readonly crops: CropKnowledge[];
  private readonly byId: Map<string, CropKnowledge>;

  constructor(cropsDir = resolveDefaultCropsDir()) {
    this.crops = loadAndValidateCrops(cropsDir);
    this.byId = new Map(this.crops.map((crop) => [crop.id, crop]));
  }

  list(): CropKnowledge[] {
    return [...this.crops];
  }

  listSummaries(): CropSummary[] {
    return this.crops.map((crop) => ({
      id: crop.id,
      name: crop.name,
      category: crop.category,
      reviewStatus: crop.sourceMetadata.reviewStatus,
    }));
  }

  getById(id: string): CropKnowledge | null {
    return this.byId.get(id) ?? null;
  }

  getKnowledgeBaseVersion(): string {
    return KNOWLEDGE_BASE_VERSION;
  }
}

function loadAndValidateCrops(cropsDir: string): CropKnowledge[] {
  let files: string[];
  try {
    files = readdirSync(cropsDir)
      .filter((name) => name.endsWith('.json'))
      .sort();
  } catch (error) {
    throw new Error(
      `Crop knowledge directory could not be read: ${cropsDir}. ${String(error)}`,
    );
  }

  if (files.length === 0) {
    throw new Error(`No crop knowledge JSON files found in ${cropsDir}`);
  }

  const crops: CropKnowledge[] = [];
  const ids = new Set<string>();

  for (const file of files) {
    const fullPath = path.join(cropsDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to parse crop knowledge file ${file}: ${String(error)}`);
    }

    let parsed: CropKnowledge;
    try {
      parsed = cropKnowledgeSchema.parse(raw);
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');
        throw new Error(`Invalid crop knowledge file ${file}: ${details}`);
      }
      throw error;
    }

    if (ids.has(parsed.id)) {
      throw new Error(`Duplicate crop id "${parsed.id}" in knowledge base`);
    }
    ids.add(parsed.id);
    crops.push(parsed);
  }

  return crops;
}

/** Shared singleton loaded at module init for production wiring. */
let sharedRepository: JsonCropRepository | null = null;

export function getSharedCropRepository(): JsonCropRepository {
  if (!sharedRepository) {
    sharedRepository = new JsonCropRepository();
  }
  return sharedRepository;
}

export function resetSharedCropRepository(): void {
  sharedRepository = null;
}
