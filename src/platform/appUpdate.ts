import { CapacitorHttp, registerPlugin } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { isNativeApp } from './native';

/** Plugin nativo (android/app/src/main/java/.../AppUpdatePlugin.java). */
interface AppUpdatePlugin {
  canInstall(): Promise<{ allowed: boolean }>;
  openInstallSettings(): Promise<void>;
  install(options: { url: string }): Promise<void>;
}

const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate');

/** Lo publica .github/workflows/android.yml en cada merge a main, junto al APK. */
const RELEASE_URL = 'https://github.com/Gtobias1201/tm-companion/releases/download/android/';

export interface AvailableUpdate {
  build: number;
}

/** Versión nueva publicada, o null si la instalada es la última (o no hay red). */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isNativeApp) return null;
  try {
    const { App } = await import('@capacitor/app');
    const installed = Number((await App.getInfo()).build);
    // Pedido nativo: GitHub no permite leer sus descargas desde la página por CORS
    const res = await CapacitorHttp.get({ url: `${RELEASE_URL}version.json`, params: { t: String(Date.now()) } });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    const latest = Number(data?.build);
    return res.status === 200 && latest > installed ? { build: latest } : null;
  } catch {
    return null;
  }
}

export type InstallResult = 'started' | 'needs-permission' | 'failed';

/** Baja el APK y abre el instalador de Android (que pide confirmar). */
export async function installUpdate(): Promise<InstallResult> {
  try {
    if (!(await AppUpdate.canInstall()).allowed) {
      await AppUpdate.openInstallSettings();
      return 'needs-permission';
    }
    await AppUpdate.install({ url: `${RELEASE_URL}tm-companion.apk` });
    return 'started';
  } catch {
    return 'failed';
  }
}

/** Revisa al abrir la app y cada vez que vuelve al frente. */
export function useAvailableUpdate(): AvailableUpdate | null {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  useEffect(() => {
    if (!isNativeApp) return;
    const check = () => {
      if (document.visibilityState === 'visible') void checkForUpdate().then(setUpdate);
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  return update;
}
