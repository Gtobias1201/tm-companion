import {
  IconArrowBackUp,
  IconArrowLeft,
  IconCards,
  IconChevronRight,
  IconHistory,
  IconPlanet,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SOLO_GENERATIONS, colorHex } from '../game/constants';
import { ACTIONS_PER_TURN, firstPlayer, isLastGeneration, isSolo, isTerraformed, type Action } from '../game/logic';
import type { Game } from '../game/types';
import { GlobalsPanel } from './GlobalsPanel';
import { PlayerBoard } from './PlayerBoard';
import { ProductionDialog } from './ProductionDialog';
import { LogDialog } from './LogDialog';
import { ResearchDialog } from './ResearchDialog';
import { MilestonesPanel } from './MilestonesPanel';
import { ScorePanel } from './ScorePanel';
import { FinalPhase } from './FinalPhase';

type View = 'player' | 'milestones' | 'score';

const VIEWS: { id: View; label: string }[] = [
  { id: 'player', label: 'Jugador' },
  { id: 'milestones', label: 'Hitos y premios' },
  { id: 'score', label: 'Puntos' },
];

interface Props {
  game: Game;
  canUndo: boolean;
  dispatch: (action: Action) => void;
  onUndo: () => void;
  onExit: () => void;
}

export function GameScreen({ game, canUndo, dispatch, onUndo, onExit }: Props) {
  const [dialog, setDialog] = useState<'production' | 'research' | 'log' | null>(null);
  const [view, setView] = useState<View>('player');
  const active = game.players.find((p) => p.id === game.activePlayerId) ?? game.players[0];
  const first = firstPlayer(game);
  const solo = isSolo(game);
  const turnPlayer = game.turn ? game.players.find((p) => p.id === game.turn!.playerId) : undefined;
  const notice = game.turnNotice;
  const noticePlayer = notice && game.players.find((p) => p.id === notice.playerId);
  const tabsRef = useRef<HTMLElement>(null);
  const playing = game.phase === 'playing';
  const lastGeneration = isLastGeneration(game);

  // Mantiene visible la pestaña del jugador seleccionado cuando el turno pasa solo
  useEffect(() => {
    tabsRef.current?.querySelector('.player-tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active.id]);

  return (
    <div className="page game">
      <header className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Volver a partidas">
          <IconArrowLeft size={20} />
        </button>
        <div className="topbar-title">
          <h1>{game.name}</h1>
          <div className="muted">
            {!playing
              ? game.phase === 'finished'
                ? 'Partida terminada'
                : 'Fin de la partida'
              : turnPlayer
                ? `Turno de ${turnPlayer.name}`
                : 'Todos pasaron'}
          </div>
        </div>
        <div className="gen-badge" aria-label={`Generación ${game.generation}`}>
          <span className="gen-label">Gen</span>
          <span className="gen-num">
            {game.generation}
            {solo && <small>/{SOLO_GENERATIONS}</small>}
          </span>
        </div>
        <button className="icon-btn" onClick={() => setDialog('log')} aria-label="Registro">
          <IconHistory size={20} />
        </button>
      </header>

      {playing && isTerraformed(game) && (
        <div className="banner">
          <IconPlanet size={18} /> ¡Marte terraformado! Es la última generación: después de la producción termina la
          partida.
        </div>
      )}
      {playing && solo && !isTerraformed(game) && game.generation >= SOLO_GENERATIONS && (
        <div className="banner warn">Última generación del modo solitario.</div>
      )}

      {game.reminder && (
        <div className="reminder" role="alert">
          <IconCards size={22} aria-hidden />
          <span className="grow">{game.reminder.text}</span>
          <button className="btn small" onClick={() => dispatch({ type: 'dismissReminder' })}>
            Listo
          </button>
        </div>
      )}
      {!playing && <FinalPhase game={game} dispatch={dispatch} />}

      {playing && (
        <>
          {notice && noticePlayer && (
            <div className="notice" role="status">
              <span className="grow">
                {notice.reason === 'actions' && `${noticePlayer.name} completó ${ACTIONS_PER_TURN} acciones.`}
                {notice.reason === 'end' && `${noticePlayer.name} terminó su turno.`}
                {notice.reason === 'pass' && `${noticePlayer.name} pasó.`}{' '}
                {turnPlayer ? `Ahora juega ${turnPlayer.name}.` : 'Todos pasaron.'}
              </span>
              {notice.reason !== 'pass' && noticePlayer.id !== active.id && (
                <button className="btn small" onClick={() => dispatch({ type: 'setActive', playerId: noticePlayer.id })}>
                  Ver {noticePlayer.name}
                </button>
              )}
              <button className="icon-btn mini" aria-label="Cerrar aviso" onClick={() => dispatch({ type: 'dismissNotice' })}>
                <IconX size={16} />
              </button>
            </div>
          )}
          {game.researchPending && dialog !== 'research' && (
            <div className="notice" role="status">
              <span className="grow">Falta la fase de investigación de la generación {game.generation}.</span>
              <button className="btn small primary" onClick={() => setDialog('research')}>
                Comprar cartas
              </button>
            </div>
          )}
          {!game.turn && (
            <div className="banner warn">
              {lastGeneration
                ? 'Todos pasaron. Aplicá la producción final para terminar la partida.'
                : `Todos pasaron. Aplicá la fase de producción para empezar la generación ${game.generation + 1}.`}
            </div>
          )}

          <div className="segmented three" role="tablist" aria-label="Vista">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={view === v.id}
                className={view === v.id ? 'on' : ''}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>

          {view === 'player' && <GlobalsPanel game={game} active={active} dispatch={dispatch} />}

          {game.players.length > 1 && (
            <nav className="player-tabs" aria-label="Jugadores" ref={tabsRef}>
              {game.players.map((p) => (
                <button
                  key={p.id}
                  className={`player-tab ${p.id === active.id ? 'active' : ''} ${game.passed.includes(p.id) ? 'passed' : ''}`}
                  style={{ '--p-color': colorHex(p.color) } as CSSProperties}
                  onClick={() => dispatch({ type: 'setActive', playerId: p.id })}
                >
                  <span className="dot" />
                  <span className="player-tab-name">{p.name}</span>
                  <span className="player-tab-tr">{p.tr}</span>
                  {game.turn?.playerId === p.id && (
                    <span className="tab-dots" aria-label={`De turno, ${game.turn.actions} de ${ACTIONS_PER_TURN} acciones`}>
                      {Array.from({ length: ACTIONS_PER_TURN }, (_, i) => (
                        <i key={i} className={i < game.turn!.actions ? 'on' : ''} />
                      ))}
                    </span>
                  )}
                  {game.passed.includes(p.id) && <span className="tab-passed">pasó</span>}
                  {p.id === first.id && (
                    <span className="first-badge" title="Jugador inicial de esta generación">
                      1º
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}

          {view === 'player' && <PlayerBoard key={active.id} game={game} player={active} dispatch={dispatch} />}
          {view === 'milestones' && <MilestonesPanel game={game} active={active} dispatch={dispatch} />}
          {view === 'score' && <ScorePanel game={game} active={active} dispatch={dispatch} />}
        </>
      )}

      <footer className="bottombar">
        <button className="btn ghost" disabled={!canUndo} onClick={onUndo}>
          <IconArrowBackUp size={18} /> Deshacer
        </button>
        {playing && (
          <button className="btn primary grow" onClick={() => setDialog('production')}>
            {lastGeneration ? 'Producción final' : 'Fase de producción'} <IconChevronRight size={18} />
          </button>
        )}
      </footer>

      {dialog === 'production' && (
        <ProductionDialog
          game={game}
          final={lastGeneration}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            dispatch({ type: 'productionPhase' });
            // Lo primero de la generación nueva es comprar cartas
            setDialog('research');
          }}
        />
      )}
      {dialog === 'research' && game.researchPending && (
        <ResearchDialog
          game={game}
          onClose={() => setDialog(null)}
          onConfirm={(purchases) => {
            dispatch({ type: 'research', purchases });
            setDialog(null);
          }}
        />
      )}
      {dialog === 'log' && <LogDialog game={game} onClose={() => setDialog(null)} />}
    </div>
  );
}
