import { IconLock, IconPlayerSkipForward, IconPlus } from '@tabler/icons-react';
import { ACTIONS_PER_TURN, isTurnOf, type Action } from '../game/logic';
import type { Game, Player } from '../game/types';

interface Props {
  game: Game;
  player: Player;
  dispatch: (action: Action) => void;
}

export function TurnPanel({ game, player, dispatch }: Props) {
  const total = game.actionsThisGen[player.id] ?? 0;
  const totalText = `${total} acci${total === 1 ? 'ón' : 'ones'} en esta generación`;

  if (game.turn && isTurnOf(game, player.id)) {
    const done = game.turn.actions;
    const pid = player.id;
    return (
      <section className="turn-panel is-turn" aria-label="Turno">
        <div className="turn-head">
          <div>
            <div className="turn-title">Tu turno · acción {done + 1} de {ACTIONS_PER_TURN}</div>
            <div className="muted small">{totalText}</div>
          </div>
          <div className="action-dots" role="img" aria-label={`${done} de ${ACTIONS_PER_TURN} acciones`}>
            {Array.from({ length: ACTIONS_PER_TURN }, (_, i) => (
              <span key={i} className={i < done ? 'on' : ''} />
            ))}
          </div>
        </div>
        <div className="turn-btns">
          <button className="btn small" onClick={() => dispatch({ type: 'registerAction', playerId: pid })}>
            <IconPlus size={16} /> Acción
          </button>
          <button
            className="btn small"
            disabled={done === 0}
            onClick={() => dispatch({ type: 'endTurn', playerId: pid })}
          >
            Terminar
          </button>
          <button className="btn small ghost" onClick={() => dispatch({ type: 'pass', playerId: pid })}>
            <IconPlayerSkipForward size={16} /> Pasar
          </button>
        </div>
        <p className="hint">
          Pagar, bosque y temperatura cuentan solos. Usá "+ Acción" para acciones de cartas, hitos, premios o
          comercio.
        </p>
      </section>
    );
  }

  const passed = game.passed.includes(player.id);
  const turnPlayer = game.turn && game.players.find((p) => p.id === game.turn!.playerId);
  const status = game.researchPending
    ? 'Primero, la fase de investigación'
    : passed
      ? 'Pasó en esta generación'
      : turnPlayer
        ? `Esperando su turno · juega ${turnPlayer.name}`
        : 'Todos pasaron';

  return (
    <section className="turn-panel locked" aria-label="Turno">
      <IconLock size={18} aria-hidden />
      <div className="grow">
        <div className="turn-title">{status}</div>
        <div className="muted small">{totalText} · las acciones están bloqueadas</div>
      </div>
    </section>
  );
}
