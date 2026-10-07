import {
  IconArrowBackUp,
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconChevronRight,
  IconCreditCard,
  IconFlag,
  IconFlame,
  IconHexagon,
  IconLayoutGrid,
  IconPlayerSkipForward,
  IconPlus,
  IconRepeat,
  IconTemperature,
  IconTrophy,
  IconWifi,
  type TablerIcon,
} from '@tabler/icons-react';
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { GLOBAL_INFO, PLAYER_COLORS } from '../game/constants';
import { productionMin } from '../game/logic';
import type { GlobalKey } from '../game/types';
import { ResourceCard } from './ResourceCard';
import { GlobalIcon, SingleTileIcon, TileIcon } from './icons';

interface Topic {
  title: string;
  summary: string;
  icon: TablerIcon;
  /** Cada paso: comienzo en negrita y el resto del texto. */
  steps: [string, string][];
  figure: () => ReactNode;
}

const noop = () => {};

/** Miniatura de un medidor global, con las mismas clases que el de la partida. */
function GaugeSample({ param, shown, pct, maxed, swiped }: { param: GlobalKey; shown: string; pct: number; maxed?: boolean; swiped?: boolean }) {
  return (
    <div className={`gauge-swipe ${swiped ? 'armed' : ''}`}>
      <span className="gauge-under">−1</span>
      <div
        className={`gauge ${maxed ? 'maxed' : ''}`}
        style={{ '--g-color': GLOBAL_INFO[param].color, transform: swiped ? 'translateX(-24px)' : undefined } as CSSProperties}
      >
        <span className="gauge-top">
          <span className="gauge-label">
            <GlobalIcon param={param} size={14} />
            <span className="gauge-value">{shown}</span>
          </span>
          <span className="gauge-plus">{maxed ? '✓' : <IconPlus size={14} />}</span>
        </span>
        <span className="bar">
          <span className="bar-fill" style={{ width: `${pct}%` }} />
        </span>
      </div>
    </div>
  );
}

function Rows({ rows, total }: { rows: [string, string][]; total?: [string, string] }) {
  return (
    <div className="guide-rows">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <span>{label}</span>
          <b>{value}</b>
        </Fragment>
      ))}
      {total && (
        <>
          <strong className="guide-rows-total">{total[0]}</strong>
          <strong className="guide-rows-total accent">{total[1]}</strong>
        </>
      )}
    </div>
  );
}

