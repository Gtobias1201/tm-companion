import { useState, type CSSProperties } from 'react';
import { RESEARCH_CARDS, colorHex } from '../game/constants';
import { maxCardsToBuy } from '../game/logic';
import type { Game } from '../game/types';
import { Modal } from './Modal';

interface Props {
  game: Game;
  onConfirm: (purchases: Record<string, number>) => void;
  onClose: () => void;
}

const OPTIONS = Array.from({ length: RESEARCH_CARDS + 1 }, (_, i) => i);

export function ResearchDialog({ game, onConfirm, onClose }: Props) {
  const [purchases, setPurchases] = useState<Record<string, number>>({});
  const total = game.players.reduce((sum, p) => sum + (purchases[p.id] ?? 0) * p.cardCost, 0);

  return (
    <Modal
      title={`Generación ${game.generation} · investigación`}
      onClose={onClose}
      footer={
        <button className="btn primary grow" onClick={() => onConfirm(purchases)}>
          {total > 0 ? `Confirmar compras (−${total} M€)` : 'Confirmar sin comprar'}
        </button>
      }
    >
      <p className="muted">
        Cada jugador roba {RESEARCH_CARDS} cartas y elige cuántas se queda. Se descuentan los M€ al confirmar.
      </p>

      <div className="research-list">
        {game.players.map((p) => {
          const n = purchases[p.id] ?? 0;
          const max = maxCardsToBuy(p);
          return (
            <div key={p.id} className="research-player" style={{ '--p-color': colorHex(p.color) } as CSSProperties}>
              <div className="research-head">
                <span className="research-name">
                  <span className="dot" /> {p.name}
                </span>
                <span className="muted small">
                  {p.resources.megacredits} M€ · {p.cardCost} por carta
                </span>
              </div>
              <div className="card-picker" role="radiogroup" aria-label={`Cartas que compra ${p.name}`}>
                {OPTIONS.map((i) => (
                  <button
                    key={i}
                    role="radio"
                    aria-checked={n === i}
                    className={n === i ? 'on' : ''}
                    disabled={i > max}
                    onClick={() => setPurchases((s) => ({ ...s, [p.id]: i }))}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="research-foot small">
                {n > 0 ? (
                  <span>
                    Paga <strong>{n * p.cardCost} M€</strong> · le quedan {p.resources.megacredits - n * p.cardCost} M€
                  </span>
                ) : (
                  <span className="muted">No compra cartas</span>
                )}
                {max < RESEARCH_CARDS && <span className="muted"> · alcanza para {max}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
