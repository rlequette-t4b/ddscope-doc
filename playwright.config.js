import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// If CHROME_USER_DATA_DIR is set in .env, the setup test reuses that Chrome
// profile (useful when you are already authenticated in your browser).
// Chrome must be fully closed before running the setup in that case.
const chromeProfileArgs = process.env.CHROME_USER_DATA_DIR
  ? [
      `--user-data-dir=${process.env.CHROME_USER_DATA_DIR}`,
      `--profile-directory=${process.env.CHROME_PROFILE_DIR || 'Default'}`
    ]
  : [];

const authStatePath = 'tests/ui/auth/.auth/user.json';
const storageState = fs.existsSync(authStatePath) ? authStatePath : undefined;

export default defineConfig({
  testDir: 'tests/ui',
  use: {
    baseURL: process.env.DDSCOPE_URL,
    channel: 'chrome'
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth/setup.spec.js',
      use: {
        launchOptions: { args: chromeProfileArgs }
      }
    },
    {
      name: 'ddscope',
      testDir: 'tests/ui',
      testIgnore: '**/auth/setup.spec.js',
      use: {
        storageState,
        launchOptions: { args: chromeProfileArgs }
      }
    }
  ]
});
