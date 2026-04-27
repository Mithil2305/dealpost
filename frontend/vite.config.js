import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined
          if (id.includes("react-router-dom")) return "router"
          if (id.includes("firebase")) return "firebase"
          if (id.includes("@googlemaps")) return "maps"
          if (id.includes("@headlessui")) return "ui"
          if (id.includes("lucide-react")) return "icons"
          return "vendor"
        },
      },
    },
  },
})
