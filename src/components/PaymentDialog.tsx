import { useState, type CSSProperties } from 'react';
import { RESOURCE_INFO } from '../game/constants';
import { bestPayment, canAfford, paymentValue, paymentWith } from '../game/logic';
import type { Payment, Player } from '../game/types';
import { Modal } from './Modal';

interface Props {
  player: Player;
  onPay: (cost: number, payment: Payment) => void;
  onClose: () => void;
}

const QUICK_COSTS = [3, 5, 10, 15, 20, 25];

export function PaymentDialog({ player, onPay, onClose }: Props) {
  const [costText, setCostText] = useState('');
  const [building, setBuilding] = useState(false);
  const [space, setSpace] = useState(false);
  /** Ajuste manual de acero/titanio; null = usar la recomendación. */
  const [override, setOverride] = useState<{ steel: number; titanium: number } | null>(null);

  const cost = Math.max(0, parseInt(costText, 10) || 0);
  const rules = { steel: building, titanium: space };
  const best = bestPayment(player, cost, rules);
  const payment: Payment | null = override
    ? paymentWith(player, cost, override.steel, override.titanium)
    : best;

  const affordable = payment !== null && cost > 0 && canAfford(player, payment);
  const overpay = payment ? paymentValue(player, payment) - cost : 0;
  const isBest =
    !!payment && !!best && payment.steel === best.steel && payment.titanium === best.titanium;

  // Lo máximo que el jugador podría aportar con sus recursos para esta carta
  const maxValue =
    player.resources.megacredits +
    (building ? player.resources.steel * player.steelValue : 0) +
    (space ? player.resources.titanium * player.titaniumValue : 0);

  const resetTo = (fn: () => void) => {
    fn();
    setOverride(null);
  };

  const adjust = (key: 'steel' | 'titanium', delta: number) => {
    const base = override ?? { steel: payment?.steel ?? 0, titanium: payment?.titanium ?? 0 };
    const value = key === 'steel' ? player.steelValue : player.titaniumValue;
    const max = Math.min(player.resources[key], Math.ceil(cost / value));
    setOverride({ ...base, [key]: Math.min(max, Math.max(0, base[key] + delta)) });
  };

  const rows: { key: 'steel' | 'titanium'; enabled: boolean; unit: number }[] = [
    { key: 'steel', enabled: building, unit: player.steelValue },
    { key: 'titanium', enabled: space, unit: player.titaniumValue },
  ];

  return (
    <Modal
      title={`Pagar · ${player.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary grow"
            disabled={!affordable}
            onClick={() => payment && onPay(cost, payment)}
          >
            {cost > 0 ? `Pagar ${cost} M€` : 'Pagar'}
          </button>
        </>
      }
    >
      <label className="field">
        <span>Costo de la carta o proyecto (M€)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus
          placeholder="0"
          value={costText}
          onChange={(e) => resetTo(() => setCostText(e.target.value))}
        />
      </label>
      <div className="quick-costs">
        {QUICK_COSTS.map((n) => (
          <button key={n} className="btn small ghost" onClick={() => resetTo(() => setCostText(String(n)))}>
            {n}
          </button>
        ))}
      </div>

      <div className="tag-toggles" role="group" aria-label="Etiquetas de la carta">
        <button
          className={`tag-toggle ${building ? 'on' : ''}`}
          aria-pressed={building}
          style={{ '--t-color': RESOURCE_INFO.steel.color } as CSSProperties}
          onClick={() => resetTo(() => setBuilding((b) => !b))}
        >
          🏗 Edificio
          <small>acero = {player.steelValue} M€</small>
        </button>
        <button
          className={`tag-toggle ${space ? 'on' : ''}`}
          aria-pressed={space}
          style={{ '--t-color': RESOURCE_INFO.titanium.color } as CSSProperties}
          onClick={() => resetTo(() => setSpace((s) => !s))}
        >
          🚀 Espacio
          <small>titanio = {player.titaniumValue} M€</small>
        </button>
      </div>

      {cost > 0 && (
        <div className="payment-plan">
          <div className="payment-plan-head">
            <span>{isBest ? 'Pago recomendado' : 'Pago manual'}</span>
            {!isBest && best && (
              <button className="link-btn" onClick={() => setOverride(null)}>
                Usar recomendado
              </button>
            )}
          </div>

          {rows
            .filter((r) => r.enabled)
            .map((r) => {
              const info = RESOURCE_INFO[r.key];
              const used = payment?.[r.key] ?? 0;
              return (
                <div key={r.key} className="payment-row" style={{ '--res-color': info.color } as CSSProperties}>
                  <span className="res-icon" aria-hidden>
                    {info.icon}
                  </span>
                  <span className="payment-row-label">
                    {info.label}
                    <small className="muted">
                      tenés {player.resources[r.key]} · aporta {used * r.unit} M€
                    </small>
                  </span>
                  <button className="step mini" disabled={used <= 0} onClick={() => adjust(r.key, -1)} aria-label={`Usar menos ${info.label}`}>
                    −
                  </button>
                  <span className="payment-row-value">{used}</span>
                  <button
                    className="step mini"
                    disabled={used >= Math.min(player.resources[r.key], Math.ceil(cost / r.unit))}
                    onClick={() => adjust(r.key, 1)}
                    aria-label={`Usar más ${info.label}`}
                  >
                    +
                  </button>
                </div>
              );
            })}

          <div className="payment-row" style={{ '--res-color': RESOURCE_INFO.megacredits.color } as CSSProperties}>
            <span className="res-icon" aria-hidden>
              M€
            </span>
            <span className="payment-row-label">
              MegaCréditos
              <small className="muted">tenés {player.resources.megacredits}</small>
            </span>
            <span className="payment-row-value">{payment?.megacredits ?? cost}</span>
          </div>

          {!best && (
            <p className="payment-warn">
              No te alcanza: podés aportar como máximo {maxValue} M€, faltan {cost - maxValue}.
            </p>
          )}
          {best && payment && !affordable && (
            <p className="payment-warn">Con esa combinación no te alcanzan los M€.</p>
          )}
          {affordable && overpay > 0 && (
            <p className="payment-note">Pagás {overpay} M€ de más (el acero y el titanio no dan vuelto).</p>
          )}
        </div>
      )}
    </Modal>
  );
}
