import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    allowedHosts: ["chromaapi-production.up.railway.app"],
  },
  define: {
    __APP_NAME__: JSON.stringify("Chroma Admin"),
  },
})
