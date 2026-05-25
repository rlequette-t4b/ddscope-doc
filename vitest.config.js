import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    setupFiles: ['./shims/setup-globals.js', './shims/modules.js', './shims/tools.js']
  }
});
