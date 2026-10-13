import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { isNativeApp } from './native';

/** Ajustes que solo existen en la app instalada. En el navegador no hace nada. */
export async function setupNativeApp() {
  if (!isNativeApp) return;
  const { App } = await import('@capacitor/app');
  // Botón "atrás" de Android: cierra lo que esté abierto encima, o vuelve al inicio desde los
  // formularios. En la partida y en la sala manda la app al fondo sin cerrarla: así la partida
  // sigue y no se sale por un toque sin querer.
  await App.addListener('backButton', () => {
    const backdrop = document.querySelector<HTMLElement>('.modal-backdrop');
    if (backdrop) return backdrop.click();
    if (document.querySelector('.tour, .guide')) return window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const back = document.querySelector<HTMLElement>('.topbar [aria-label="Volver"]');
    if (back) return back.click();
    void App.minimizeApp();
  });
}

/** Íconos de la barra de estado claros u oscuros según el tema de la app. */
export function setSystemBarsTheme(mode: 'light' | 'dark') {
  if (!isNativeApp) return;
  void SystemBars.setStyle({ style: mode === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => undefined);
}
