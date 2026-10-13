import { IconDownload } from '@tabler/icons-react';
import { useState } from 'react';
import { installUpdate, useAvailableUpdate, type InstallResult } from '../platform/appUpdate';

const MESSAGES: Record<Exclude<InstallResult, 'started'>, string> = {
  'needs-permission': 'Activá "Permitir de esta fuente" para TM Companion, volvé y tocá Actualizar de nuevo.',
  failed: 'No se pudo bajar la actualización. Revisá la conexión y probá de nuevo.',
};

/** Aviso en el inicio cuando hay una versión nueva de la app de Android. */
export function UpdateBanner() {
  const update = useAvailableUpdate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!update) return null;

  const run = async () => {
    setBusy(true);
    setMessage(null);
    const result = await installUpdate();
    setBusy(false);
    if (result !== 'started') setMessage(MESSAGES[result]);
  };

  return (
    <div className="notice update-banner" role="status">
      <IconDownload size={20} aria-hidden />
      <span className="grow">
        <strong>Hay una versión nueva de la app</strong>
        {message && <small className="muted">{message}</small>}
      </span>
      <button className="btn small primary" disabled={busy} onClick={run}>
        {busy ? 'Bajando…' : 'Actualizar'}
      </button>
    </div>
  );
}
