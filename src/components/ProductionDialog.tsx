import { RESOURCE_INFO, colorHex } from '../game/constants';
import { productionPreview } from '../game/logic';
import { RESOURCES, type Game } from '../game/types';
import { Modal } from './Modal';
import { ResourceIcon } from './icons';

interface Props {
  game: Game;
  onConfirm: () => void;
  onClose: () => void;
}

export function ProductionDialog({ game, onConfirm, onClose }: Props) {
  return (
    <Modal
      title={`Fin de la generación ${game.generation}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary grow" onClick={onConfirm}>
            Aplicar producción
          </button>
        </>
      }
    >
      <p className="muted">
        La energía sobrante se convierte en calor y cada jugador recibe M€ igual a su TR + producción de M€.
      </p>
      <div className="prod-summary">
        {game.players.map((p) => {
          const gains = productionPreview(p);
          return (
            <div key={p.id} className="prod-player">
              <div className="prod-player-name">
                <span className="dot" style={{ background: colorHex(p.color) }} /> {p.name}
              </div>
              <div className="prod-gains">
                {RESOURCES.map((k) => {
                  const after = k === 'energy' ? Math.max(0, p.production.energy) : Math.max(0, p.resources[k] + gains[k]);
                  return (
                    <div key={k} className="prod-gain" style={{ color: RESOURCE_INFO[k].color }}>
                      <ResourceIcon resource={k} />
                      <span className="prod-gain-value">{after}</span>
                      <small className="muted">
                        {gains[k] >= 0 ? '+' : ''}
                        {gains[k]}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
