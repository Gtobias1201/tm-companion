import {
  IconArrowBackUp,
  IconArrowLeft,
  IconCards,
  IconChevronRight,
  IconHistory,
  IconPlanet,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SOLO_GENERATIONS, colorHex } from '../game/constants';
import {
  ACTIONS_PER_TURN,
  firstPlayer,
  isLastGeneration,
  isSolo,
  isTerraformed,
  scoreOf,
  type Action,
} from '../game/logic';
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

/** Partida online vista desde un celular: solo se controla el propio jugador. */
export interface OnlineView {
  me: string;
  isHost: boolean;
  status: ReactNode;
  /** Deshacer general del anfitrión (cualquier jugador). */
  canUndoAny?: boolean;
  onUndoAny?: () => void;
}

interface Props {
  game: Game;
  canUndo: boolean;
  dispatch: (action: Action) => void;
  onUndo: () => void;
  onExit: () => void;
  online?: OnlineView;
}

export function GameScreen({ game, canUndo, dispatch, onUndo, onExit, online }: Props) {
  const [dialog, setDialog] = useState<'production' | 'research' | 'log' | null>(null);
  const [view, setView] = useState<View>('player');
  // En online los avisos se cierran solo en este celular, no para toda la mesa
  const [dismissedNotice, setDismissedNotice] = useState<number | null>(null);
  const [dismissedReminder, setDismissedReminder] = useState<string | null>(null);

  const meId = online?.me;
  const active = game.players.find((p) => p.id === (meId ?? game.activePlayerId)) ?? game.players[0];
  const first = firstPlayer(game);
  const solo = isSolo(game);
  const turnPlayer = game.turn ? game.players.find((p) => p.id === game.turn!.playerId) : undefined;
  const notice = game.turnNotice && dismissedNotice !== game.log.length ? game.turnNotice : null;
  const noticePlayer = notice && game.players.find((p) => p.id === notice.playerId);
  const reminder = game.reminder && dismissedReminder !== game.reminder.text ? game.reminder : null;
  const tabsRef = useRef<HTMLElement>(null);
  const playing = game.phase === 'playing';
  const lastGeneration = isLastGeneration(game);
  const myResearchPending = game.researchPending && (!meId || !game.researchDone.includes(meId));
  const researchWaiting = game.players.filter((p) => !game.researchDone.includes(p.id)).map((p) => p.name);
  // Online, la producción se aplica recién cuando todos pasaron
  const canProduce = playing && (!online || !game.turn);

  // Mantiene visible la pestaña del jugador seleccionado cuando el turno pasa solo
  useEffect(() => {
    tabsRef.current?.querySelector('.player-tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active.id]);

  // Online, cada uno compra sus cartas apenas empieza la generación
  useEffect(() => {
    if (online && myResearchPending) setDialog('research');
  }, [online, myResearchPending, game.generation]);

  const dismissNotice = () =>
    online ? setDismissedNotice(game.log.length) : dispatch({ type: 'dismissNotice' });
  const dismissReminder = () =>
    online ? setDismissedReminder(game.reminder?.text ?? null) : dispatch({ type: 'dismissReminder' });

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
                ? turnPlayer.id === meId
                  ? 'Es tu turno'
                  : `Turno de ${turnPlayer.name}`
                : 'Todos pasaron'}
          </div>
          {online && <div className="topbar-status">{online.status}</div>}
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

      {reminder && (
        <div className="reminder" role="alert">
          <IconCards size={22} aria-hidden />
          <span className="grow">{reminder.text}</span>
          <button className="btn small" onClick={dismissReminder}>
            Listo
          </button>
        </div>
      )}
      {!playing && <FinalPhase game={game} dispatch={dispatch} me={meId} isHost={online?.isHost} />}

      {playing && (
        <>
          {notice && noticePlayer && (
            <div className="notice" role="status">
              <span className="grow">
                {notice.reason === 'actions' && `${noticePlayer.name} completó ${ACTIONS_PER_TURN} acciones.`}
                {notice.reason === 'end' && `${noticePlayer.name} terminó su turno.`}
                {notice.reason === 'pass' && `${noticePlayer.name} pasó.`}{' '}
                {turnPlayer ? (turnPlayer.id === meId ? 'Te toca a vos.' : `Ahora juega ${turnPlayer.name}.`) : 'Todos pasaron.'}
              </span>
              {!online && notice.reason !== 'pass' && noticePlayer.id !== active.id && (
                <button className="btn small" onClick={() => dispatch({ type: 'setActive', playerId: noticePlayer.id })}>
                  Ver {noticePlayer.name}
                </button>
              )}
              <button className="icon-btn mini" aria-label="Cerrar aviso" onClick={dismissNotice}>
                <IconX size={16} />
              </button>
            </div>
          )}
          {myResearchPending && dialog !== 'research' && (
            <div className="notice" role="status">
              <span className="grow">
                {online ? 'Te falta comprar tus cartas' : 'Falta la fase de investigación'} de la generación{' '}
                {game.generation}.
              </span>
              <button className="btn small primary" onClick={() => setDialog('research')}>
                Comprar cartas
              </button>
            </div>
          )}
          {online && game.researchPending && !myResearchPending && (
            <div className="notice" role="status">
              <span className="grow">Esperando que compren sus cartas: {researchWaiting.join(', ')}.</span>
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

          {/* Online, la mesa se ve en "Puntos" para que la vista principal entre en una pantalla */}
          {online ? (
            view === 'score' && <TableStrip game={game} me={online.me} />
          ) : (
            game.players.length > 1 && (
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
            )
          )}

          {view === 'player' && <PlayerBoard key={active.id} game={game} player={active} dispatch={dispatch} />}
          {view === 'milestones' && <MilestonesPanel game={game} active={active} dispatch={dispatch} />}
          {view === 'score' && <ScorePanel game={game} active={active} dispatch={dispatch} />}
        </>
      )}

      <footer className="bottombar">
        <button className="btn ghost" disabled={!canUndo} onClick={onUndo}>
          <IconArrowBackUp size={18} /> {online ? 'Deshacer lo mío' : 'Deshacer'}
        </button>
        {canProduce && (
          <button className="btn primary grow" onClick={() => setDialog('production')}>
            {lastGeneration ? 'Producción final' : 'Fase de producción'} <IconChevronRight size={18} />
          </button>
        )}
      </footer>

      {dialog === 'production' && (
        <ProductionDialog
          game={game}
          final={lastGeneration}
          onlyPlayerId={meId}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            dispatch({ type: 'productionPhase' });
            // Lo primero de la generación nueva es comprar cartas
            setDialog(online ? null : 'research');
          }}
        />
      )}
      {dialog === 'research' && myResearchPending && (
        <ResearchDialog
          game={game}
          onlyPlayerId={meId}
          onClose={() => setDialog(null)}
          onConfirm={(purchases) => {
            if (meId) dispatch({ type: 'researchBuy', playerId: meId, cards: purchases[meId] ?? 0 });
            else dispatch({ type: 'research', purchases });
            setDialog(null);
          }}
        />
      )}
      {dialog === 'log' && (
        <LogDialog
          game={game}
          onClose={() => setDialog(null)}
          footer={
            online?.isHost && online.onUndoAny ? (
              <button className="btn ghost grow" disabled={!online.canUndoAny} onClick={online.onUndoAny}>
                <IconArrowBackUp size={18} /> Deshacer la última acción de la mesa
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}

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

/** La mesa en modo online: TR, PV y turno de todos, sin mostrar sus recursos. */
function TableStrip({ game, me }: { game: Game; me: string }) {
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
          <span className="table-state">
            {game.passed.includes(p.id) ? 'pasó' : <TurnDots game={game} playerId={p.id} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
