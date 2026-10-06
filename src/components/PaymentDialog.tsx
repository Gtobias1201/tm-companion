import { useState, type CSSProperties } from 'react';
import { RESOURCE_INFO, STANDARD_PROJECTS, TAG_INFO, scopeLabel } from '../game/constants';
import { applicableDiscounts, bestPayment, canAfford, paymentValue, paymentWith } from '../game/logic';
import { CARD_TAGS, type CardTag, type Payment, type Player, type PurchaseKind } from '../game/types';
import { Modal } from './Modal';

export interface PayRequest {
  cost: number;
  listCost: number;
  payment: Payment;
  label?: string;
}

interface Props {
  player: Player;
  venus: boolean;
  onPay: (request: PayRequest) => void;
  onClose: () => void;
}

const QUICK_COSTS = [3, 5, 10, 15, 20, 25];

export function PaymentDialog({ player, venus, onPay, onClose }: Props) {
  const [kind, setKind] = useState<PurchaseKind>('card');
  const [costText, setCostText] = useState('');
  const [tags, setTags] = useState<CardTag[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  /** Descuentos que el jugador desmarcó para esta compra. */
  const [skipped, setSkipped] = useState<string[]>([]);
  /** Ajuste manual de acero/titanio; null = usar la recomendación. */
  const [override, setOverride] = useState<{ steel: number; titanium: number } | null>(null);

  const projects = STANDARD_PROJECTS.filter((sp) => !sp.venus || venus);
  const project = kind === 'standard' ? projects.find((sp) => sp.id === projectId) : undefined;

  const listCost = kind === 'card' ? Math.max(0, parseInt(costText, 10) || 0) : (project?.cost ?? 0);
  const purchaseTags = kind === 'card' ? tags : (project?.tags ?? []);
  const discounts = applicableDiscounts(player, kind, purchaseTags);
  const activeDiscount = discounts.filter((d) => !skipped.includes(d.id)).reduce((sum, d) => sum + d.amount, 0);
  const cost = Math.max(0, listCost - activeDiscount);

  // Acero y titanio solo sirven para cartas con esas etiquetas, nunca en proyectos estándar
  const allowSteel = kind === 'card' && tags.includes('building');
  const allowTitanium = kind === 'card' && tags.includes('space');
  const best = bestPayment(player, cost, { steel: allowSteel, titanium: allowTitanium });
  const payment: Payment | null = override ? paymentWith(player, cost, override.steel, override.titanium) : best;

  const affordable = listCost > 0 && payment !== null && canAfford(player, payment);
  const overpay = payment ? paymentValue(player, payment) - cost : 0;
  const isBest = !!payment && !!best && payment.steel === best.steel && payment.titanium === best.titanium;

  const maxValue =
    player.resources.megacredits +
    (allowSteel ? player.resources.steel * player.steelValue : 0) +
    (allowTitanium ? player.resources.titanium * player.titaniumValue : 0);

  /** Cualquier cambio en la compra vuelve a la recomendación automática. */
  const resetTo = (fn: () => void) => {
    fn();
    setOverride(null);
  };

  const toggleTag = (t: CardTag) =>
    resetTo(() => setTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t])));

  const toggleDiscount = (id: string) =>
    resetTo(() => setSkipped((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])));

  const adjust = (key: 'steel' | 'titanium', delta: number) => {
    const base = override ?? { steel: payment?.steel ?? 0, titanium: payment?.titanium ?? 0 };
    const value = key === 'steel' ? player.steelValue : player.titaniumValue;
    const max = Math.min(player.resources[key], Math.ceil(cost / value));
    setOverride({ ...base, [key]: Math.min(max, Math.max(0, base[key] + delta)) });
  };

  const rows: { key: 'steel' | 'titanium'; enabled: boolean; unit: number }[] = [
    { key: 'steel', enabled: allowSteel, unit: player.steelValue },
    { key: 'titanium', enabled: allowTitanium, unit: player.titaniumValue },
  ];

  const submit = () => {
    if (!payment) return;
    onPay({ cost, listCost, payment, label: project?.label });
  };

  return (
    <Modal
      title={`Pagar · ${player.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary grow" disabled={!affordable} onClick={submit}>
            {listCost > 0 ? (cost > 0 ? `Pagar ${cost} M€` : 'Jugar gratis') : 'Pagar'}
          </button>
        </>
      }
    >
      <div className="segmented" role="tablist">
        {(['card', 'standard'] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            className={kind === k ? 'on' : ''}
            onClick={() => resetTo(() => { setKind(k); setSkipped([]); })}
          >
            {k === 'card' ? 'Carta' : 'Proyecto estándar'}
          </button>
        ))}
      </div>

      {kind === 'card' ? (
        <>
          <label className="field">
            <span>Costo impreso en la carta (M€)</span>
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

          <div className="field">
            <span>Etiquetas de la carta</span>
            <div className="tag-toggles" role="group" aria-label="Etiquetas de la carta">
              {CARD_TAGS.filter((t) => t !== 'venus' || venus || player.discounts.some((d) => d.scope === 'venus')).map((t) => (
                <button
                  key={t}
                  className={`tag-toggle ${tags.includes(t) ? 'on' : ''}`}
                  aria-pressed={tags.includes(t)}
                  style={{ '--t-color': TAG_INFO[t].color } as CSSProperties}
                  onClick={() => toggleTag(t)}
                >
                  <span aria-hidden>{TAG_INFO[t].icon}</span> {TAG_INFO[t].label}
                  {t === 'building' && <small>acero = {player.steelValue}</small>}
                  {t === 'space' && <small>titanio = {player.titaniumValue}</small>}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="project-list" role="radiogroup" aria-label="Proyecto estándar">
          {projects.map((sp) => (
            <button
              key={sp.id}
              role="radio"
              aria-checked={projectId === sp.id}
              className={`project-option ${projectId === sp.id ? 'on' : ''}`}
              onClick={() => resetTo(() => { setProjectId(sp.id); setSkipped([]); })}
            >
              <span>{sp.label}</span>
              <strong>{sp.cost} M€</strong>
            </button>
          ))}
        </div>
      )}

      {discounts.length > 0 && listCost > 0 && (
        <div className="applied-discounts">
          {discounts.map((d) => (
            <label key={d.id} className="applied-discount">
              <input type="checkbox" checked={!skipped.includes(d.id)} onChange={() => toggleDiscount(d.id)} />
              <span className="grow">
                {d.name}
                <small className="muted"> · {scopeLabel(d.scope)}</small>
              </span>
              <strong>−{d.amount}</strong>
            </label>
          ))}
          <div className="discount-total">
            <span>
              Precio: <s className="muted">{listCost}</s> → <strong>{cost} M€</strong>
            </span>
          </div>
        </div>
      )}

      {listCost > 0 && (
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
          {kind === 'standard' && (
            <p className="payment-note">Recordá aplicar el efecto del proyecto (subir parámetro, producción, etc.).</p>
          )}
        </div>
      )}
    </Modal>
  );
}
