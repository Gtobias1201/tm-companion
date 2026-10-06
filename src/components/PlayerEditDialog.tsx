import { useState } from 'react';
import type { PlayerPatch } from '../game/logic';
import type { Player } from '../game/types';
import { ColorPicker } from './ColorPicker';
import { Modal } from './Modal';

interface Props {
  player: Player;
  onSave: (patch: PlayerPatch) => void;
  onClose: () => void;
}

export function PlayerEditDialog({ player, onSave, onClose }: Props) {
  const [name, setName] = useState(player.name);
  const [corporation, setCorporation] = useState(player.corporation);
  const [color, setColor] = useState(player.color);
  const [greeneryCost, setGreeneryCost] = useState(player.greeneryCost);

  return (
    <Modal
      title="Editar jugador"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary grow"
            onClick={() => onSave({ name: name.trim() || player.name, corporation: corporation.trim(), color, greeneryCost })}
          >
            Guardar
          </button>
        </>
      }
    >
      <label className="field">
        <span>Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>Corporación</span>
        <input value={corporation} onChange={(e) => setCorporation(e.target.value)} />
      </label>
      <div className="field">
        <span>Color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <label className="field">
        <span>Plantas por bosque</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={greeneryCost}
          onChange={(e) => setGreeneryCost(Number(e.target.value) || 1)}
        />
        <small className="muted">8 normalmente · 7 con Ecoline</small>
      </label>
    </Modal>
  );
}
