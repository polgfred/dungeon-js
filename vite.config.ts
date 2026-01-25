import { pigment } from '@pigment-css/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [pigment({}), react()],
  server: {
    host: true,
  },
});
