#!/usr/bin/env npx tsx
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  importEcocropSnapshot,
  type EcocropSnapshotDocument,
} from '../ecocrop/parse.js';
import { getSharedFaoExternalRepository } from '../repositories/fao-external.repository.js';

async function main() {
  const input =
    process.argv[2] ??
    join(process.cwd(), 'fixtures', 'ecocrop', 'snapshots', 'pilot-empty.snapshot.json');
  const raw = await readFile(input, 'utf8');
  const doc = JSON.parse(raw) as EcocropSnapshotDocument;
  const { profiles, unknownFieldCensus } = importEcocropSnapshot(doc);

  const repo = getSharedFaoExternalRepository();
  await repo.upsertEcocropProfiles(profiles);

  const outDir = join(process.cwd(), 'storage', 'ecocrop', doc.snapshotVersion);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, 'profiles.draft.json');
  await writeFile(
    outPath,
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        snapshotVersion: doc.snapshotVersion,
        status: 'draft',
        count: profiles.length,
        unknownFieldCensus,
        profiles,
        reviewWorkflow: ['draft', 'reviewed', 'approved', 'rejected'],
        note: 'Profiles are draft until human review; not used by live scoring.',
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`[ecocrop:import] ${profiles.length} draft profiles → ${outPath}`);
}

main().catch((err) => {
  console.error('[ecocrop:import] failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
