import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    assetsInlineLimit: 0, // prevents Vite re-inlining tile WebP images as base64
  },
})
