import { useState } from 'react';

/** Preferencia de tema de este celular: "auto" sigue al sistema. */
export type ThemePref = 'auto' | 'light' | 'dark';

const KEY = 'tm-companion:theme';
const BG = { light: '#f7f4ef', dark: '#1c1614' };
const darkMedia = () => window.matchMedia('(prefers-color-scheme: dark)');

export function loadThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/** Marca la página con data-theme (el CSS define los colores de cada modo) y ajusta la barra del navegador. */
export function applyTheme(pref: ThemePref) {
  const mode = pref === 'auto' ? (darkMedia().matches ? 'dark' : 'light') : pref;
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[mode]);
}

/** Aplica el tema guardado y, en automático, lo sigue cuando cambia el del celular. */
export function initTheme() {
  applyTheme(loadThemePref());
  darkMedia().addEventListener('change', () => {
    if (loadThemePref() === 'auto') applyTheme('auto');
  });
}

export function useThemePref(): [ThemePref, (pref: ThemePref) => void] {
  const [pref, setPref] = useState(loadThemePref);
  const update = (next: ThemePref) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // sin storage: el cambio dura hasta recargar
    }
    applyTheme(next);
    setPref(next);
  };
  return [pref, update];
}
