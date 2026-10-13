import { useRef, useState, type PointerEvent } from 'react';

/** Distancia que hay que deslizar a la izquierda para corregir (px). */
const SWIPE_TRIGGER = 44;
const SWIPE_MAX = 64;
/** Parte del botón que queda a la vista al deslizar del todo, para que no desaparezca (como los medidores). */
const MIN_VISIBLE = 0.45;
/** Movimiento por debajo de esto cuenta como toque, no como deslizamiento. */
const TAP_SLOP = 8;

interface Options {
  onRaise: () => void;
  onLower: () => void;
  canRaise: boolean;
  canLower: boolean;
}

/**
 * Gesto compartido por los medidores y el TR: tocar sube, deslizar hacia la izquierda descubre
 * un "−1" para corregir. También responde a Enter/espacio (sube) y flecha izquierda (baja).
 */
export function useSwipeToLower({ onRaise, onLower, canRaise, canLower }: Options) {
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; y: number; horizontal: boolean | null; moved: boolean } | null>(null);
  // En botones angostos (la placa de TR) se desliza menos y alcanza con menos recorrido para corregir
  const limits = useRef({ max: SWIPE_MAX, trigger: SWIPE_TRIGGER });

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, horizontal: null, moved: false };
    const max = Math.min(SWIPE_MAX, e.currentTarget.offsetWidth * (1 - MIN_VISIBLE)) || SWIPE_MAX;
    limits.current = { max, trigger: (max * SWIPE_TRIGGER) / SWIPE_MAX };
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
    if (d.horizontal && canLower) setOffset(Math.max(-limits.current.max, Math.min(0, dx)));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.horizontal && offset <= -limits.current.trigger) onLower();
    else if (!d.moved && canRaise) onRaise();
    setOffset(0);
  };

  const onPointerCancel = () => {
    drag.current = null;
    setOffset(0);
  };

  return {
    offset,
    armed: offset <= -limits.current.trigger,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClick: (e: { detail: number }) => {
        // El toque ya se maneja en pointerup; esto es solo para teclado (Enter/espacio)
        if (e.detail === 0 && canRaise) onRaise();
      },
      onKeyDown: (e: { key: string; preventDefault: () => void }) => {
        if (e.key === 'ArrowLeft' && canLower) {
          e.preventDefault();
          onLower();
        }
      },
    },
  };
}
