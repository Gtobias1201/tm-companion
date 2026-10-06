import { IconTrees, IconTrophy } from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import { AWARD_VP } from '../game/boards';
import { colorHex } from '../game/constants';
import { awardResults, finalRanking, firstPlayer, isSolo, soloWon, type Action } from '../game/logic';
import type { Game, Player } from '../game/types';
import { ScoreCounters } from './ScoreCounters';

interface Props {
  game: Game;
  dispatch: (action: Action) => void;
}

const STEPS = [
  { phase: 'finalGreenery', label: 'Bosques finales' },
  { phase: 'scoring', label: 'Puntuación' },
  { phase: 'finished', label: 'Resultado' },
] as const;

export function FinalPhase({ game, dispatch }: Props) {
  const step = STEPS.findIndex((s) => s.phase === game.phase);

  return (
    <div className="final">
      <ol className="final-steps" aria-label="Final de la partida">
        {STEPS.map((s, i) => (
          <li key={s.phase} className={i === step ? 'on' : i < step ? 'done' : ''}>
            <span>{i + 1}</span> {s.label}
          </li>
        ))}
      </ol>

      {game.phase === 'finalGreenery' && <FinalGreenery game={game} dispatch={dispatch} />}
      {game.phase === 'scoring' && <Scoring game={game} dispatch={dispatch} />}
      {game.phase === 'finished' && <Result game={game} />}
    </div>
  );
}

/** Orden de turno de la última generación, empezando por el jugador inicial. */
function turnOrder(game: Game): Player[] {
  const start = game.players.indexOf(firstPlayer(game));
  return game.players.map((_, i) => game.players[(start + i) % game.players.length]);
}

function FinalGreenery({ game, dispatch }: Props) {
  return (
    <>
      <p className="note">
        En orden de turno, cada jugador puede convertir sus plantas en bosques. Cada bosque da 1 PV.
      </p>
      <section className="final-card">
        {turnOrder(game).map((p) => {
          const possible = Math.floor(p.resources.plants / p.greeneryCost);
          return (
            <div key={p.id} className="final-row" style={{ '--p-color': colorHex(p.color) } as CSSProperties}>
              <div className="grow">
                <strong className="final-name">
                  <span className="dot" /> {p.name}
                </strong>
                <small className="muted">
                  {p.resources.plants} plantas · {p.score.greeneries} bosques ·{' '}
                  {possible > 0 ? `puede hacer ${possible} más` : 'no le alcanzan las plantas'}
                </small>
              </div>
              {/* Para corregir plantas que no se cargaron durante la partida */}
              <div className="stepper">
                <button
                  className="step mini"
                  disabled={p.resources.plants <= 0}
                  onClick={() => dispatch({ type: 'resource', playerId: p.id, key: 'plants', delta: -1 })}
                  aria-label={`Restar plantas de ${p.name}`}
                >
                  −
                </button>
                <button
                  className="step mini"
                  onClick={() => dispatch({ type: 'resource', playerId: p.id, key: 'plants', delta: 1 })}
                  aria-label={`Sumar plantas de ${p.name}`}
                >
                  +
                </button>
              </div>
              <button
                className="btn small"
                disabled={possible === 0}
                onClick={() => dispatch({ type: 'finalGreenery', playerId: p.id })}
              >
                <IconTrees size={16} /> −{p.greeneryCost}
              </button>
            </div>
          );
        })}
      </section>
      <button className="btn primary block" onClick={() => dispatch({ type: 'advancePhase' })}>
        Continuar a la puntuación
      </button>
    </>
  );
}

function Scoring({ game, dispatch }: Props) {
  const results = awardResults(game);
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? '';
  const incomplete = results.some((r) => !r.complete);

  return (
    <>
      {results.length > 0 && (
        <section className="final-card" aria-label="Premios">
          <h2>Premios</h2>
          {results.map((r) => (
            <div key={r.award.id} className="final-award">
              <div>
                <strong>{r.award.name}</strong>
                <small className="muted"> · {r.award.description}</small>
              </div>
              <div className="award-values">
                {game.players.map((p) =>
                  r.award.metric ? (
                    <span key={p.id} className="award-value">
                      {p.name}: <strong>{r.values[p.id]}</strong>
                    </span>
                  ) : (
                    <label key={p.id} className="award-input">
                      <span>{p.name}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder="?"
                        value={r.values[p.id] ?? ''}
                        onChange={(e) =>
                          e.target.value !== '' &&
                          dispatch({
                            type: 'setAwardValue',
                            awardId: r.award.id,
                            playerId: p.id,
                            value: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              <small className={r.complete ? 'ma-ok' : 'muted'}>
                {r.complete
                  ? [
                      `1º ${r.first.map(nameOf).join(' y ')} (+${AWARD_VP.first})`,
                      r.second.length ? `2º ${r.second.map(nameOf).join(' y ')} (+${AWARD_VP.second})` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Falta completar los valores de todos'}
              </small>
            </div>
          ))}
        </section>
      )}

      {game.players.map((p) => (
        <section key={p.id} className="score-counters" style={{ '--p-color': colorHex(p.color) } as CSSProperties}>
          <h2 className="final-name">
            <span className="dot" /> {p.name}
          </h2>
          <ScoreCounters
            player={p}
            dispatch={dispatch}
            keys={['greeneries', 'cityPoints', 'cardPoints', 'jovianCards', 'jovianTags']}
          />
        </section>
      ))}

      <ResultTable game={game} />

      <button
        className="btn primary block"
        disabled={incomplete}
        onClick={() => dispatch({ type: 'advancePhase' })}
      >
        Terminar partida
      </button>
      {incomplete && <p className="note">Completá los valores de los premios para terminar.</p>}
    </>
  );
}

function Result({ game }: { game: Game }) {
  const ranking = finalRanking(game);
  const [winner] = ranking;
  const tiedOnPoints = ranking.length > 1 && ranking[1].s.total === winner.s.total;

  return (
    <>
      <div className="final-winner">
        <IconTrophy size={32} aria-hidden />
        {isSolo(game) ? (
          <div>
            <strong>{soloWon(game) ? '¡Ganaste! Marte quedó terraformado' : 'Perdiste: Marte no quedó terraformado'}</strong>
            <small>{winner.s.total} PV</small>
          </div>
        ) : (
          <div>
            <strong>
              Ganó {winner.p.name} con {winner.s.total} PV
            </strong>
            {tiedOnPoints && <small>Empate en PV: desempató por tener más M€ ({winner.p.resources.megacredits})</small>}
          </div>
        )}
      </div>
      <ResultTable game={game} />
    </>
  );
}

function ResultTable({ game }: { game: Game }) {
  const ranking = finalRanking(game);
  return (
    <section className="final-card" aria-label="Puntuación">
      <h2>{game.phase === 'finished' ? 'Puntuación final' : 'Puntuación provisoria'}</h2>
      {ranking.map(({ p, s }, i) => {
        const parts = [
          ['TR', s.tr],
          ['Hitos', s.milestones],
          ['Premios', s.awards],
          ['Bosques', s.greeneries],
          ['Ciudades', s.cities],
          ['Cartas', s.cards + s.jovian],
        ] as const;
        return (
          <div key={p.id} className="result-player" style={{ '--p-color': colorHex(p.color) } as CSSProperties}>
            <div className="result-head">
              <span className="score-pos">{i + 1}</span>
              <strong className="final-name grow">
                <span className="dot" /> {p.name}
              </strong>
              <span className="score-total">
                {s.total}
                <small>PV</small>
              </span>
            </div>
            <dl className="result-parts">
              {parts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </section>
  );
}
