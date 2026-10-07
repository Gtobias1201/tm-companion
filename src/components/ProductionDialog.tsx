import { RESOURCE_INFO, colorHex } from '../game/constants';
import { productionPreview } from '../game/logic';
import { RESOURCES, type Game } from '../game/types';
import { Modal } from './Modal';
import { ResourceIcon } from './icons';

interface Props {
  game: Game;
  /** Última generación: después de esta producción termina la partida. */
  final?: boolean;
  /** Online: cada celular ve solo su propia producción. */
  onlyPlayerId?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ProductionDialog({ game, final, onlyPlayerId, onConfirm, onClose }: Props) {
  const players = onlyPlayerId ? game.players.filter((p) => p.id === onlyPlayerId) : game.players;
  return (
    <Modal
      title={final ? `Producción final · generación ${game.generation}` : `Fin de la generación ${game.generation}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary grow" onClick={onConfirm}>
            {final ? 'Aplicar y terminar la partida' : 'Aplicar producción'}
          </button>
        </>
      }
    >
      <p className="muted">
        La energía sobrante se convierte en calor y cada jugador recibe M€ igual a su TR + producción de M€.
      </p>
      <div className="prod-summary">
        {players.map((p) => {
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
