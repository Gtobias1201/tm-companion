import { IconArrowLeft, IconChevronRight } from '@tabler/icons-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GROUPS, TOPICS } from './topics';

/** Para el acceso a la guía en la pantalla de inicio. */
export const GUIDE_TOPIC_COUNT = TOPICS.length;

/** Ilustración decorativa: sin foco ni toques, los lectores de pantalla la saltean. */
function Figure({ children }: { children: ReactNode }) {
  return (
    <div className="guide-figure" aria-hidden ref={(el) => el?.setAttribute('inert', '')}>
      {children}
    </div>
  );
}

/** Guía de uso a pantalla completa: índice de temas y cada tema paso a paso. */
export function Guide({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const topic = index === null ? null : TOPICS[index];

  // La página de atrás no se desplaza mientras la guía está abierta
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (index === null) onClose();
      else setIndex(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, onClose]);

  return (
    <div className="guide" role="dialog" aria-modal="true" aria-label="Guía de uso">
      <header className="guide-head">
        <div className="guide-col topbar">
          <button
            className="icon-btn"
            onClick={() => (index === null ? onClose() : setIndex(null))}
            aria-label={index === null ? 'Cerrar la guía' : 'Volver a los temas'}
          >
            <IconArrowLeft size={20} />
          </button>
          <h1 className="grow">Guía de uso</h1>
          {index !== null && (
            <span className="muted small">
              {index + 1} de {TOPICS.length}
            </span>
          )}
        </div>
        {index !== null && (
          <div className="guide-col">
            <div className="guide-progress">
              <span style={{ width: `${((index + 1) / TOPICS.length) * 100}%` }} />
            </div>
          </div>
        )}
      </header>

      <div className="guide-body" ref={bodyRef}>
        {topic === null ? (
          <div className="guide-col guide-index">
            <p className="note">Tocá un tema para verlo. La guía está siempre en el inicio y en la partida.</p>
            {GROUPS.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="guide-group">{g.label}</h2>
                <ul>
                  {g.topics.map((t) => (
                    <li key={t.title}>
                      <button className="guide-topic" onClick={() => setIndex(TOPICS.indexOf(t))}>
                        <span className="guide-icon">
                          <t.icon size={20} />
                        </span>
                        <span className="grow">
                          <strong>{t.title}</strong>
                          <small className="muted">{t.summary}</small>
                        </span>
                        <IconChevronRight size={18} className="muted" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <article className="guide-col guide-page">
            <div className="guide-title">
              <span className="guide-icon big">
                <topic.icon size={24} />
              </span>
              <div>
                <h2>{topic.title}</h2>
                <p className="muted">{topic.summary}</p>
              </div>
            </div>
            <Figure>{topic.figure()}</Figure>
            <ol className="guide-steps">
              {topic.steps.map(([lead, text], i) => (
                <li key={i}>
                  <span className="guide-step-num">{i + 1}</span>
                  <p>
                    <strong>{lead}</strong> {text}
                  </p>
                </li>
              ))}
            </ol>
          </article>
        )}
      </div>

      {index !== null && (
        <footer className="guide-foot">
          <div className="guide-col">
            <button className="btn grow" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              Anterior
            </button>
            <button className="btn primary grow" onClick={() => setIndex(index === TOPICS.length - 1 ? null : index + 1)}>
              {index === TOPICS.length - 1 ? 'Listo' : 'Siguiente'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
