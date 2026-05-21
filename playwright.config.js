import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: 'tests/ui',
  use: {
    baseURL: process.env.DDSCOPE_URL,
    storageState: 'tests/ui/auth/.auth/user.json',
    channel: 'chrome'
  },
  projects: [
    { name: 'setup', testMatch: '**/auth/setup.spec.js' },
    {
      name: 'ddscope',
      dependencies: ['setup'],
      testDir: 'tests/ui'
    }
  ]
});
