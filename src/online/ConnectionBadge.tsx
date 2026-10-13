import { IconPlugConnectedX, IconWifiOff } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { LinkStatus } from '../net/transport';

const LABELS: Record<LinkStatus, string> = {
  connecting: 'Conectando…',
  online: 'Conectado',
  reconnecting: 'Reconectando…',
  error: 'Sin conexión',
};

interface Props {
  status: LinkStatus;
  /** Texto extra, por ejemplo "3/4 conectados". */
  extra?: string;
}

export function ConnectionBadge({ status, extra }: Props) {
  return (
    <span className={`conn-badge ${status}`} role="status">
      <i aria-hidden />
      {LABELS[status]}
      {extra && status === 'online' && ` · ${extra}`}
    </span>
  );
}

/** Un corte cortito (cambio de antena, reconexión instantánea) no merece cartel. */
const ALERT_DELAY_MS = 1500;

function useDelayed(flag: boolean, ms: number) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!flag) {
      setShown(false);
      return;
    }
    const t = window.setTimeout(() => setShown(true), ms);
    return () => window.clearTimeout(t);
  }, [flag, ms]);
  return shown;
}

interface AlertProps {
  /** Este celular perdió la conexión. */
  lost: boolean;
  detail?: string;
  /** Acciones tocadas sin conexión que se van a mandar al volver. */
  pending?: number;
  /** Nombres de otros jugadores con el celular desconectado. */
  offline: string[];
}

/** Cartel bien visible para que nadie juegue desconectado sin darse cuenta. */
export function ConnectionAlert({ lost, detail, pending = 0, offline }: AlertProps) {
  const showLost = useDelayed(lost, ALERT_DELAY_MS);
  const others = offline.join(', ');
  const showOthers = useDelayed(!lost && offline.length > 0, ALERT_DELAY_MS);

  if (showLost) {
    return (
      <div className="conn-alert lost" role="alert">
        <IconWifiOff size={20} aria-hidden />
        <div>
          <strong>Sin conexión con la partida</strong>
          <small>
            {detail ?? 'Reconectando…'}
            {pending > 0 && ` · ${pending === 1 ? '1 cambio se envía' : `${pending} cambios se envían`} al volver`}
          </small>
        </div>
      </div>
    );
  }
  if (showOthers) {
    return (
      <div className="conn-alert" role="status">
        <IconPlugConnectedX size={20} aria-hidden />
        <div>
          <strong>
            {others} {offline.length === 1 ? 'está desconectado' : 'están desconectados'}
          </strong>
          <small>
            Cuando vuelva{offline.length === 1 ? '' : 'n'} a abrir la app se pone{offline.length === 1 ? '' : 'n'} al día solo
            {offline.length === 1 ? '' : 's'}.
          </small>
        </div>
      </div>
    );
  }
  return null;
}
