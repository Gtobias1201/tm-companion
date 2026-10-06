import type { CSSProperties } from 'react';
import { RESOURCE_INFO } from '../game/constants';
import type { ResourceKey } from '../game/types';

interface Props {
  resource: ResourceKey;
  stock: number;
  production: number;
  productionMin: number;
  onStock: (delta: number) => void;
  onProduction: (delta: number) => void;
  onOpenAmount: () => void;
}

export function ResourceCard({ resource, stock, production, productionMin, onStock, onProduction, onOpenAmount }: Props) {
  const info = RESOURCE_INFO[resource];
  return (
    <div className={`res-card res-${resource}`} style={{ '--res-color': info.color } as CSSProperties}>
      <div className="res-head">
        <span className="res-icon" aria-hidden>
          {info.icon}
        </span>
        <span className="res-label">{info.label}</span>
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

      <div className="res-prod">
        <span className="res-prod-label">Prod.</span>
        <button
          className="step mini"
          disabled={production <= productionMin}
          onClick={() => onProduction(-1)}
          aria-label={`Restar producción de ${info.label}`}
        >
          −
        </button>
        <span className={`res-prod-value ${production < 0 ? 'neg' : ''}`}>
          {production > 0 ? `+${production}` : production}
        </span>
        <button className="step mini" onClick={() => onProduction(1)} aria-label={`Sumar producción de ${info.label}`}>
          +
        </button>
      </div>
    </div>
  );
}
