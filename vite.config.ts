import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// HTTPS (self-signed) only for `vite dev`, so a phone on the LAN can use the microphone.
// `vite preview` on localhost is already a secure context.
export default defineConfig(({ command, isPreview }) => ({
  base: '/fiona/',
  plugins: [
    react(),
    tailwindcss(),
    command === 'serve' && !isPreview && basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Fiona — resonance finder',
        short_name: 'Fiona',
        description: 'Find the natural frequency of a glass and make it sing.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/fiona/',
        start_url: '/fiona/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { host: true },
  test: { environment: 'node' },
}))
