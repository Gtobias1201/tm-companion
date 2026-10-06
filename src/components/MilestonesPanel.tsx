import { IconAward, IconCheck, IconFlag } from '@tabler/icons-react';
import { useState, type CSSProperties } from 'react';
import {
  AWARD_COSTS,
  AWARD_VP,
  MAX_MILESTONES,
  MILESTONE_COST,
  MILESTONE_VP,
  findBoard,
  type MilestoneDef,
} from '../game/boards';
import { colorHex } from '../game/constants';
import { isTurnOf, type Action } from '../game/logic';
import type { Game, Player } from '../game/types';

interface Props {
  game: Game;
  active: Player;
  dispatch: (action: Action) => void;
}

export function MilestonesPanel({ game, active, dispatch }: Props) {
  const board = findBoard(game.options.board);
  const playerOf = (id: string) => game.players.find((p) => p.id === id);
  const canAct = isTurnOf(game, active.id);
  const milestonesFull = game.milestones.length >= MAX_MILESTONES;
  const nextAwardCost = AWARD_COSTS[game.awards.length];
  /** Hito para el que se le está preguntando el valor al jugador. */
  const [asking, setAsking] = useState<string | null>(null);

  const canClaim = canAct && !milestonesFull && active.resources.megacredits >= MILESTONE_COST;

  return (
    <div className="milestones">
      {!canAct && (
        <p className="hint">
          Reclamar un hito o financiar un premio es una acción: solo puede hacerlo el jugador de turno.
        </p>
      )}

      <section className="ma-section" aria-label="Hitos">
        <div className="ma-head">
          <h2>
            <IconFlag size={18} aria-hidden /> Hitos
          </h2>
          <span className="muted small">
            {game.milestones.length}/{MAX_MILESTONES} reclamados · {MILESTONE_COST} M€ · {MILESTONE_VP} PV
          </span>
        </div>
        {board.milestones.map((m) => {
          const claim = game.milestones.find((c) => c.id === m.id);
          const owner = claim && playerOf(claim.playerId);
          const value = m.value?.(active, game);
          const meets = value !== undefined && value >= m.threshold;
          return (
            <div key={m.id} className={`ma-row ${claim ? 'taken' : ''}`}>
              <div className="ma-top">
                <div className="ma-info">
                  <strong>{m.name}</strong>
                  <small className="muted">{m.description}</small>
                  {!claim && value !== undefined && (
                    <small className={meets ? 'ma-ok' : 'muted'}>
                      {meets && <IconCheck size={12} aria-hidden />} {active.name}: {value}/{m.threshold}
                    </small>
                  )}
                </div>
                {owner ? (
                  <span className="ma-owner" style={{ '--p-color': colorHex(owner.color) } as CSSProperties}>
                    <span className="dot" /> {owner.name}
                  </span>
                ) : (
                  <button
                    className="btn small"
                    // Los medibles se verifican solos; los demás preguntan el valor antes de reclamar
                    disabled={!canClaim || (m.value !== undefined && !meets) || asking === m.id}
                    onClick={() =>
                      m.value
                        ? dispatch({ type: 'claimMilestone', playerId: active.id, milestoneId: m.id })
                        : setAsking(m.id)
                    }
                  >
                    Reclamar
                  </button>
                )}
              </div>
              {asking === m.id && !claim && (
                <ClaimPrompt
                  milestone={m}
                  onCancel={() => setAsking(null)}
                  onConfirm={(declared) => {
                    dispatch({ type: 'claimMilestone', playerId: active.id, milestoneId: m.id, declared });
                    setAsking(null);
                  }}
                />
              )}
            </div>
          );
        })}
      </section>

      <section className="ma-section" aria-label="Premios">
        <div className="ma-head">
          <h2>
            <IconAward size={18} aria-hidden /> Premios
          </h2>
          <span className="muted small">
            {game.awards.length}/{AWARD_COSTS.length} financiados
            {nextAwardCost !== undefined && ` · próximo ${nextAwardCost} M€`}
          </span>
        </div>
        {board.awards.map((aw) => {
          const claim = game.awards.find((c) => c.id === aw.id);
          const funder = claim && playerOf(claim.playerId);
          const leader = aw.metric && leaderOf(game.players, aw.metric);
          return (
            <div key={aw.id} className={`ma-row ${claim ? 'funded' : ''}`}>
              <div className="ma-top">
                <div className="ma-info">
                  <strong>{aw.name}</strong>
                  <small className="muted">{aw.description}</small>
                  {leader && <small className="muted">Va ganando: {leader}</small>}
                  {funder && <small className="muted">Financiado por {funder.name}</small>}
                </div>
                {claim ? (
                  <span className="ma-badge">
                    {AWARD_VP.first}/{AWARD_VP.second} PV
                  </span>
                ) : (
                  <button
                    className="btn small"
                    disabled={
                      !canAct || nextAwardCost === undefined || active.resources.megacredits < nextAwardCost
                    }
                    onClick={() => dispatch({ type: 'fundAward', playerId: active.id, awardId: aw.id })}
                  >
                    Financiar
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <p className="hint">
          Los premios se resuelven al final: {AWARD_VP.first} PV al primero y {AWARD_VP.second} al segundo (con 2
          jugadores solo puntúa el primero).
        </p>
      </section>
    </div>
  );
}

/** Pregunta el valor de un hito que la app no puede medir y solo deja reclamar si alcanza. */
function ClaimPrompt({
  milestone,
  onConfirm,
  onCancel,
}: {
  milestone: MilestoneDef;
  onConfirm: (declared: number) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const value = parseInt(text, 10);
  const enough = !Number.isNaN(value) && value >= milestone.threshold;

  return (
    <div className="claim-prompt">
      <label className="field">
        <span>¿{milestone.ask}?</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus
          placeholder={`Mínimo ${milestone.threshold}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {text !== '' && !enough && (
        <small className="payment-warn">
          Necesitás al menos {milestone.threshold} para reclamar {milestone.name}.
        </small>
      )}
      <div className="row">
        <button className="btn small ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn small primary grow" disabled={!enough} onClick={() => onConfirm(value)}>
          Reclamar {milestone.name} ({MILESTONE_COST} M€)
        </button>
      </div>
    </div>
  );
}

/** "Ana (12)" o "Ana y Leo (12)" para los premios que la app puede medir. */
function leaderOf(players: Player[], metric: (p: Player) => number): string | null {
  const values = players.map((p) => ({ p, v: metric(p) }));
  const max = Math.max(...values.map((x) => x.v));
  if (max <= 0) return null;
  const top = values.filter((x) => x.v === max).map((x) => x.p.name);
  return `${top.join(' y ')} (${max})`;
}
