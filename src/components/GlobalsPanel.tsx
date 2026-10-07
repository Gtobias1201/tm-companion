import { IconPlus } from '@tabler/icons-react';
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

/** Fila compacta de parámetros globales: subir uno da +1 TR (y sus bonus) al jugador. */
export function GlobalsPanel({ game, active, dispatch }: Props) {
  const params: GlobalKey[] = ['temperature', 'oxygen', 'oceans'];
  if (game.options.venus) params.push('venus');

  return (
    <section className="globals" aria-label="Parámetros globales">
      <div className="gauges" style={{ gridTemplateColumns: `repeat(${params.length}, minmax(0, 1fr))` }}>
        {params.map((k) => {
          const L = LIMITS[k];
          const info = GLOBAL_INFO[k];
          const v = game.globals[k];
          const maxed = v >= L.max;
          const pct = ((v - L.min) / (L.max - L.min)) * 100;
          return (
            <div key={k} className={`gauge ${maxed ? 'maxed' : ''}`} style={{ '--g-color': info.color } as CSSProperties}>
              <div className="gauge-top">
                <span className="gauge-label" title={info.label}>
                  <GlobalIcon param={k} size={14} />
                  {/* "−30°" en vez de "−30°C": con Venus son 4 columnas y el termómetro ya indica grados */}
                  <span className="gauge-value">{k === 'temperature' ? `${v > 0 ? '+' : ''}${v}°` : info.format(v)}</span>
                </span>
                <button
                  className="gauge-raise"
                  disabled={maxed}
                  onClick={() => dispatch({ type: 'raiseGlobal', param: k, playerId: active.id })}
                  aria-label={`Subir ${info.label} (+1 TR para ${active.name})`}
                >
                  <IconPlus size={16} />
                </button>
              </div>
              <div className="bar" role="progressbar" aria-label={info.label} aria-valuemin={L.min} aria-valuemax={L.max} aria-valuenow={v}>
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
