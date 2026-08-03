import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/modules/**/tests/**/*.test.ts'],
    // PostgreSQL integration suites share one database; serialize files to avoid TRUNCATE races.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
