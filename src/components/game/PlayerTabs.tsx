import { useEffect, useRef, type CSSProperties } from 'react';
import { colorHex } from '../../game/constants';
import { ACTIONS_PER_TURN, firstPlayer, scoreOf, type Action } from '../../game';
import type { Game } from '../../game/types';

/** Pestañas para elegir qué jugador se ve (partida en un solo celular). */
export function PlayerTabs({ game, activeId, dispatch }: { game: Game; activeId: string; dispatch: (a: Action) => void }) {
  const first = firstPlayer(game);
  const ref = useRef<HTMLElement>(null);
  // Mantiene visible la pestaña seleccionada cuando el turno pasa solo
  useEffect(() => {
    ref.current?.querySelector('.player-tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);
  return (
    <nav className="player-tabs" aria-label="Jugadores" ref={ref}>
      {game.players.map((p) => (
        <button
          key={p.id}
          className={`player-tab ${p.id === activeId ? 'active' : ''} ${game.passed.includes(p.id) ? 'passed' : ''}`}
          style={{ '--p-color': colorHex(p.color) } as CSSProperties}
          onClick={() => dispatch({ type: 'setActive', playerId: p.id })}
        >
          <span className="dot" />
          <span className="player-tab-name">{p.name}</span>
          <span className="player-tab-tr">{p.tr}</span>
          <TurnDots game={game} playerId={p.id} />
          {game.passed.includes(p.id) && <span className="tab-passed">pasó</span>}
          {p.id === first.id && (
            <span className="first-badge" title="Jugador inicial de esta generación">
              1º
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

/** La mesa en modo online: TR, PV y turno de todos, sin mostrar sus recursos. */
export function TableStrip({ game, me }: { game: Game; me: string }) {
  const first = firstPlayer(game);
  return (
    <ul className="table-strip" aria-label="Jugadores de la mesa">
      {game.players.map((p) => (
        <li
          key={p.id}
          className={`table-player ${game.turn?.playerId === p.id ? 'turn' : ''} ${game.passed.includes(p.id) ? 'passed' : ''}`}
          style={{ '--p-color': colorHex(p.color) } as CSSProperties}
        >
          <span className="table-name">
            <span className="dot" /> {p.id === me ? 'Vos' : p.name}
            {p.id === first.id && <span className="first-badge">1º</span>}
          </span>
          <span className="table-stats">
            {p.tr} TR · {scoreOf(game, p).total} PV
          </span>
          <span className="table-state">{game.passed.includes(p.id) ? 'pasó' : <TurnDots game={game} playerId={p.id} />}</span>
        </li>
      ))}
    </ul>
  );
}

/** Acciones usadas en el turno actual (solo para quien está de turno). */
function TurnDots({ game, playerId }: { game: Game; playerId: string }) {
  if (game.turn?.playerId !== playerId) return null;
  return (
    <span className="tab-dots" aria-label={`De turno, ${game.turn.actions} de ${ACTIONS_PER_TURN} acciones`}>
      {Array.from({ length: ACTIONS_PER_TURN }, (_, i) => (
        <i key={i} className={i < game.turn!.actions ? 'on' : ''} />
      ))}
    </span>
  );
}
