import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Game } from '../game/types';
import { GameScreen } from '../components/game/GameScreen';
import { HOST_CLIENT_ID, newInviteCode } from '../net/protocol';
import { ConnectionAlert, ConnectionBadge } from './ConnectionBadge';
import { HostController, lobbyProblems } from './hostController';
import { LobbyView } from './LobbyView';
import { useStayConnected } from '../platform/useStayConnected';

interface Props {
  /** Partida online ya empezada que este celular vuelve a hospedar. */
  resume?: Game;
  onSave: (game: Game) => void;
  onExit: () => void;
}

export function OnlineHost({ resume, onSave, onExit }: Props) {
  const controller = useMemo(
    () => new HostController(resume?.online?.code ?? newInviteCode(), { resume, onSave }),
    // Un solo controlador mientras esta pantalla esté abierta
    [],
  );
  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);
  const snap = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useStayConnected('Sos el anfitrión: la mesa sigue jugando aunque apagues la pantalla.');

  const leave = () => {
    const message = snap.game
      ? 'Si salís, la partida queda en pausa para todos hasta que la vuelvas a abrir. ¿Salir?'
      : 'Si salís, se cierra la sala de espera. ¿Salir?';
    if (confirm(message)) onExit();
  };

  if (snap.lobby) {
    return (
      <LobbyView
        lobby={snap.lobby}
        myClientId={HOST_CLIENT_ID}
        isHost
        status={<ConnectionBadge status={snap.status} />}
        onSeat={(setup, ready) => controller.updateSeat(HOST_CLIENT_ID, setup, ready)}
        onOptions={(patch) => controller.updateLobby(patch)}
        onRemove={(clientId) => controller.removeSeat(clientId)}
        onStart={() => controller.startGame()}
        startProblems={lobbyProblems(snap.lobby)}
        onLeave={leave}
      />
    );
  }

  if (!snap.game || !snap.me) return null;
  const others = Object.keys(snap.game.online?.members ?? {}).filter((id) => id !== HOST_CLIENT_ID);
  const connected = others.filter((id) => snap.connected.includes(id)).length;
  const members = snap.game.online?.members ?? {};
  const offline = others
    .filter((id) => !snap.connected.includes(id))
    .map((id) => snap.game!.players.find((p) => p.id === members[id])?.name)
    .filter((name): name is string => !!name);

  return (
    <GameScreen
      game={snap.game}
      canUndo={snap.canUndoMine}
      dispatch={controller.dispatch}
      onUndo={controller.undoMine}
      onExit={leave}
      online={{
        me: snap.me,
        isHost: true,
        status: <ConnectionBadge status={snap.status} extra={`${connected}/${others.length} conectados`} />,
        // El anfitrión sin servidor sigue hablando con quienes ya estaban conectados:
        // solo es grave si además no le queda nadie
        alert: (
          <ConnectionAlert
            lost={snap.status !== 'online' && connected === 0 && others.length > 0}
            detail={snap.statusDetail ?? 'Nadie puede entrar ni reconectarse hasta que vuelva la red.'}
            offline={offline}
          />
        ),
        canUndoAny: snap.canUndoAny,
        onUndoAny: controller.undoAny,
      }}
    />
  );
}
