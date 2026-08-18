import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path for GitHub Pages project sites (https://<user>.github.io/<repo>/).
// Overridden by the GitHub Actions workflow via VITE_BASE_PATH; defaults to
// "/" for local dev and for a user/organization root site.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
})
