import { SCORE_LABELS, type Action } from '../game/logic';
import type { Player, ScoreKey } from '../game/types';

const COUNTERS: { key: ScoreKey; hint: string }[] = [
  { key: 'greeneries', hint: '1 PV cada uno · se suman solos al hacer bosques' },
  { key: 'cities', hint: 'No dan PV por sí mismas · cuentan para hitos' },
  { key: 'cityPoints', hint: '1 PV por cada bosque junto a tus ciudades' },
  { key: 'cardPoints', hint: 'PV impresos en tus cartas y recursos sobre cartas' },
  { key: 'jovianCards', hint: 'Io Mining Industries, Ganymede Colony, etc.: 1 PV por etiqueta joviana' },
  { key: 'jovianTags', hint: 'Contá también las de esas mismas cartas' },
];

interface Props {
  player: Player;
  dispatch: (action: Action) => void;
  /** Qué contadores mostrar (por defecto, todos). */
  keys?: ScoreKey[];
}

export function ScoreCounters({ player, dispatch, keys }: Props) {
  // Las etiquetas jovianas solo importan si tiene cartas que puntúan por ellas
  const visible = COUNTERS.filter(
    ({ key }) => (!keys || keys.includes(key)) && (key !== 'jovianTags' || player.score.jovianCards > 0),
  );

  return (
    <>
      {visible.map(({ key, hint }) => (
        <div key={key} className="score-counter">
          <div className="grow">
            <div className="score-counter-label">{capitalize(SCORE_LABELS[key])}</div>
            <small className="muted">{hint}</small>
          </div>
          <div className="stepper">
            <button
              className="step"
              disabled={player.score[key] <= 0}
              onClick={() => dispatch({ type: 'score', playerId: player.id, key, delta: -1 })}
              aria-label={`Restar ${SCORE_LABELS[key]} de ${player.name}`}
            >
              −
            </button>
            <span className="score-counter-value">{player.score[key]}</span>
            <button
              className="step"
              onClick={() => dispatch({ type: 'score', playerId: player.id, key, delta: 1 })}
              aria-label={`Sumar ${SCORE_LABELS[key]} de ${player.name}`}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
