import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/release/**',
      '**/_cleanup_quarantine_RC2/**'
    ]
  }
});
