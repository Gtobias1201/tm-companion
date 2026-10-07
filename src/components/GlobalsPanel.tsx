import { IconPlus } from '@tabler/icons-react';
import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
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

/** Distancia que hay que deslizar a la izquierda para corregir (px). */
const SWIPE_TRIGGER = 44;
const SWIPE_MAX = 64;
/** Movimiento por debajo de esto cuenta como toque, no como deslizamiento. */
const TAP_SLOP = 8;

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

  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; y: number; horizontal: boolean | null; moved: boolean } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, horizontal: null, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) d.moved = true;
    // Se decide una sola vez si el gesto es horizontal (corregir) o vertical (scroll de la página)
    if (d.horizontal === null && d.moved) {
      d.horizontal = Math.abs(dx) > Math.abs(dy);
      if (d.horizontal) {
        try {
          // Sigue el dedo aunque salga del recuadro
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // algunos navegadores no lo permiten: el gesto funciona igual dentro del recuadro
        }
      }
    }
    if (d.horizontal && !atMin) setOffset(Math.max(-SWIPE_MAX, Math.min(0, dx)));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.horizontal && offset <= -SWIPE_TRIGGER) onLower();
    else if (!d.moved && !maxed) onRaise();
    setOffset(0);
  };

  const onPointerCancel = () => {
    drag.current = null;
    setOffset(0);
  };

  return (
    <div className={`gauge-swipe ${offset <= -SWIPE_TRIGGER ? 'armed' : ''}`}>
      <span className="gauge-under" aria-hidden>
        −1
      </span>
      <button
        className={`gauge ${maxed ? 'maxed' : ''}`}
        style={{ '--g-color': info.color, transform: offset ? `translateX(${offset}px)` : undefined } as CSSProperties}
        aria-label={`${info.label} ${info.format(value)}. Tocar para subir (+1 TR para ${playerName}); deslizar a la izquierda o flecha izquierda para corregir hacia abajo (−1 TR)`}
        aria-disabled={maxed}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={(e) => {
          // El toque ya se maneja en pointerup; esto es solo para teclado (Enter/espacio)
          if (e.detail === 0 && !maxed) onRaise();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' && !atMin) {
            e.preventDefault();
            onLower();
          }
        }}
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
