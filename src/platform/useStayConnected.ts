import { registerPlugin } from '@capacitor/core';
import { useEffect } from 'react';
import { isNativeApp } from './native';
import { useScreenWakeLock } from './useScreenWakeLock';

/** Plugin nativo de la app de Android (android/app/src/main/java/.../KeepAlivePlugin.java). */
interface KeepAlivePlugin {
  start(options: { title: string; text: string }): Promise<void>;
  stop(): Promise<void>;
  batteryStatus(): Promise<{ unrestricted: boolean }>;
  requestUnrestrictedBattery(): Promise<void>;
}

const KeepAlive = registerPlugin<KeepAlivePlugin>('KeepAlive');

/** El diálogo de batería se muestra como mucho una vez por apertura de la app. */
let askedBattery = false;

/**
 * Mantiene viva la conexión de la partida online.
 * - En la app de Android: servicio en primer plano con aviso fijo, así sigue andando con la pantalla
 *   apagada o en otra app, y pide una vez que la app pueda usar batería sin restricciones.
 * - En el navegador: no hay forma de seguir en segundo plano, solo se evita que se apague la pantalla.
 */
export function useStayConnected(text: string) {
  useScreenWakeLock(!isNativeApp);

  useEffect(() => {
    if (!isNativeApp) return;
    let stopped = false;
    let running = false;
    const start = () => {
      if (stopped || running || document.visibilityState !== 'visible') return Promise.resolve();
      // Android no deja prenderlo desde segundo plano: si falla, se reintenta al volver a la app
      return KeepAlive.start({ title: 'Partida online en curso', text }).then(
        () => void (running = true),
        () => undefined,
      );
    };
    // Primero el permiso de notificaciones (lo pide start) y después el de batería, de a un diálogo
    void start().then(() => {
      if (!stopped) return askBatteryOnce();
    });
    document.addEventListener('visibilitychange', start);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', start);
      void KeepAlive.stop().catch(() => undefined);
    };
  }, [text]);
}

async function askBatteryOnce() {
  if (askedBattery) return;
  askedBattery = true;
  try {
    const { unrestricted } = await KeepAlive.batteryStatus();
    if (!unrestricted) await KeepAlive.requestUnrestrictedBattery();
  } catch {
    // sin el permiso la partida anda igual mientras el servicio esté prendido
  }
}
