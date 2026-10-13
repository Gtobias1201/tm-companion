import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { applyAction, isViewOnly, type Action } from '../../game';
import type { Game } from '../../game/types';
import { GameScreen } from '../game/GameScreen';
import { TOUR_STEPS, createDemoGame, markTourSeen } from './steps';

/** Margen alrededor del elemento iluminado (px). */
const PAD = 6;
/** Separación entre el elemento iluminado y la burbuja, y de la burbuja a los bordes (px). */
const GAP = 12;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Recorrido de bienvenida sobre las pantallas reales: el inicio y una partida de práctica que no
 * se guarda. Oscurece todo menos el elemento que explica; en los pasos de gestos ese elemento se
 * puede tocar y el paso avanza solo.
 */
export function Tour({ home, onClose }: { home: ReactNode; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [demo, setDemo] = useState<Game>(createDemoGame);
  const [undo, setUndo] = useState<Game[]>([]);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  // Cómo estaba la partida al llegar al paso, para saber si ya se probó el gesto
  const before = useRef(demo);

  const finish = () => {
    markTourSeen();
    onClose();
  };
  const next = () => (last ? finish() : setIndex(index + 1));

  useEffect(() => {
    before.current = demo;
  }, [index]);

  useEffect(() => {
    if (step.done?.(before.current, demo)) {
      // Una pausa corta para que se vea el número cambiar antes de pasar al siguiente
      const t = window.setTimeout(() => setIndex((i) => i + 1), 450);
      return () => window.clearTimeout(t);
    }
  }, [demo, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const dispatch = (action: Action) => {
    const nextGame = applyAction(demo, action);
    if (nextGame === demo) return;
    if (!isViewOnly(action)) setUndo([...undo, demo]);
    setDemo(nextGame);
  };

  return (
    <>
      {step.screen === 'home' ? (
        home
      ) : (
        <GameScreen
          game={demo}
          canUndo={undo.length > 0}
          dispatch={dispatch}
          onUndo={() => {
            setDemo(undo[undo.length - 1]);
            setUndo(undo.slice(0, -1));
          }}
          onExit={finish}
        />
      )}
      <Spotlight key={index} target={step.target} interactive={!!step.done}>
        <div className="tour-progress muted small">
          {index + 1} de {TOUR_STEPS.length}
        </div>
        <h2>{step.title}</h2>
        <p>{step.text}</p>
        <div className="tour-actions">
          {!last && (
            <button className="btn ghost small" onClick={finish}>
              {index === 0 ? 'Ahora no' : 'Saltar'}
            </button>
          )}
          <button className="btn primary small" onClick={next}>
            {index === 0 ? 'Empezar' : last ? 'Terminar' : step.done ? 'Seguir sin probar' : 'Siguiente'}
          </button>
        </div>
      </Spotlight>
    </>
  );
}

function Spotlight({ target, interactive, children }: { target?: string; interactive: boolean; children: ReactNode }) {
  const [hole, setHole] = useState<Box | null>(null);
  const [bubbleH, setBubbleH] = useState(0);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // El elemento se mueve (scroll, gestos, teclado del celular): se sigue cuadro a cuadro
  useLayoutEffect(() => {
    if (!target) return setHole(null);
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    let frame = 0;
    let prev = '';
    const track = () => {
      const r = document.querySelector(`[data-tour="${target}"]`)?.getBoundingClientRect();
      const box = r && { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
      const key = JSON.stringify(box);
      if (key !== prev) {
        prev = key;
        setHole(box ?? null);
      }
      const h = bubbleRef.current?.offsetHeight ?? 0;
      setBubbleH((old) => (old === h ? old : h));
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [target]);

  useEffect(() => {
    bubbleRef.current?.focus();
  }, []);

  let bubbleStyle: CSSProperties | undefined;
  if (hole) {
    const below = hole.top + hole.height + GAP;
    const fitsBelow = below + bubbleH + GAP <= window.innerHeight;
    const above = hole.top - GAP - bubbleH;
    // Si no entra ni abajo ni arriba (elemento muy alto), va al pie de la pantalla
    const top = fitsBelow ? below : above >= GAP ? above : window.innerHeight - bubbleH - GAP;
    bubbleStyle = { top };
  }

  return (
    <div className={`tour ${hole ? '' : 'centered'}`}>
      {hole ? (
        <>
          {/* Cuatro bloques transparentes alrededor del hueco: afuera no se puede tocar nada */}
          <div className="tour-block" style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} />
          <div className="tour-block" style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <div className="tour-block" style={{ top: hole.top, height: hole.height, left: 0, width: Math.max(0, hole.left) }} />
          <div className="tour-block" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width, right: 0 }} />
          {!interactive && <div className="tour-block" style={hole} />}
          <div className={`tour-hole ${interactive ? 'try' : ''}`} style={hole} aria-hidden />
        </>
      ) : (
        <div className="tour-block dim" />
      )}
      <div
        className="tour-bubble"
        role="dialog"
        aria-modal="true"
        aria-label="Recorrido de bienvenida"
        tabIndex={-1}
        ref={bubbleRef}
        style={bubbleStyle}
      >
        {children}
      </div>
    </div>
  );
}
