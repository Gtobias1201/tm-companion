import { IconArrowLeft } from '@tabler/icons-react';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { GameScreen } from '../components/GameScreen';
import { ClientController } from './clientController';
import { ConnectionBadge } from './ConnectionBadge';
import { LobbyView } from './LobbyView';
import { clearClientSession } from './session';
import { useWakeLock } from './useWakeLock';

interface Props {
  code: string;
  clientId: string;
  onExit: () => void;
}

export function OnlineClient({ code, clientId, onExit }: Props) {
  const controller = useMemo(() => new ClientController(code, clientId), [code, clientId]);
  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);
  const snap = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useWakeLock(true);

  const status = <ConnectionBadge status={snap.status} />;

  // Error definitivo (sala llena, partida empezada, expulsado): no tiene sentido seguir reintentando
  if (snap.error && !snap.game) {
    return (
      <div className="page">
        <div className="empty-state">
          <h1>No pudiste entrar</h1>
          <p className="muted">{snap.error}</p>
          <button
            className="btn primary"
            onClick={() => {
              clearClientSession();
              onExit();
            }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (snap.lobby) {
    return (
      <LobbyView
        lobby={snap.lobby}
        myClientId={clientId}
        isHost={false}
        status={status}
        onSeat={(setup, ready) => controller.sendSeat(setup, ready)}
        onLeave={onExit}
      />
    );
  }

  if (snap.game && snap.me) {
    return (
      <GameScreen
        game={snap.game}
        canUndo={snap.canUndo}
        dispatch={controller.dispatch}
        onUndo={controller.undo}
        onExit={onExit}
        online={{ me: snap.me, isHost: false, status }}
      />
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Cancelar">
          <IconArrowLeft size={20} />
        </button>
        <h1>Uniéndote a {code}</h1>
      </header>
      <div className="empty-state">
        {status}
        <p className="muted">{snap.statusDetail ?? 'Buscando la partida del anfitrión…'}</p>
      </div>
    </div>
  );
}
