import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: la app funciona tanto en GitHub Pages (/tm-companion/) como en local
  base: './',
  // host: true permite abrir la app desde el celular en la misma red Wi-Fi
  server: { host: true, port: 5173 },
});
