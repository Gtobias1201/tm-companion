import { IconX } from '@tabler/icons-react';
import {
  CORPORATIONS,
  MAX_INITIAL_CARDS,
  PRELUDES,
  PRELUDES_PER_PLAYER,
  describeEffects,
  expansionsOf,
  findCorporation,
  findPrelude,
} from '../game/catalog';
import { DISCOUNT_CARDS, scopeLabel } from '../game/constants';
import { setupBalance, type PlayerSetup } from '../game/logic';
import { ColorPicker } from './ColorPicker';

interface Props {
  setup: PlayerSetup;
  index: number;
  withPreludes: boolean;
  /** Corporaciones y preludios ya elegidos por otros jugadores. */
  takenCorporations: Set<string>;
  takenPreludes: Set<string>;
  canRemove: boolean;
  onChange: (patch: Partial<PlayerSetup>) => void;
  onRemove: () => void;
}

const MANUAL = '';

/** Problemas que impiden empezar la partida con este jugador. */
export function setupProblems(s: PlayerSetup, withPreludes: boolean): string[] {
  const problems: string[] = [];
  const { afterCards, final } = setupBalance(s);
  if (afterCards < 0) problems.push(`No le alcanzan los M€ para ${s.initialCards} cartas (faltan ${-afterCards}).`);
  else if (withPreludes && final < 0) problems.push(`No le alcanzan los M€ para pagar los preludios (faltan ${-final}).`);
  if (withPreludes && s.preludes.filter(Boolean).length < PRELUDES_PER_PLAYER) {
    problems.push(`Elegí ${PRELUDES_PER_PLAYER} preludios.`);
  }
  return problems;
}

export function PlayerSetupCard({
  setup,
  index,
  withPreludes,
  takenCorporations,
  takenPreludes,
  canRemove,
  onChange,
  onRemove,
}: Props) {
  const corp = findCorporation(setup.corporationId);
  const discount = DISCOUNT_CARDS.find((d) => d.id === corp?.discountId);
  const { afterCards, final, cardPrice } = setupBalance(setup);
  const startMC = withPreludes ? final : afterCards;
  const problems = setupProblems(setup, withPreludes);

  const setPrelude = (slot: number, id: string) => {
    const preludes = [...setup.preludes];
    preludes[slot] = id;
    onChange({ preludes });
  };

  return (
    <fieldset className="player-setup">
      <div className="row">
        <label className="field grow">
          <span>Nombre</span>
          <input value={setup.name} onChange={(e) => onChange({ name: e.target.value })} />
        </label>
        {canRemove && (
          <button type="button" className="icon-btn danger" aria-label={`Quitar ${setup.name}`} onClick={onRemove}>
            <IconX size={18} />
          </button>
        )}
      </div>
      <ColorPicker value={setup.color} onChange={(color) => onChange({ color })} />

      <label className="field">
        <span>Corporación</span>
        <select
          value={setup.corporationId ?? MANUAL}
          onChange={(e) => onChange({ corporationId: e.target.value || null })}
        >
          <option value={MANUAL}>Otra (cargar a mano)</option>
          {expansionsOf(CORPORATIONS).map((exp) => (
            <optgroup key={exp} label={exp}>
              {CORPORATIONS.filter((c) => c.expansion === exp).map((c) => (
                <option key={c.id} value={c.id} disabled={takenCorporations.has(c.id)}>
                  {c.name} · {c.startingMC} M€
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {corp ? (
        <div className="setup-summary">
          <span>
            {describeEffects({
              ...corp,
              discount: discount && { amount: discount.amount, scope: discount.scope, label: scopeLabel(discount.scope) },
            })}
          </span>
          {corp.note && <small className="muted">{corp.note}</small>}
        </div>
      ) : (
        <div className="row">
          <label className="field grow">
            <span>Nombre de la corporación</span>
            <input
              placeholder="Opcional"
              value={setup.corporation}
              onChange={(e) => onChange({ corporation: e.target.value })}
            />
          </label>
          <label className="field narrow">
            <span>M€ iniciales</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={setup.startingMC || ''}
              placeholder="0"
              onChange={(e) => onChange({ startingMC: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
      )}

      <div className="setup-cards">
        <div>
          <div className="setup-label">Cartas iniciales</div>
          <small className="muted">
            {cardPrice === 0 ? 'Gratis con esta corporación' : `${cardPrice} M€ cada una · de las 10 repartidas`}
          </small>
        </div>
        <div className="stepper">
          <button
            type="button"
            className="step"
            disabled={setup.initialCards <= 0}
            onClick={() => onChange({ initialCards: setup.initialCards - 1 })}
            aria-label="Una carta menos"
          >
            −
          </button>
          <span className="setup-cards-value">{setup.initialCards}</span>
          <button
            type="button"
            className="step"
            disabled={setup.initialCards >= MAX_INITIAL_CARDS}
            onClick={() => onChange({ initialCards: setup.initialCards + 1 })}
            aria-label="Una carta más"
          >
            +
          </button>
        </div>
      </div>

      {withPreludes && (
        <div className="setup-preludes">
          {Array.from({ length: PRELUDES_PER_PLAYER }, (_, slot) => {
            const id = setup.preludes[slot] ?? '';
            const prelude = findPrelude(id);
            return (
              <div key={slot} className="field">
                <span>Preludio {slot + 1}</span>
                <select value={id} onChange={(e) => setPrelude(slot, e.target.value)}>
                  <option value="">Elegir preludio…</option>
                  {PRELUDES.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={p.id !== id && (takenPreludes.has(p.id) || setup.preludes.includes(p.id))}
                    >
                      {p.name}
                    </option>
                  ))}
                </select>
                {prelude && (
                  <div className="setup-summary">
                    <span>{describeEffects(prelude) || 'Sin efecto automático'}</span>
                    {prelude.note && <small className="muted">{prelude.note}</small>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={`setup-balance ${problems.length ? 'bad' : ''}`}>
        {problems.length ? (
          problems.map((p) => <div key={p}>{p}</div>)
        ) : (
          <>
            {setup.name.trim() || `Jugador ${index + 1}`} empieza con <strong>{startMC} M€</strong>
          </>
        )}
      </div>
    </fieldset>
  );
}
