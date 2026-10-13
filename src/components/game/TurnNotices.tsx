import { IconX } from '@tabler/icons-react';
import { ACTIONS_PER_TURN, isLastGeneration, type Action } from '../../game';
import type { Game } from '../../game/types';

interface Props {
  game: Game;
  activeId: string;
  /** Online: el jugador de este celular. */
  meId?: string;
  online: boolean;
  /** El aviso de fin de turno no fue cerrado en este celular. */
  showNotice: boolean;
  /** A este celular le falta la investigación (y el diálogo no está abierto). */
  myResearchPending: boolean;
  dispatch: (action: Action) => void;
  onDismissNotice: () => void;
  onResearch: () => void;
}

/** Avisos de la generación en curso: cambio de turno, investigación pendiente, todos pasaron. */
export function TurnNotices({
  game,
  activeId,
  meId,
  online,
  showNotice,
  myResearchPending,
  dispatch,
  onDismissNotice,
  onResearch,
}: Props) {
  const notice = showNotice ? game.turnNotice : null;
  const noticePlayer = notice && game.players.find((p) => p.id === notice.playerId);
  const turnPlayer = game.turn ? game.players.find((p) => p.id === game.turn!.playerId) : undefined;
  const researchWaiting = game.players.filter((p) => !game.researchDone.includes(p.id)).map((p) => p.name);

  return (
    <>
      {notice && noticePlayer && (
        <div className="notice" role="status">
          <span className="grow">
            {notice.reason === 'actions' && `${noticePlayer.name} completó ${ACTIONS_PER_TURN} acciones.`}
            {notice.reason === 'end' && `${noticePlayer.name} terminó su turno.`}
            {notice.reason === 'pass' && `${noticePlayer.name} pasó.`}{' '}
            {turnPlayer ? (turnPlayer.id === meId ? 'Te toca a vos.' : `Ahora juega ${turnPlayer.name}.`) : 'Todos pasaron.'}
          </span>
          {!online && notice.reason !== 'pass' && noticePlayer.id !== activeId && (
            <button className="btn small" onClick={() => dispatch({ type: 'setActive', playerId: noticePlayer.id })}>
              Ver {noticePlayer.name}
            </button>
          )}
          <button className="icon-btn mini" aria-label="Cerrar aviso" onClick={onDismissNotice}>
            <IconX size={16} />
          </button>
        </div>
      )}
      {myResearchPending && (
        <div className="notice" role="status">
          <span className="grow">
            {online ? 'Te falta comprar tus cartas' : 'Falta la fase de investigación'} de la generación {game.generation}.
          </span>
          <button className="btn small primary" onClick={onResearch}>
            Comprar cartas
          </button>
        </div>
      )}
      {/* Online: este celular ya compró y espera al resto */}
      {online && game.researchPending && !!meId && game.researchDone.includes(meId) && (
        <div className="notice" role="status">
          <span className="grow">Esperando que compren sus cartas: {researchWaiting.join(', ')}.</span>
        </div>
      )}
      {!game.turn && (
        <div className="banner warn">
          {isLastGeneration(game)
            ? 'Todos pasaron. Aplicá la producción final para terminar la partida.'
            : `Todos pasaron. Aplicá la fase de producción para empezar la generación ${game.generation + 1}.`}
        </div>
      )}
    </>
  );
}
