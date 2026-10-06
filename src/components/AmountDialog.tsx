import { useState } from 'react';
import { RESOURCE_INFO } from '../game/constants';
import type { ResourceKey } from '../game/types';
import { Modal } from './Modal';

interface Props {
  resource: ResourceKey;
  playerName: string;
  current: number;
  onApply: (delta: number) => void;
  onClose: () => void;
}

const QUICK_STEPS = [-10, -5, -1, 1, 5, 10];

/** Para gastar o ganar muchas unidades de una vez (p. ej. pagar una carta de 23 M€). */
export function AmountDialog({ resource, playerName, current, onApply, onClose }: Props) {
  const info = RESOURCE_INFO[resource];
  const [delta, setDelta] = useState(0);
  const [custom, setCustom] = useState('');
  const result = Math.max(0, current + delta);
  const customValue = Math.abs(parseInt(custom, 10)) || 0;

  const add = (n: number) => setDelta((d) => Math.max(-current, d + n));

  return (
    <Modal
      title={`${info.label} · ${playerName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary grow" disabled={result === current} onClick={() => onApply(result - current)}>
            Aplicar
          </button>
        </>
      }
    >
      <div className="amount-preview">
        <span>{current}</span>
        <span className={`amount-delta ${delta < 0 ? 'neg' : 'pos'}`}>
          {delta >= 0 ? '+' : '−'} {Math.abs(delta)}
        </span>
        <span>=</span>
        <strong style={{ color: info.color }}>{result}</strong>
      </div>

      <div className="quick-steps">
        {QUICK_STEPS.map((n) => (
          <button key={n} className={`btn ${n < 0 ? 'ghost' : ''}`} onClick={() => add(n)}>
            {n > 0 ? `+${n}` : `−${-n}`}
          </button>
        ))}
      </div>

      <div className="custom-amount">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Cantidad"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          aria-label="Cantidad personalizada"
        />
        <button className="btn ghost" disabled={!customValue} onClick={() => { add(-customValue); setCustom(''); }}>
          Gastar
        </button>
        <button className="btn" disabled={!customValue} onClick={() => { add(customValue); setCustom(''); }}>
          Ganar
        </button>
      </div>
    </Modal>
  );
}
