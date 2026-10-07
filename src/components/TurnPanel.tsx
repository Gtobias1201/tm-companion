import { IconLock, IconPlayerSkipForward, IconPlus } from '@tabler/icons-react';
import { ACTIONS_PER_TURN, isTurnOf, type Action } from '../game/logic';
import type { Game, Player } from '../game/types';

interface Props {
  game: Game;
  player: Player;
  dispatch: (action: Action) => void;
}

/** Barra compacta del turno: acciones hechas y botones para seguir, terminar o pasar. */
export function TurnPanel({ game, player, dispatch }: Props) {
  if (game.turn && isTurnOf(game, player.id)) {
    const done = game.turn.actions;
    const pid = player.id;
    return (
      <section className="turn-bar is-turn" aria-label="Turno">
        <div className="turn-info">
          <strong>Tu turno</strong>
          <span className="action-dots" role="img" aria-label={`${done} de ${ACTIONS_PER_TURN} acciones`}>
            {Array.from({ length: ACTIONS_PER_TURN }, (_, i) => (
              <span key={i} className={i < done ? 'on' : ''} />
            ))}
          </span>
        </div>
        <button
          className="btn small"
          title="Para acciones de cartas, hitos, premios o comercio. Pagar, bosque y temperatura cuentan solos."
          onClick={() => dispatch({ type: 'registerAction', playerId: pid })}
        >
          <IconPlus size={15} /> Acción
        </button>
        <button className="btn small" disabled={done === 0} onClick={() => dispatch({ type: 'endTurn', playerId: pid })}>
          Terminar
        </button>
        <button className="btn small ghost" onClick={() => dispatch({ type: 'pass', playerId: pid })}>
          <IconPlayerSkipForward size={15} /> Pasar
        </button>
      </section>
    );
  }

  const passed = game.passed.includes(player.id);
  const turnPlayer = game.turn && game.players.find((p) => p.id === game.turn!.playerId);
  const status = game.researchPending
    ? 'Primero, la fase de investigación'
    : passed
      ? 'Pasaste en esta generación'
      : turnPlayer
        ? `Esperando · juega ${turnPlayer.name}`
        : 'Todos pasaron';

  return (
    <section className="turn-bar locked" aria-label="Turno">
      <IconLock size={16} aria-hidden />
      <span className="grow">{status}</span>
      <span className="muted small">acciones bloqueadas</span>
    </section>
  );
}
