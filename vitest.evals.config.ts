import { defineConfig } from 'vitest/config'
import path from 'path'

// Separate config for LLM prompt evals (scripts/evals/*.eval.ts).
// These hit the real DeepSeek API and are excluded from `npm test`.
export default defineConfig({
  test: {
    include: ['scripts/evals/**/*.eval.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 120_000,
    // Sequential — evals share rate limits and results files
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
