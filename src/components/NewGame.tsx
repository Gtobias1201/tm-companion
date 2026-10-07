import { IconArrowLeft } from '@tabler/icons-react';
import { useState, type FormEvent } from 'react';
import { BOARDS, type BoardId } from '../game/boards';
import { createGame, newPlayerSetup, setupProblems, type PlayerSetup } from '../game/logic';
import type { Game } from '../game/types';
import { PlayerSetupCard } from './PlayerSetupCard';

interface Props {
  onCreate: (game: Game) => void;
  onCancel: () => void;
}

const defaultName = () =>
  `Partida ${new Date().toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}`;

/** Partida solitaria, sin conexión. Las partidas de varios jugadores se arman online. */
export function NewGame({ onCreate, onCancel }: Props) {
  const [name, setName] = useState(defaultName);
  const [player, setPlayer] = useState<PlayerSetup>(() => ({ ...newPlayerSetup(1, 'red'), name: 'Yo' }));
  const [corporateEra, setCorporateEra] = useState(true);
  const [venus, setVenus] = useState(false);
  const [prelude, setPrelude] = useState(false);
  const [board, setBoard] = useState<BoardId>('tharsis');
  const selectedBoard = BOARDS.find((b) => b.id === board)!;

  const hasProblems = setupProblems(player, prelude).length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (hasProblems) return;
    onCreate(createGame({ name, players: [player], corporateEra, venus, prelude, board }));
  };

  return (
    <form className="page" onSubmit={submit}>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Volver">
          <IconArrowLeft size={20} />
        </button>
        <h1>Partida solitaria</h1>
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

      <h2 className="section-title">Tu jugador</h2>
      <PlayerSetupCard
        setup={player}
        index={0}
        withPreludes={prelude}
        takenCorporations={new Set()}
        takenPreludes={new Set()}
        canRemove={false}
        onChange={(patch) => setPlayer((p) => ({ ...p, ...patch }))}
        onRemove={() => undefined}
      />
      <p className="note">Empezás con 14 TR y tenés 14 generaciones para terraformar Marte.</p>

      <button type="submit" className="btn primary block" disabled={hasProblems}>
        Empezar partida
      </button>
      {hasProblems && <p className="note">Revisá los avisos en rojo para poder empezar.</p>}
    </form>
  );
}
