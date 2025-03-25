import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/wmulvaney.github.io/',
  resolve: {
    extensions: ['.js', '.jsx']
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/
  }
}) 