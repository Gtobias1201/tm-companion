import { IconArrowRight, IconCreditCard, IconPencil, IconTemperature, IconTrees } from '@tabler/icons-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { findCorporation } from '../game/catalog';
import { GLOBAL_INFO, HEAT_PER_TEMPERATURE, LIMITS, colorHex } from '../game/constants';
import { isTurnOf, productionMin, type Action, type TileKind } from '../game/logic';
import { RESOURCES, type Game, type Player, type ResourceKey } from '../game/types';
import { ResourceCard } from './ResourceCard';
import { AmountDialog } from './AmountDialog';
import { PlayerEditDialog } from './PlayerEditDialog';
import { PaymentDialog } from './PaymentDialog';
import { DiscountsPanel } from './DiscountsPanel';
import { TurnPanel } from './TurnPanel';
import { Modal } from './Modal';
import { SingleTileIcon, TileIcon } from './icons';

interface Props {
  game: Game;
  player: Player;
  dispatch: (action: Action) => void;
}

type Sheet = 'megacredits' | 'tr' | 'edit' | 'pay' | 'tiles' | null;

/** Pantalla principal del jugador, pensada para entrar entera en el celular. */
export function PlayerBoard({ game, player, dispatch }: Props) {
  const [amountKey, setAmountKey] = useState<ResourceKey | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const temperatureMaxed = game.globals.temperature >= LIMITS.temperature.max;
  const pid = player.id;
  const corpNote = findCorporation(player.corporationId)?.note;
  // Pagar, bosque y temperatura son acciones: solo en el turno del jugador
  const canAct = isTurnOf(game, pid);

  const notes: Partial<Record<ResourceKey, string>> = {
    steel: `vale ${player.steelValue}`,
    titanium: `vale ${player.titaniumValue}`,
  };
  // Las conversiones van dentro de su recurso, como en el tablero físico
  const actions: Partial<Record<ResourceKey, ReactNode>> = {
    megacredits: (
      <button className="res-action" onClick={() => setSheet('megacredits')}>
        <IconCreditCard size={14} aria-hidden /> Pagar
        {player.discounts.length > 0 && <span className="res-action-badge">−{player.discounts.length}</span>}
      </button>
    ),
    plants: (
      <button
        className="res-action"
        disabled={!canAct || player.resources.plants < player.greeneryCost}
        onClick={() => dispatch({ type: 'greenery', playerId: pid })}
        aria-label={`Bosque: −${player.greeneryCost} plantas`}
      >
        <IconTrees size={14} aria-hidden /> {player.greeneryCost} → bosque
      </button>
    ),
    energy: (
      <span className="res-action hint-only">
        <IconArrowRight size={14} aria-hidden /> a calor
      </span>
    ),
    heat: (
      <button
        className="res-action"
        disabled={!canAct || player.resources.heat < HEAT_PER_TEMPERATURE || temperatureMaxed}
        onClick={() => dispatch({ type: 'heatToTemperature', playerId: pid })}
        aria-label={`Temperatura: −${HEAT_PER_TEMPERATURE} calor`}
      >
        <IconTemperature size={14} aria-hidden /> {HEAT_PER_TEMPERATURE} → temp
      </button>
    ),
  };

  return (
    <section className="player-board" style={{ '--p-color': colorHex(player.color) } as CSSProperties}>
      <div className="player-line">
        <span className="dot" />
        <span className="player-line-name">
          <strong>{player.name}</strong>
          {player.corporation && <span className="muted"> · {player.corporation}</span>}
        </span>
        <button className="tile-btn" onClick={() => setSheet('tiles')} aria-label="Colocar loseta de una carta">
          <TileIcon size={24} />
          <span className="tile-btn-plus" aria-hidden>
            +
          </span>
        </button>
        <button className="tr-plate" onClick={() => setSheet('tr')} aria-label={`Nivel de terraformación ${player.tr}. Tocar para ajustar`}>
          <span>TR</span>
          <b>{player.tr}</b>
        </button>
        <button className="icon-btn mini" onClick={() => setSheet('edit')} aria-label="Editar jugador">
          <IconPencil size={16} />
        </button>
      </div>

      <TurnPanel game={game} player={player} dispatch={dispatch} />

      {/* Placa con la estética del tablero de jugador */}
      <div className="board">
        <div className="res-grid">
          {RESOURCES.map((k) => (
            <ResourceCard
              key={k}
              resource={k}
              stock={player.resources[k]}
              production={player.production[k]}
              productionMin={productionMin(k)}
              note={notes[k]}
              action={actions[k]}
              onStock={(delta) => dispatch({ type: 'resource', playerId: pid, key: k, delta })}
              onProduction={(delta) => dispatch({ type: 'production', playerId: pid, key: k, delta })}
              onOpenAmount={() => setAmountKey(k)}
            />
          ))}
        </div>
        <p className="board-legend">Visor oscuro: stock · placa marrón: producción</p>
      </div>

      {sheet === 'megacredits' && (
        <Modal title="MegaCréditos" onClose={() => setSheet(null)}>
          <button className="btn primary block" disabled={!canAct} onClick={() => setSheet('pay')}>
            <IconCreditCard size={18} /> Pagar carta o proyecto
          </button>
          {!canAct && <p className="note">Pagar es una acción: solo en tu turno.</p>}
          <button
            className="btn block"
            onClick={() => {
              setSheet(null);
              setAmountKey('megacredits');
            }}
          >
            Sumar o gastar M€ a mano
          </button>
          {corpNote && <p className="note">{player.corporation}: {corpNote}</p>}
          <DiscountsPanel player={player} dispatch={dispatch} />
        </Modal>
      )}
      {sheet === 'tr' && (
        <Modal title="Nivel de terraformación" onClose={() => setSheet(null)}>
          <div className="tr-sheet">
            <button className="step" onClick={() => dispatch({ type: 'tr', playerId: pid, delta: -1 })} aria-label="Restar TR">
              −
            </button>
            <span className="tr-value">{player.tr}</span>
            <button className="step" onClick={() => dispatch({ type: 'tr', playerId: pid, delta: 1 })} aria-label="Sumar TR">
              +
            </button>
          </div>
          <p className="note">
            Cada TR da 1 M€ por generación y 1 PV. Los parámetros globales y los bosques ya lo suben solos; usá esto
            para efectos de cartas.
          </p>
        </Modal>
      )}
      {sheet === 'tiles' && (
        <TilesSheet
          game={game}
          onClose={() => setSheet(null)}
          onPlace={(tile) => {
            dispatch({ type: 'placeTile', playerId: pid, tile });
            setSheet(null);
          }}
        />
      )}
      {sheet === 'pay' && (
        <PaymentDialog
          player={player}
          venus={game.options.venus}
          onClose={() => setSheet(null)}
          onPay={(request) => {
            dispatch({ type: 'pay', playerId: pid, ...request });
            setSheet(null);
          }}
        />
      )}
      {sheet === 'edit' && (
        <PlayerEditDialog
          player={player}
          onClose={() => setSheet(null)}
          onSave={(patch) => {
            dispatch({ type: 'updatePlayer', playerId: pid, patch });
            setSheet(null);
          }}
        />
      )}
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
    </section>
  );
}

