import type { CSSProperties } from 'react';
import { GLOBAL_INFO, LIMITS } from '../game/constants';
import type { Action } from '../game/logic';
import type { Game, GlobalKey, Player } from '../game/types';
import { GlobalIcon } from './icons';

interface Props {
  game: Game;
  active: Player;
  dispatch: (action: Action) => void;
}

export function GlobalsPanel({ game, active, dispatch }: Props) {
  const params: GlobalKey[] = ['temperature', 'oxygen', 'oceans'];
  if (game.options.venus) params.push('venus');

  return (
    <section className="globals" aria-label="Parámetros globales">
      <div className={`gauges count-${params.length}`}>
        {params.map((k) => {
          const L = LIMITS[k];
          const info = GLOBAL_INFO[k];
          const v = game.globals[k];
          const maxed = v >= L.max;
          const pct = ((v - L.min) / (L.max - L.min)) * 100;
          return (
            <div key={k} className={`gauge ${maxed ? 'maxed' : ''}`} style={{ '--g-color': info.color } as CSSProperties}>
              <div className="gauge-top">
                <span className="gauge-label">
                  <GlobalIcon param={k} size={14} /> {info.label}
                </span>
                <span className="gauge-value">{info.format(v)}</span>
              </div>
              <div className="bar" role="progressbar" aria-valuemin={L.min} aria-valuemax={L.max} aria-valuenow={v}>
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="gauge-btns">
                <button
                  className="btn small ghost"
                  disabled={v <= L.min}
                  onClick={() => dispatch({ type: 'lowerGlobal', param: k })}
                  aria-label={`Corregir ${info.label} hacia abajo`}
                  title="Corrección (no quita TR)"
                >
                  −
                </button>
                <button
                  className="btn small raise"
                  disabled={maxed}
                  onClick={() => dispatch({ type: 'raiseGlobal', param: k, playerId: active.id })}
                >
                  {maxed ? 'Completo' : 'Subir'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="hint">
        Subir un parámetro da +1 TR (y sus bonus) a <strong>{active.name}</strong>.
      </p>
    </section>
  );
}
