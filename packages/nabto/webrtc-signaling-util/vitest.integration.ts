import { defineConfig } from "vite";
export default defineConfig({
  plugins: [],
  test: {
    // allows you to use stuff like describe, it, vi without importing
    globals: true,
    // Path to your setup script that we will go into detail below
    setupFiles: ['./integration_test/setup.ts'],
    // Up to you, I usually put my integration tests inside of integration
    // folders
    include: ["./integration_test/**/*.test.ts"],
    testTimeout: 30000,
    environment: 'node'
  }
});
