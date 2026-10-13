import { Capacitor } from '@capacitor/core';

/** true dentro de la app instalada (Android); false en el navegador. */
export const isNativeApp = Capacitor.isNativePlatform();

/**
 * Dirección pública de la versión web. Dentro de la app la página vive en https://localhost,
 * así que los links de invitación tienen que apuntar acá para que los abra cualquier celular.
 */
export const PUBLIC_URL =
  (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? 'https://gtobias1201.github.io/tm-companion/';
