import { createApp } from '../../../app.js';

async function checkReadiness(): Promise<void> {
  console.log('[demo:readiness] Checking demo readiness...');

  const app = createApp();
  const port = 14000 + Math.floor(Math.random() * 1000);

  const server = app.listen(port, async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/demo/readiness`);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      server.close();
      const status = (data as Record<string, unknown>).status;
      process.exit(status === 'ready' ? 0 : 1);
    } catch (err) {
      console.error('[demo:readiness] Error:', err);
      server.close();
      process.exit(1);
    }
  });
}

checkReadiness().catch((err) => {
  console.error('[demo:readiness] Fatal:', err);
  process.exit(1);
});
