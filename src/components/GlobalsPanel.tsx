import { IconPlus } from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import { GLOBAL_INFO, LIMITS } from '../game/constants';
import type { Action } from '../game';
import type { Game, GlobalKey, Player } from '../game/types';
import { GlobalIcon } from './icons';
import { useSwipeToLower } from './useSwipeToLower';

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
        {params.map((k) => (
          <Gauge
            key={k}
            param={k}
            value={game.globals[k]}
            playerName={active.name}
            onRaise={() => dispatch({ type: 'raiseGlobal', param: k, playerId: active.id })}
            onLower={() => dispatch({ type: 'lowerGlobal', param: k, playerId: active.id })}
          />
        ))}
      </div>
    </section>
  );
}

interface GaugeProps {
  param: GlobalKey;
  value: number;
  playerName: string;
  onRaise: () => void;
  onLower: () => void;
}

/**
 * Todo el recuadro es el botón de subir (más fácil de tocar en el celular). Deslizarlo hacia
 * la izquierda descubre un "−1" para corregir errores sin sumar botones a la pantalla.
 */
function Gauge({ param, value, playerName, onRaise, onLower }: GaugeProps) {
  const L = LIMITS[param];
  const info = GLOBAL_INFO[param];
  const maxed = value >= L.max;
  const atMin = value <= L.min;
  const pct = ((value - L.min) / (L.max - L.min)) * 100;
  // "−30°" en vez de "−30°C": con Venus son 4 columnas y el termómetro ya indica grados
  const shown = param === 'temperature' ? `${value > 0 ? '+' : ''}${value}°` : info.format(value);

  const { offset, armed, handlers } = useSwipeToLower({ onRaise, onLower, canRaise: !maxed, canLower: !atMin });

  return (
    <div className={`gauge-swipe ${armed ? 'armed' : ''}`}>
      <span className="gauge-under" aria-hidden>
        −1
      </span>
      <button
        className={`gauge ${maxed ? 'maxed' : ''}`}
        style={{ '--g-color': info.color, transform: offset ? `translateX(${offset}px)` : undefined } as CSSProperties}
        aria-label={`${info.label} ${info.format(value)}. Tocar para subir (+1 TR para ${playerName}); deslizar a la izquierda o flecha izquierda para corregir hacia abajo (−1 TR)`}
        aria-disabled={maxed}
        {...handlers}
      >
        <span className="gauge-top">
          <span className="gauge-label">
            <GlobalIcon param={param} size={14} />
            <span className="gauge-value">{shown}</span>
          </span>
          <span className="gauge-plus" aria-hidden>
            {maxed ? '✓' : <IconPlus size={14} />}
          </span>
        </span>
        <span className="bar" role="progressbar" aria-label={info.label} aria-valuemin={L.min} aria-valuemax={L.max} aria-valuenow={value}>
          <span className="bar-fill" style={{ width: `${pct}%` }} />
        </span>
      </button>
    </div>
  );
}
