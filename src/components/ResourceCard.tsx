import type { ReactNode } from 'react';
import { RESOURCE_INFO } from '../game/constants';
import type { ResourceKey } from '../game/types';
import { ResourceIcon } from './icons';

interface Props {
  resource: ResourceKey;
  stock: number;
  production: number;
  productionMin: number;
  /** Valor en M€ (acero y titanio), como el "= 2" del tablero. */
  worth?: number;
  /** Conversión propia del recurso (bosque, temperatura...), como en el tablero. */
  action?: ReactNode;
  onStock: (delta: number) => void;
  onProduction: (delta: number) => void;
  onOpenAmount: () => void;
}

/**
 * Tarjeta de recurso: la franja de color lleva el ícono y la producción con sus − / +;
 * debajo, el stock grande. Sin nombre visible: se reconoce por color e ícono, como en el tablero.
 */
export function ResourceCard({
  resource,
  stock,
  production,
  productionMin,
  worth,
  action,
  onStock,
  onProduction,
  onOpenAmount,
}: Props) {
  const info = RESOURCE_INFO[resource];
  return (
    <div className={`res-card res-${resource}`} role="group" aria-label={info.label}>
      <div className="res-band">
        <span className="res-band-icon">
          <ResourceIcon resource={resource} size={18} />
          {worth !== undefined && (
            <span className="res-worth" aria-label={`vale ${worth} M€`}>
              ={worth}
            </span>
          )}
        </span>
        <span className="res-prod">
          <button
            className="res-prod-step"
            disabled={production <= productionMin}
            onClick={() => onProduction(-1)}
            aria-label={`Restar producción de ${info.label}`}
          >
            −
          </button>
          <span className={`res-prod-value ${production < 0 ? 'neg' : ''}`} aria-label={`Producción ${production}`}>
            {production > 0 ? `+${production}` : production}
          </span>
          <button className="res-prod-step" onClick={() => onProduction(1)} aria-label={`Sumar producción de ${info.label}`}>
            +
          </button>
        </span>
      </div>

      <div className="res-stock">
        <button className="step" disabled={stock <= 0} onClick={() => onStock(-1)} aria-label={`Restar ${info.label}`}>
          −
        </button>
        <button className="res-value" onClick={onOpenAmount} aria-label={`${info.label}: ${stock}. Tocar para ingresar cantidad`}>
          {stock}
        </button>
        <button className="step" onClick={() => onStock(1)} aria-label={`Sumar ${info.label}`}>
          +
        </button>
      </div>

      {action}
    </div>
  );
}
