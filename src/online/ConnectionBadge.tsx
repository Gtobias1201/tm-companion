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
