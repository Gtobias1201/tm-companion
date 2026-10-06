import type { CSSProperties } from 'react';
import { colorHex } from '../game/constants';
import { scoreOf, type Action } from '../game/logic';
import type { Game, Player } from '../game/types';
import { ScoreCounters } from './ScoreCounters';

interface Props {
  game: Game;
  active: Player;
  dispatch: (action: Action) => void;
}

export function ScorePanel({ game, active, dispatch }: Props) {
  const rows = game.players
    .map((p) => ({ p, s: scoreOf(game, p) }))
    .sort((a, b) => b.s.total - a.s.total);

  return (
    <div className="score">
      <section className="score-table" aria-label="Puntos de todos los jugadores">
        {rows.map(({ p, s }, i) => (
          <div
            key={p.id}
            className={`score-row ${p.id === active.id ? 'current' : ''}`}
            style={{ '--p-color': colorHex(p.color) } as CSSProperties}
          >
            <span className="score-pos">{i + 1}</span>
            <div className="score-who">
              <strong>
                <span className="dot" /> {p.name}
              </strong>
              <small className="muted">
                TR {s.tr} · hitos {s.milestones} · bosques {s.greeneries} · ciudades {s.cities} · cartas {s.cards}
                {s.jovian > 0 && ` · jovianos ${s.jovian}`}
              </small>
            </div>
            <span className="score-total">
              {s.total}
              <small>PV</small>
            </span>
          </div>
        ))}
        <p className="hint">Los premios se suman al final de la partida.</p>
      </section>

      <section className="score-counters" aria-label={`Contadores de ${active.name}`}>
        <h2>Contadores de {active.name}</h2>
        <ScoreCounters player={active} dispatch={dispatch} />
      </section>
    </div>
  );
}
