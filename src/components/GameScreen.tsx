import { useState, type CSSProperties } from 'react';
import { SOLO_GENERATIONS, colorHex } from '../game/constants';
import { firstPlayer, isSolo, isTerraformed, type Action } from '../game/logic';
import type { Game } from '../game/types';
import { GlobalsPanel } from './GlobalsPanel';
import { PlayerBoard } from './PlayerBoard';
import { ProductionDialog } from './ProductionDialog';
import { LogDialog } from './LogDialog';

interface Props {
  game: Game;
  canUndo: boolean;
  dispatch: (action: Action) => void;
  onUndo: () => void;
  onExit: () => void;
}

export function GameScreen({ game, canUndo, dispatch, onUndo, onExit }: Props) {
  const [dialog, setDialog] = useState<'production' | 'log' | null>(null);
  const active = game.players.find((p) => p.id === game.activePlayerId) ?? game.players[0];
  const first = firstPlayer(game);
  const solo = isSolo(game);

  return (
    <div className="page game">
      <header className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Volver a partidas">
          ←
        </button>
        <div className="topbar-title">
          <h1>{game.name}</h1>
          <div className="muted">
            Generación {game.generation}
            {solo && ` / ${SOLO_GENERATIONS}`}
          </div>
        </div>
        <button className="icon-btn" onClick={() => setDialog('log')} aria-label="Registro">
          ☰
        </button>
      </header>

      {isTerraformed(game) && (
        <div className="banner">🪐 ¡Marte terraformado! Esta es la última generación.</div>
      )}
      {solo && !isTerraformed(game) && game.generation >= SOLO_GENERATIONS && (
        <div className="banner warn">Última generación del modo solitario.</div>
      )}

      <GlobalsPanel game={game} active={active} dispatch={dispatch} />

      {game.players.length > 1 && (
        <nav className="player-tabs" aria-label="Jugadores">
          {game.players.map((p) => (
            <button
              key={p.id}
              className={`player-tab ${p.id === active.id ? 'active' : ''}`}
              style={{ '--p-color': colorHex(p.color) } as CSSProperties}
              onClick={() => dispatch({ type: 'setActive', playerId: p.id })}
            >
              <span className="dot" />
              <span className="player-tab-name">{p.name}</span>
              <span className="player-tab-tr">{p.tr}</span>
              {p.id === first.id && (
                <span className="first-badge" title="Jugador inicial de esta generación">
                  1º
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      <PlayerBoard key={active.id} game={game} player={active} dispatch={dispatch} />

      <footer className="bottombar">
        <button className="btn ghost" disabled={!canUndo} onClick={onUndo}>
          ↶ Deshacer
        </button>
        <button className="btn primary grow" onClick={() => setDialog('production')}>
          Fase de producción ▶
        </button>
      </footer>

      {dialog === 'production' && (
        <ProductionDialog
          game={game}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            dispatch({ type: 'productionPhase' });
            setDialog(null);
          }}
        />
      )}
      {dialog === 'log' && <LogDialog game={game} onClose={() => setDialog(null)} />}
    </div>
  );
}
