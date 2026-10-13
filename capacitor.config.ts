import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmcompanion.app',
  appName: 'TM Companion',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      // La app dibuja detrás de las barras del sistema y usa env(safe-area-inset-*) para no taparse
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
