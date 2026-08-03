import { verifyGoldenDataset } from '../golden/golden-verify.js';

async function verify(): Promise<void> {
  console.log('[golden:verify] Verifying golden dataset...');

  const result = await verifyGoldenDataset();

  console.log('[golden:verify] Results:');
  for (const check of result.checks) {
    const icon = check.passed ? '✓' : '✗';
    const detail = check.detail ? ` (${check.detail})` : '';
    console.log(`  ${icon} ${check.check}${detail}`);
  }

  if (result.errors.length > 0) {
    console.log('\n[golden:verify] Errors:');
    for (const err of result.errors) {
      console.log(`  ✗ ${err}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n[golden:verify] Warnings:');
    for (const warning of result.warnings) {
      console.log(`  ! ${warning}`);
    }
  }

  console.log(`\n[golden:verify] level=${result.level}`);
  console.log(`[golden:verify] structurallyValid=${result.structurallyValid}`);
  console.log(`[golden:verify] demoReady=${result.demoReady}`);
  console.log(
    `[golden:verify] datasetType=${result.manifest.datasetType} manifest.demoReady=${result.manifest.demoReady}`,
  );

  if (result.manifest.datasetType === 'placeholder' || result.manifest.demoReady === false) {
    console.log('[golden:verify] DEMO_READY=false (placeholder or not captured)');
  }

  console.log(
    `\n[golden:verify] ${result.level} (${result.checks.length} checks, ${result.errors.length} errors)`,
  );

  // Exit 0 if structurally valid (even if not demo-ready); exit 1 if INVALID
  process.exit(result.structurallyValid ? 0 : 1);
}

verify().catch((err) => {
  console.error('[golden:verify] Fatal:', err);
  process.exit(1);
});
