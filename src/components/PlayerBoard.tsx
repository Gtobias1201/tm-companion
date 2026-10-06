import { useState, type CSSProperties } from 'react';
import { HEAT_PER_TEMPERATURE, LIMITS, RESOURCE_INFO, colorHex } from '../game/constants';
import { productionMin, type Action } from '../game/logic';
import { RESOURCES, type Game, type Player, type ResourceKey } from '../game/types';
import { ResourceCard } from './ResourceCard';
import { AmountDialog } from './AmountDialog';
import { PlayerEditDialog } from './PlayerEditDialog';

interface Props {
  game: Game;
  player: Player;
  dispatch: (action: Action) => void;
}

export function PlayerBoard({ game, player, dispatch }: Props) {
  const [amountKey, setAmountKey] = useState<ResourceKey | null>(null);
  const [editing, setEditing] = useState(false);
  const temperatureMaxed = game.globals.temperature >= LIMITS.temperature.max;
  const pid = player.id;

  return (
    <section className="player-board" style={{ '--p-color': colorHex(player.color) } as CSSProperties}>
      <div className="player-head">
        <div>
          <h2>{player.name}</h2>
          {player.corporation && <div className="muted">{player.corporation}</div>}
        </div>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar jugador">
          ✎
        </button>
      </div>

      <div className="tr-row">
        <div>
          <div className="tr-label">Nivel de Terraformación</div>
          <div className="muted small">Cada TR da 1 M€ por generación y 1 PV</div>
        </div>
        <div className="stepper">
          <button className="step" onClick={() => dispatch({ type: 'tr', playerId: pid, delta: -1 })} aria-label="Restar TR">
            −
          </button>
          <span className="tr-value">{player.tr}</span>
          <button className="step" onClick={() => dispatch({ type: 'tr', playerId: pid, delta: 1 })} aria-label="Sumar TR">
            +
          </button>
        </div>
      </div>

      <div className="res-grid">
        {RESOURCES.map((k) => (
          <ResourceCard
            key={k}
            resource={k}
            stock={player.resources[k]}
            production={player.production[k]}
            productionMin={productionMin(k)}
            onStock={(delta) => dispatch({ type: 'resource', playerId: pid, key: k, delta })}
            onProduction={(delta) => dispatch({ type: 'production', playerId: pid, key: k, delta })}
            onOpenAmount={() => setAmountKey(k)}
          />
        ))}
      </div>

      <div className="conversions">
        <button
          className="btn convert"
          style={{ '--c-color': RESOURCE_INFO.plants.color } as CSSProperties}
          disabled={player.resources.plants < player.greeneryCost}
          onClick={() => dispatch({ type: 'greenery', playerId: pid })}
        >
          🌲 Bosque
          <small>−{player.greeneryCost} plantas · sube O₂</small>
        </button>
        <button
          className="btn convert"
          style={{ '--c-color': RESOURCE_INFO.heat.color } as CSSProperties}
          disabled={player.resources.heat < HEAT_PER_TEMPERATURE || temperatureMaxed}
          onClick={() => dispatch({ type: 'heatToTemperature', playerId: pid })}
        >
          🌡 Temperatura
          <small>−{HEAT_PER_TEMPERATURE} calor · +1 TR</small>
        </button>
      </div>

      {amountKey && (
        <AmountDialog
          resource={amountKey}
          playerName={player.name}
          current={player.resources[amountKey]}
          onClose={() => setAmountKey(null)}
          onApply={(delta) => {
            dispatch({ type: 'resource', playerId: pid, key: amountKey, delta });
            setAmountKey(null);
          }}
        />
      )}
      {editing && (
        <PlayerEditDialog
          player={player}
          onClose={() => setEditing(false)}
          onSave={(patch) => {
            dispatch({ type: 'updatePlayer', playerId: pid, patch });
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}