const GROUPS: { label: string; topics: Topic[] }[] = [
  {
    label: 'Para empezar',
    topics: [
      {
        title: 'Crear o unirse a una partida',
        summary: 'Online con código o solitaria sin conexión',
        icon: IconWifi,
        steps: [
          ['Crear partida online:', 'tu celular es el anfitrión. Pasales a los demás el código de 5 letras o el QR.'],
          ['Unirme con un código:', 'escribí el código que te pasó el anfitrión. Tiene que tener la sala abierta.'],
          ['En la sala de espera', 'cada uno elige nombre, color, corporación y preludios, y confirma. El anfitrión elige el mapa y empieza.'],
          ['Partida solitaria:', 'todo queda en este celular y funciona sin internet.'],
        ],
        figure: () => (
          <>
            <span className="guide-caption">Código de invitación</span>
            <div className="guide-code">
              {'K7Q2M'.split('').map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <span className="note">o escaneá el QR en el celular del anfitrión</span>
          </>
        ),
      },
      {
        title: 'Tu tablero de recursos',
        summary: 'Producción arriba, stock abajo',
        icon: IconLayoutGrid,
        steps: [
          ['La franja de color', 'es la producción: cambiala con − y +.'],
          ['Abajo está el stock:', '− y + suman de a uno. Tocá el número para sumar o gastar una cantidad.'],
          ['Acero y titanio', 'muestran debajo del ícono cuánto vale cada uno al pagar.'],
          ['La flecha dorada de energía', 'indica cuánta energía pasa a calor en la próxima producción.'],
        ],
        figure: () => (
          <div className="board guide-wide">
            <div className="guide-cards">
              <ResourceCard
                resource="steel"
                stock={5}
                production={1}
                productionMin={productionMin('steel')}
                worth={2}
                onStock={noop}
                onProduction={noop}
                onOpenAmount={noop}
              />
              <ResourceCard
                resource="energy"
                stock={3}
                production={2}
                productionMin={productionMin('energy')}
                action={
                  <span className="energy-flow">
                    3<IconFlame size={13} />
                    <IconArrowRight size={13} />
                  </span>
                }
                onStock={noop}
                onProduction={noop}
                onOpenAmount={noop}
              />
            </div>
            <p className="board-legend">Arriba, en la franja: producción · abajo: stock</p>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Durante la partida',
    topics: [
      {
        title: 'Turnos y acciones',
        summary: 'Dos acciones por turno',
        icon: IconRepeat,
        steps: [
          ['En tu turno tenés 2 acciones.', 'Pagar, hacer un bosque o subir la temperatura con calor cuentan solos.'],
          ['Para cartas, hitos o premios', 'que son acciones, tocá “+ Acción”.'],
          ['“Terminar”', 'pasa el turno al siguiente jugador. “Pasar” te saca hasta la próxima generación.'],
          ['Fuera de tu turno', 'las acciones quedan bloqueadas, pero podés ajustar tu stock y tu producción.'],
        ],
        figure: () => (
          <div className="turn-bar is-turn guide-wide">
            <div className="turn-info">
              <strong>Tu turno</strong>
              <span className="action-dots">
                <span className="on" />
                <span />
              </span>
            </div>
            <button className="btn small">
              <IconPlus size={15} /> Acción
            </button>
            <button className="btn small">Terminar</button>
            <button className="btn small ghost">
              <IconPlayerSkipForward size={15} /> Pasar
            </button>
          </div>
        ),
      },
      {
        title: 'Pagar cartas y proyectos',
        summary: 'Acero, titanio y descuentos automáticos',
        icon: IconCreditCard,
        steps: [
          ['Tocá “Pagar”', 'en los MegaCréditos y elegí carta o proyecto estándar.'],
          ['Poné el costo y las etiquetas', 'de la carta. La app aplica tus descuentos.'],
          ['El pago más eficiente', 'con acero y titanio se calcula solo. Podés cambiarlo antes de confirmar.'],
          ['Los descuentos permanentes', 'de tus cartas se cargan en la misma pantalla.'],
        ],
        figure: () => (
          <Rows
            rows={[
              ['Carta', '23 M€'],
              ['Tus descuentos', '−2 M€'],
              ['Titanio 2 × 3', '6 M€'],
              ['MegaCréditos', '15 M€'],
            ]}
            total={['Pagás', '15 M€ + 2 titanio']}
          />
        ),
      },
      {
        title: 'Parámetros globales',
        summary: 'Tocar para subir, deslizar para corregir',
        icon: IconTemperature,
        steps: [
          ['Tocá cualquier parte del recuadro', 'para subir un paso: ganás 1 TR y los bonus del tablero.'],
          ['Si alguien se equivocó,', 'deslizá el recuadro hacia la izquierda: baja un paso y quien corrige pierde 1 TR.'],
          ['Al llegar al máximo', 'el recuadro muestra ✓ y ya no sube más.'],
        ],
        figure: () => (
          <div className="guide-gauges">
            <figure>
              <GaugeSample param="temperature" shown="−12°" pct={47} />
              <figcaption>Tocá: sube y +1 TR</figcaption>
            </figure>
            <figure>
              <GaugeSample param="oxygen" shown="6%" pct={43} swiped />
              <figcaption>Deslizá ←: corrige y −1 TR</figcaption>
            </figure>
          </div>
        ),
      },
      {
        title: 'Colocar losetas',
        summary: 'Bosques, ciudades y océanos de cartas',
        icon: IconHexagon,
        steps: [
          ['El botón de losetas', 'está a la izquierda de tu TR.'],
          ['Usalo cuando una carta', 'coloca una loseta. No gasta acción: la acción fue jugar la carta.'],
          ['El bosque sube el oxígeno', 'y el océano da +1 TR. Los bonus del espacio se cargan a mano.'],
        ],
        figure: () => (
          <>
            <div className="player-line guide-wide" style={{ '--p-color': PLAYER_COLORS[0].hex } as CSSProperties}>
              <span className="dot" />
              <span className="player-line-name">
                <strong>Ana</strong>
                <span className="muted"> · Ecoline</span>
              </span>
              <span className="tile-btn guide-highlight">
                <TileIcon size={24} />
                <span className="tile-btn-plus">+</span>
              </span>
              <span className="tr-plate">
                <span>TR</span>
                <b>23</b>
              </span>
            </div>
            <div className="guide-tiles">
              {(
                [
                  ['greenery', 'Bosque'],
                  ['city', 'Ciudad'],
                  ['ocean', 'Océano'],
                ] as const
              ).map(([kind, label]) => (
                <span key={kind}>
                  <SingleTileIcon kind={kind} size={20} /> {label}
                </span>
              ))}
            </div>
          </>
        ),
      },
      {
        title: 'Fin de la generación',
        summary: 'Producción e investigación',
        icon: IconCalendar,
        steps: [
          ['Cuando todos pasan,', 'se aplica la producción: la energía pasa a calor y cobrás TR + producción de M€.'],
          ['Después viene la investigación:', 'cada uno elige cuántas cartas compra y se descuentan solas.'],
          ['Arriba ves la generación actual', 'y en la mesa, quién empieza la próxima.'],
        ],
        figure: () => (
          <>
            <div className="guide-gen">
              <span className="gen-badge">
                <span className="gen-label">Gen</span>
                <span className="gen-num">4</span>
              </span>
              <IconArrowRight size={20} />
              <span className="gen-badge">
                <span className="gen-label">Gen</span>
                <span className="gen-num">5</span>
              </span>
            </div>
            <Rows
              rows={[
                ['M€ (TR 25 + producción 3)', '+28'],
                ['Energía que pasa a calor', '4'],
                ['Investigación: 2 cartas × 3', '−6 M€'],
              ]}
            />
          </>
        ),
      },
      {
        title: 'Hitos y premios',
        summary: 'Según el mapa de la partida',
        icon: IconTrophy,
        steps: [
          ['En la pestaña “Hitos y premios”', 'ves los del mapa elegido.'],
          ['Al reclamar un hito', 'la app revisa que cumplas el requisito y cobra 8 M€.'],
          ['Financiar un premio', 'cuesta 8, 14 y 20 M€. Se puntúan al final.'],
        ],
        figure: () => (
          <div className="guide-milestones">
            <div>
              <span className="grow">
                <strong>Terraformer</strong>
                <small className="muted">Tener 35 de TR · tenés 36</small>
              </span>
              <button className="btn small primary">Reclamar · 8 M€</button>
            </div>
            <div>
              <span className="grow">
                <strong>Gardener</strong>
                <small className="muted">Tener 3 bosques · tenés 2</small>
              </span>
              <span className="muted small">Te falta 1</span>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Final y ajustes',
    topics: [
      {
        title: 'Final y puntos',
        summary: 'Cuando Marte queda terraformado',
        icon: IconFlag,
        steps: [
          ['Con temperatura, oxígeno y océanos al máximo,', 'la partida termina al final de esa generación.'],
          ['Último turno de bosques:', 'cada uno convierte las plantas que le queden.'],
          ['En “Puntos”', 'se suman TR, hitos, premios, bosques, ciudades y cartas, y se ve quién ganó.'],
        ],
        figure: () => (
          <>
            <div className="guide-gauges three">
              <GaugeSample param="temperature" shown="+8°" pct={100} maxed />
              <GaugeSample param="oxygen" shown="14%" pct={100} maxed />
              <GaugeSample param="oceans" shown="9/9" pct={100} maxed />
            </div>
            <Rows
              rows={[
                ['TR', '32'],
                ['Hitos y premios', '15'],
                ['Bosques y ciudades', '10'],
                ['Cartas', '18'],
              ]}
              total={['Total', '75 PV']}
            />
          </>
        ),
      },
      {
        title: 'Deshacer y apariencia',
        summary: 'Corregir errores y modo noche',
        icon: IconArrowBackUp,
        steps: [
          ['“Deshacer”', 'vuelve atrás tu última acción. Online solo deshacés lo tuyo; el anfitrión puede deshacer lo de la mesa.'],
          ['Con el lápiz al lado de tu TR', 'cambiás nombre y color, y elegís día, noche o automático.'],
          ['El registro', '(arriba en la partida) muestra todo lo que pasó.'],
        ],
        figure: () => (
          <>
            <button className="btn">
              <IconArrowBackUp size={18} /> Deshacer
            </button>
            <span className="note">Apariencia en este celular</span>
            <div className="segmented three guide-wide">
              <button>Día</button>
              <button className="on">Noche</button>
              <button>Auto</button>
            </div>
          </>
        ),
      },
    ],
  },
];

const TOPICS = GROUPS.flatMap((g) => g.topics);
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
            <button
              className="btn primary grow"
              onClick={() => setIndex(index === TOPICS.length - 1 ? null : index + 1)}
            >
              {index === TOPICS.length - 1 ? 'Listo' : 'Siguiente'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
