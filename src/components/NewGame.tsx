import { useState, type FormEvent } from 'react';
import { PLAYER_COLORS } from '../game/constants';
import { createGame, type PlayerSetup } from '../game/logic';
import type { Game } from '../game/types';
import { ColorPicker } from './ColorPicker';

interface Props {
  onCreate: (game: Game) => void;
  onCancel: () => void;
}

const MAX_PLAYERS = 5;

const defaultName = () =>
  `Partida ${new Date().toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}`;

export function NewGame({ onCreate, onCancel }: Props) {
  const [name, setName] = useState(defaultName);
  const [players, setPlayers] = useState<PlayerSetup[]>([
    { name: 'Jugador 1', color: 'red', corporation: '', startingMC: 0 },
    { name: 'Jugador 2', color: 'green', corporation: '', startingMC: 0 },
  ]);
  const [corporateEra, setCorporateEra] = useState(true);
  const [venus, setVenus] = useState(false);

  const update = (i: number, patch: Partial<PlayerSetup>) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const addPlayer = () =>
    setPlayers((ps) => {
      const used = new Set(ps.map((p) => p.color));
      const color = PLAYER_COLORS.find((c) => !used.has(c.id))?.id ?? 'red';
      return [...ps, { name: `Jugador ${ps.length + 1}`, color, corporation: '', startingMC: 0 }];
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onCreate(createGame({ name, players, corporateEra, venus }));
  };

  return (
    <form className="page" onSubmit={submit}>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Volver">
          ←
        </button>
        <h1>Nueva partida</h1>
      </header>

      <label className="field">
        <span>Nombre de la partida</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <h2 className="section-title">
        Jugadores <span className="muted">({players.length}/{MAX_PLAYERS})</span>
      </h2>

      {players.map((p, i) => (
        <fieldset key={i} className="player-setup">
          <div className="row">
            <label className="field grow">
              <span>Nombre</span>
              <input value={p.name} onChange={(e) => update(i, { name: e.target.value })} />
            </label>
            {players.length > 1 && (
              <button
                type="button"
                className="icon-btn danger"
                aria-label={`Quitar ${p.name}`}
                onClick={() => setPlayers((ps) => ps.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            )}
          </div>
          <ColorPicker value={p.color} onChange={(color) => update(i, { color })} />
          <div className="row">
            <label className="field grow">
              <span>Corporación</span>
              <input
                placeholder="Opcional"
                value={p.corporation}
                onChange={(e) => update(i, { corporation: e.target.value })}
              />
            </label>
            <label className="field narrow">
              <span>M€ iniciales</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={p.startingMC || ''}
                placeholder="0"
                onChange={(e) => update(i, { startingMC: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
        </fieldset>
      ))}

      {players.length < MAX_PLAYERS && (
        <button type="button" className="btn ghost block" onClick={addPlayer}>
          + Agregar jugador
        </button>
      )}

      <h2 className="section-title">Opciones</h2>
      <label className="toggle">
        <input type="checkbox" checked={corporateEra} onChange={(e) => setCorporateEra(e.target.checked)} />
        <span>
          <strong>Era Corporativa</strong>
          <small>Si está apagada, todos empiezan con 1 de producción de cada recurso.</small>
        </span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={venus} onChange={(e) => setVenus(e.target.checked)} />
        <span>
          <strong>Venus Next</strong>
          <small>Agrega el medidor de Venus.</small>
        </span>
      </label>
      {players.length === 1 && (
        <p className="note">Modo solitario: empezás con 14 TR y tenés 14 generaciones para terraformar Marte.</p>
      )}

      <button type="submit" className="btn primary block">
        Empezar partida
      </button>
    </form>
  );
}
