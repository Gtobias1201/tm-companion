import {
  IconArrowBackUp,
  IconArrowLeft,
  IconCards,
  IconChevronRight,
  IconHelp,
  IconHistory,
  IconPlanet,
} from '@tabler/icons-react';
import { useEffect, useState, type ReactNode } from 'react';
import { SOLO_GENERATIONS } from '../../game/constants';
import { isLastGeneration, isSolo, isTerraformed, type Action } from '../../game';
import type { Game } from '../../game/types';
import { GlobalsPanel } from './GlobalsPanel';
import { PlayerBoard } from './PlayerBoard';
import { ProductionDialog } from './ProductionDialog';
import { LogDialog } from './LogDialog';
import { ResearchDialog } from './ResearchDialog';
import { MilestonesPanel } from './MilestonesPanel';
import { ScorePanel } from './ScorePanel';
import { FinalPhase } from './FinalPhase';
import { Guide } from '../guide/Guide';
import { PlayerTabs, TableStrip } from './PlayerTabs';
import { TurnNotices } from './TurnNotices';

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
  /** Cartel de conexión (este celular o algún jugador desconectado). */
  alert?: ReactNode;
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
  const [guide, setGuide] = useState(false);
  // En online los avisos se cierran solo en este celular, no para toda la mesa
  const [dismissedNotice, setDismissedNotice] = useState<number | null>(null);
  const [dismissedReminder, setDismissedReminder] = useState<string | null>(null);

  const meId = online?.me;
  const active = game.players.find((p) => p.id === (meId ?? game.activePlayerId)) ?? game.players[0];
  const solo = isSolo(game);
  const turnPlayer = game.turn ? game.players.find((p) => p.id === game.turn!.playerId) : undefined;
  const reminder = game.reminder && dismissedReminder !== game.reminder.text ? game.reminder : null;
  const playing = game.phase === 'playing';
  const lastGeneration = isLastGeneration(game);
  const myResearchPending = game.researchPending && (!meId || !game.researchDone.includes(meId));
  // Online, la producción se aplica recién cuando todos pasaron
  const canProduce = playing && (!online || !game.turn);

  // Online, cada uno compra sus cartas apenas empieza la generación
  useEffect(() => {
    if (online && myResearchPending) setDialog('research');
  }, [online, myResearchPending, game.generation]);

  const dismissNotice = () => (online ? setDismissedNotice(game.log.length) : dispatch({ type: 'dismissNotice' }));
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
        <button className="icon-btn" onClick={() => setGuide(true)} aria-label="Guía de uso">
          <IconHelp size={20} />
        </button>
      </header>
      {online?.alert}

      {playing && isTerraformed(game) && (
        <div className="banner">
          <IconPlanet size={18} /> ¡Marte terraformado! Es la última generación: después de la producción termina la partida.
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
          <TurnNotices
            game={game}
            activeId={active.id}
            meId={meId}
            online={!!online}
            showNotice={dismissedNotice !== game.log.length}
            myResearchPending={myResearchPending && dialog !== 'research'}
            dispatch={dispatch}
            onDismissNotice={dismissNotice}
            onResearch={() => setDialog('research')}
          />

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
          {online
            ? view === 'score' && <TableStrip game={game} me={online.me} />
            : game.players.length > 1 && <PlayerTabs game={game} activeId={active.id} dispatch={dispatch} />}

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
      {guide && <Guide onClose={() => setGuide(false)} />}
    </div>
  );
}
