import { describe, it } from 'vitest';

// This scenario needs live Copernicus credentials and the PostgreSQL integration stack.
// Keep it visible in the suite without failing ordinary unit/CI runs.
const describeLive = process.env.RUN_LIVE_INTEGRATION === 'true' ? describe : describe.skip;

describeLive('mock safety in live mode', () => {
  it.todo('rejects mock provider output while ANALYSIS_DATA_MODE=live');
});
