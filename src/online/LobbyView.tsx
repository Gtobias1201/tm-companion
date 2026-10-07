import { IconArrowLeft, IconCheck, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BOARDS, type BoardId } from '../game/boards';
import { findCorporation } from '../game/catalog';
import { colorHex } from '../game/constants';
import { setupProblems, type PlayerSetup } from '../game/logic';
import type { Lobby, LobbyOptions } from '../net/protocol';
import { PlayerSetupCard } from '../components/PlayerSetupCard';
import { InviteCard } from './InviteCard';

interface Props {
  lobby: Lobby;
  myClientId: string;
  isHost: boolean;
  status: ReactNode;
  onSeat: (setup: PlayerSetup, ready: boolean) => void;
  onLeave: () => void;
  /** Solo el anfitrión: */
  onOptions?: (patch: { name?: string; options?: Partial<LobbyOptions> }) => void;
  onRemove?: (clientId: string) => void;
  onStart?: () => void;
  startProblems?: string[];
}

const SEND_DELAY_MS = 300;

export function LobbyView({
  lobby,
  myClientId,
  isHost,
  status,
  onSeat,
  onLeave,
  onOptions,
  onRemove,
  onStart,
  startProblems = [],
}: Props) {
  const mySeat = lobby.seats.find((s) => s.clientId === myClientId);
  const others = lobby.seats.filter((s) => s.clientId !== myClientId);
  const withPreludes = lobby.options.prelude;

  // Borrador local: escribir el nombre no espera la ida y vuelta al anfitrión
  const [draft, setDraft] = useState<PlayerSetup | null>(mySeat?.setup ?? null);
  const sendTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!draft && mySeat) setDraft(mySeat.setup);
  }, [draft, mySeat]);

  const changeSetup = (patch: Partial<PlayerSetup>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    window.clearTimeout(sendTimer.current);
    // Cualquier cambio deja al jugador como "no listo" hasta que vuelva a confirmar
    sendTimer.current = window.setTimeout(() => onSeat(next, false), SEND_DELAY_MS);
  };

  const myProblems = draft ? setupProblems(draft, withPreludes) : [];
  const board = BOARDS.find((b) => b.id === lobby.options.board)!;

  return (
    <div className="page lobby">
      <header className="topbar">
        <button className="icon-btn" onClick={onLeave} aria-label="Salir de la sala">
          <IconArrowLeft size={20} />
        </button>
        <div className="topbar-title">
          <h1>Sala de espera</h1>
          <div className="muted">{status}</div>
        </div>
      </header>

      <InviteCard code={lobby.code} />

      <h2 className="section-title">Partida</h2>
      {isHost && onOptions ? (
        <div className="lobby-options">
          <label className="field">
            <span>Nombre de la partida</span>
            <input value={lobby.name} onChange={(e) => onOptions({ name: e.target.value })} />
          </label>
          <div className="segmented three" role="radiogroup" aria-label="Mapa">
            {BOARDS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={lobby.options.board === b.id}
                className={lobby.options.board === b.id ? 'on' : ''}
                onClick={() => onOptions({ options: { board: b.id as BoardId } })}
              >
                {b.name}
              </button>
            ))}
          </div>
          {(
            [
              ['corporateEra', 'Era Corporativa', 'Si está apagada, todos empiezan con 1 de producción de cada recurso.'],
              ['prelude', 'Prelude', 'Cada jugador elige 2 preludios.'],
              ['venus', 'Venus Next', 'Agrega el medidor de Venus.'],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} className="toggle">
              <input
                type="checkbox"
                checked={lobby.options[key]}
                onChange={(e) => onOptions({ options: { [key]: e.target.checked } })}
              />
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="setup-summary">
          <span>
            <strong>{lobby.name}</strong> · mapa {board.name}
          </span>
          <small className="muted">
            {[
              lobby.options.corporateEra && 'Era Corporativa',
              lobby.options.prelude && 'Prelude',
              lobby.options.venus && 'Venus Next',
            ]
              .filter(Boolean)
              .join(' · ') || 'Juego base'}
          </small>
        </div>
      )}

      <h2 className="section-title">
        Jugadores <span className="muted">({lobby.seats.length}/5)</span>
      </h2>
      <ul className="lobby-seats">
        {lobby.seats.map((s) => (
          <li key={s.clientId} className="lobby-seat" style={{ '--p-color': colorHex(s.setup.color) } as CSSProperties}>
            <span className="dot" />
            <span className="grow">
              <strong>
                {s.setup.name}
                {s.clientId === myClientId && ' (vos)'}
              </strong>
              <small className="muted">
                {findCorporation(s.setup.corporationId)?.name ?? (s.setup.corporation || 'Sin corporación')}
                {!s.connected && ' · desconectado'}
              </small>
            </span>
            <span className={`seat-state ${s.ready ? 'ready' : ''}`}>
              {s.ready ? (
                <>
                  <IconCheck size={14} aria-hidden /> Listo
                </>
              ) : (
                'Armando…'
              )}
            </span>
            {isHost && onRemove && s.clientId !== myClientId && (
              <button className="icon-btn mini" aria-label={`Sacar a ${s.setup.name}`} onClick={() => onRemove(s.clientId)}>
                <IconX size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {draft && mySeat && (
        <>
          <h2 className="section-title">Tu jugador</h2>
          <PlayerSetupCard
            setup={draft}
            index={lobby.seats.indexOf(mySeat)}
            withPreludes={withPreludes}
            takenCorporations={new Set(others.map((o) => o.setup.corporationId).filter((id): id is string => !!id))}
            takenPreludes={new Set(withPreludes ? others.flatMap((o) => o.setup.preludes).filter(Boolean) : [])}
            canRemove={false}
            onChange={changeSetup}
            onRemove={() => undefined}
          />
          <button
            className={`btn block ${mySeat.ready ? '' : 'primary'}`}
            disabled={!mySeat.ready && myProblems.length > 0}
            onClick={() => {
              window.clearTimeout(sendTimer.current);
              onSeat(draft, !mySeat.ready);
            }}
          >
            {mySeat.ready ? 'Cambiar mi elección' : 'Estoy listo'}
          </button>
        </>
      )}

      {isHost && onStart && (
        <>
          <button className="btn primary block" disabled={startProblems.length > 0} onClick={onStart}>
            Empezar partida
          </button>
          {startProblems.map((p) => (
            <p key={p} className="note">
              {p}
            </p>
          ))}
        </>
      )}
      {!isHost && <p className="note">El anfitrión empieza la partida cuando todos estén listos.</p>}
    </div>
  );
}
