import { IconArrowLeft } from '@tabler/icons-react';
import { useState, type FormEvent } from 'react';
import { BOARDS, type BoardId } from '../game/boards';
import { PLAYER_COLORS } from '../game/constants';
import { createGame, type PlayerSetup } from '../game/logic';
import type { Game } from '../game/types';
import { PlayerSetupCard, setupProblems } from './PlayerSetupCard';

interface Props {
  onCreate: (game: Game) => void;
  onCancel: () => void;
}

const MAX_PLAYERS = 5;

const defaultName = () =>
  `Partida ${new Date().toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}`;

const newPlayer = (n: number, color: string): PlayerSetup => ({
  name: `Jugador ${n}`,
  color,
  corporationId: null,
  corporation: '',
  startingMC: 0,
  initialCards: 0,
  preludes: [],
});

export function NewGame({ onCreate, onCancel }: Props) {
  const [name, setName] = useState(defaultName);
  const [players, setPlayers] = useState<PlayerSetup[]>([newPlayer(1, 'red'), newPlayer(2, 'green')]);
  const [corporateEra, setCorporateEra] = useState(true);
  const [venus, setVenus] = useState(false);
  const [prelude, setPrelude] = useState(false);
  const [board, setBoard] = useState<BoardId>('tharsis');
  const selectedBoard = BOARDS.find((b) => b.id === board)!;

  const update = (i: number, patch: Partial<PlayerSetup>) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const addPlayer = () =>
    setPlayers((ps) => {
      const used = new Set(ps.map((p) => p.color));
      const color = PLAYER_COLORS.find((c) => !used.has(c.id))?.id ?? 'red';
      return [...ps, newPlayer(ps.length + 1, color)];
    });

  const hasProblems = players.some((p) => setupProblems(p, prelude).length > 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (hasProblems) return;
    onCreate(createGame({ name, players, corporateEra, venus, prelude, board }));
  };

  return (
    <form className="page" onSubmit={submit}>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Volver">
          <IconArrowLeft size={20} />
        </button>
        <h1>Nueva partida</h1>
      </header>

      <label className="field">
        <span>Nombre de la partida</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <h2 className="section-title">Mapa</h2>
      <div className="segmented three" role="radiogroup" aria-label="Mapa">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={board === b.id}
            className={board === b.id ? 'on' : ''}
            onClick={() => setBoard(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>
      <div className="setup-summary">
        <span>{selectedBoard.description}</span>
        <small className="muted">Hitos: {selectedBoard.milestones.map((m) => m.name).join(', ')}</small>
        <small className="muted">Premios: {selectedBoard.awards.map((a) => a.name).join(', ')}</small>
      </div>

      <h2 className="section-title">Opciones</h2>
      <label className="toggle">
        <input type="checkbox" checked={corporateEra} onChange={(e) => setCorporateEra(e.target.checked)} />
        <span>
          <strong>Era Corporativa</strong>
          <small>Si está apagada, todos empiezan con 1 de producción de cada recurso.</small>
        </span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={prelude} onChange={(e) => setPrelude(e.target.checked)} />
        <span>
          <strong>Prelude</strong>
          <small>Cada jugador elige 2 preludios y se aplican al empezar.</small>
        </span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={venus} onChange={(e) => setVenus(e.target.checked)} />
        <span>
          <strong>Venus Next</strong>
          <small>Agrega el medidor de Venus.</small>
        </span>
      </label>

      <h2 className="section-title">
        Jugadores <span className="muted">({players.length}/{MAX_PLAYERS})</span>
      </h2>

      {players.map((p, i) => {
        const others = players.filter((_, j) => j !== i);
        return (
          <PlayerSetupCard
            key={i}
            setup={p}
            index={i}
            withPreludes={prelude}
            takenCorporations={new Set(others.map((o) => o.corporationId).filter((id): id is string => !!id))}
            takenPreludes={new Set(others.flatMap((o) => o.preludes).filter(Boolean))}
            canRemove={players.length > 1}
            onChange={(patch) => update(i, patch)}
            onRemove={() => setPlayers((ps) => ps.filter((_, j) => j !== i))}
          />
        );
      })}

      {players.length < MAX_PLAYERS && (
        <button type="button" className="btn ghost block" onClick={addPlayer}>
          + Agregar jugador
        </button>
      )}

      {players.length === 1 && (
        <p className="note">Modo solitario: empezás con 14 TR y tenés 14 generaciones para terraformar Marte.</p>
      )}

      <button type="submit" className="btn primary block" disabled={hasProblems}>
        Empezar partida
      </button>
      {hasProblems && <p className="note">Revisá los avisos en rojo de cada jugador para poder empezar.</p>}
    </form>
  );
}
