import { useEffect } from 'react';

/**
 * Versión web: mantiene la pantalla encendida mientras la partida online está abierta. Si el celular
 * se bloquea, el navegador corta la conexión. El sistema libera el bloqueo al cambiar de
 * app, así que se vuelve a pedir al regresar.
 */
export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (released) await lock.release();
      } catch {
        // batería baja o permiso denegado: la app sigue andando igual
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [enabled]);
}
