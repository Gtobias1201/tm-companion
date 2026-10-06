import type { Game } from '../game/types';
import { Modal } from './Modal';

export function LogDialog({ game, onClose }: { game: Game; onClose: () => void }) {
  const entries = [...game.log].reverse();
  return (
    <Modal title="Registro" onClose={onClose}>
      {entries.length === 0 ? (
        <p className="empty">Sin movimientos todavía.</p>
      ) : (
        <ol className="log-list">
          {entries.map((e, i) => (
            <li key={e.id}>
              {(i === 0 || entries[i - 1].generation !== e.generation) && (
                <div className="log-gen">Generación {e.generation}</div>
              )}
              <div className="log-line">
                <time className="muted">
                  {new Date(e.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </time>
                <span>{e.text}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
