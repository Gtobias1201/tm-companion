import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { DISCOUNT_CARDS, TAG_INFO, scopeLabel } from '../game/constants';
import type { Action } from '../game/logic';
import { CARD_TAGS, type DiscountScope, type Player } from '../game/types';

interface Props {
  player: Player;
  dispatch: (action: Action) => void;
}

const CUSTOM = '__custom__';
const EXPANSIONS = [...new Set(DISCOUNT_CARDS.map((c) => c.expansion))];

export function DiscountsPanel({ player, dispatch }: Props) {
  const [custom, setCustom] = useState<{ name: string; amount: number; scope: DiscountScope } | null>(null);
  const owned = new Set(player.discounts.map((d) => d.cardId));
  const pid = player.id;

  const onSelect = (value: string) => {
    if (value === CUSTOM) {
      setCustom({ name: '', amount: 2, scope: 'all' });
      return;
    }
    const card = DISCOUNT_CARDS.find((c) => c.id === value);
    if (!card) return;
    dispatch({
      type: 'addDiscount',
      playerId: pid,
      discount: { cardId: card.id, name: card.name, amount: card.amount, scope: card.scope },
    });
  };

  return (
    <section className="discounts" aria-label="Descuentos">
      <div className="discounts-head">
        <h3>Descuentos</h3>
        <span className="muted small">Se aplican solos al pagar</span>
      </div>

      {player.discounts.length > 0 && (
        <ul className="discount-list">
          {player.discounts.map((d) => (
            <li key={d.id} className="discount-chip">
              <span className="discount-amount">−{d.amount}</span>
              <span className="discount-text">
                <strong>{d.name}</strong>
                <small className="muted">{scopeLabel(d.scope)}</small>
              </span>
              <button
                className="icon-btn mini"
                aria-label={`Quitar ${d.name}`}
                onClick={() => dispatch({ type: 'removeDiscount', playerId: pid, discountId: d.id })}
              >
                <IconX size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {custom ? (
        <div className="custom-discount">
          <label className="field">
            <span>Nombre de la carta</span>
            <input
              autoFocus
              value={custom.name}
              placeholder="Ej: carta de una expansión"
              onChange={(e) => setCustom({ ...custom, name: e.target.value })}
            />
          </label>
          <div className="row">
            <label className="field narrow">
              <span>Descuento (M€)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={custom.amount}
                onChange={(e) => setCustom({ ...custom, amount: Number(e.target.value) || 1 })}
              />
            </label>
            <label className="field grow">
              <span>Aplica a</span>
              <select
                value={custom.scope}
                onChange={(e) => setCustom({ ...custom, scope: e.target.value as DiscountScope })}
              >
                <option value="all">Todas las cartas</option>
                {CARD_TAGS.map((t) => (
                  <option key={t} value={t}>
                    Cartas de {TAG_INFO[t].label.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => setCustom(null)}>
              Cancelar
            </button>
            <button
              className="btn primary grow"
              disabled={!custom.name.trim()}
              onClick={() => {
                dispatch({
                  type: 'addDiscount',
                  playerId: pid,
                  discount: { cardId: null, name: custom.name.trim(), amount: custom.amount, scope: custom.scope },
                });
                setCustom(null);
              }}
            >
              Agregar descuento
            </button>
          </div>
        </div>
      ) : (
        <select
          className="discount-select"
          value=""
          aria-label="Agregar carta con descuento"
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="" disabled>
            + Agregar carta con descuento…
          </option>
          {EXPANSIONS.map((exp) => (
            <optgroup key={exp} label={exp}>
              {DISCOUNT_CARDS.filter((c) => c.expansion === exp).map((c) => (
                <option key={c.id} value={c.id} disabled={owned.has(c.id)}>
                  {c.name} · −{c.amount} {scopeLabel(c.scope)}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM}>Otro descuento (personalizado)…</option>
        </select>
      )}
    </section>
  );
}
