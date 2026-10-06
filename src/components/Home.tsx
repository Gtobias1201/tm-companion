import { IconTrash } from '@tabler/icons-react';
import { colorHex } from '../game/constants';
import { isTerraformed } from '../game/logic';
import type { Game } from '../game/types';

interface Props {
  games: Game[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Home({ games, onNew, onOpen, onDelete }: Props) {
  return (
    <div className="page">
      <header className="hero">
        <img src="/mars.svg" alt="" className="hero-logo" />
        <div>
          <h1>TM Companion</h1>
          <p className="muted">Recursos, producción y terraformación de tu partida de Terraforming Mars.</p>
        </div>
      </header>

      <button className="btn primary block" onClick={onNew}>
        + Nueva partida
      </button>

      <h2 className="section-title">Partidas guardadas</h2>
      {games.length === 0 ? (
        <p className="empty">Todavía no hay partidas. Creá una para empezar.</p>
      ) : (
        <ul className="game-list">
          {games.map((g) => (
            <li key={g.id} className="game-item">
              <button className="game-open" onClick={() => onOpen(g.id)}>
                <div className="game-name">{g.name}</div>
                <div className="game-meta">
                  Generación {g.generation}
                  {g.phase === 'finished' ? ' · Finalizada' : isTerraformed(g) ? ' · Marte terraformado' : ''} ·{' '}
                  {new Date(g.updatedAt).toLocaleDateString()}
                </div>
                <div className="game-players">
                  {g.players.map((p) => (
                    <span key={p.id} className="chip">
                      <span className="dot" style={{ background: colorHex(p.color) }} />
                      {p.name} · {p.tr} TR
                    </span>
                  ))}
                </div>
              </button>
              <button
                className="icon-btn danger"
                aria-label={`Borrar ${g.name}`}
                onClick={() => {
                  if (confirm(`¿Borrar la partida "${g.name}"? No se puede recuperar.`)) onDelete(g.id);
                }}
              >
                <IconTrash size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
