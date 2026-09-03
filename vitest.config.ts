import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.ts',
      'apps/worker/**/*.test.ts',
      'apps/web/src/**/*.test.ts',
    ],
    environment: 'node',
    restoreMocks: true,
  },
});