/** Losetas que colocan las cartas de proyecto, con sus efectos sobre los parámetros globales. */
function TilesSheet({ game, onPlace, onClose }: { game: Game; onPlace: (tile: TileKind) => void; onClose: () => void }) {
  const oxygenMaxed = game.globals.oxygen >= LIMITS.oxygen.max;
  const oceansMaxed = game.globals.oceans >= LIMITS.oceans.max;
  const options: { kind: TileKind; label: string; effect: string; disabled?: boolean }[] = [
    {
      kind: 'greenery',
      label: 'Bosque',
      effect: oxygenMaxed ? '+1 bosque · el oxígeno ya está al máximo' : '+1 bosque · sube el oxígeno (+1 TR)',
    },
    { kind: 'city', label: 'Ciudad', effect: '+1 ciudad (para hitos y premios)' },
    {
      kind: 'ocean',
      label: 'Océano',
      effect: oceansMaxed ? 'Ya están los 9 océanos' : `${GLOBAL_INFO.oceans.format(game.globals.oceans + 1)} · +1 TR`,
      disabled: oceansMaxed,
    },
  ];

  return (
    <Modal title="Colocar loseta" onClose={onClose}>
      <p className="note">
        Para losetas que coloca una carta de proyecto. No gasta una acción: la acción fue jugar la carta. Los
        bonus del espacio (acero, plantas, cartas) se cargan a mano.
      </p>
      <div className="tile-options">
        {options.map((o) => (
          <button key={o.kind} className={`tile-option ${o.kind}`} disabled={o.disabled} onClick={() => onPlace(o.kind)}>
            <SingleTileIcon kind={o.kind} size={34} />
            <span className="grow">
              <strong>{o.label}</strong>
              <small>{o.effect}</small>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
