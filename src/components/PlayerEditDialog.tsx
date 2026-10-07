import { IconDeviceMobile, IconMoon, IconSun } from '@tabler/icons-react';
import { useState } from 'react';
import { DEFAULT_CARD_COST } from '../game/constants';
import { useThemePref, type ThemePref } from '../theme';
import type { PlayerPatch } from '../game/logic';
import type { Player } from '../game/types';
import { ColorPicker } from './ColorPicker';
import { Modal } from './Modal';

interface Props {
  player: Player;
  onSave: (patch: PlayerPatch) => void;
  onClose: () => void;
}

const THEME_OPTIONS: { id: ThemePref; label: string; Icon: typeof IconSun }[] = [
  { id: 'light', label: 'Día', Icon: IconSun },
  { id: 'dark', label: 'Noche', Icon: IconMoon },
  { id: 'auto', label: 'Auto', Icon: IconDeviceMobile },
];

export function PlayerEditDialog({ player, onSave, onClose }: Props) {
  // La apariencia es del celular, no del jugador: se guarda aparte y no espera a "Guardar"
  const [themePref, setThemePref] = useThemePref();
  const [name, setName] = useState(player.name);
  const [corporation, setCorporation] = useState(player.corporation);
  const [color, setColor] = useState(player.color);
  const [greeneryCost, setGreeneryCost] = useState(player.greeneryCost);
  const [steelValue, setSteelValue] = useState(player.steelValue);
  const [titaniumValue, setTitaniumValue] = useState(player.titaniumValue);
  const [cardCost, setCardCost] = useState(player.cardCost ?? DEFAULT_CARD_COST);

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
            onClick={() => onSave({ name: name.trim() || player.name, corporation: corporation.trim(), color, greeneryCost, steelValue, titaniumValue, cardCost })}
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
      <div className="row">
        <label className="field grow">
          <span>Valor del acero (M€)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={steelValue}
            onChange={(e) => setSteelValue(Number(e.target.value) || 1)}
          />
        </label>
        <label className="field grow">
          <span>Valor del titanio (M€)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={titaniumValue}
            onChange={(e) => setTitaniumValue(Number(e.target.value) || 1)}
          />
        </label>
      </div>
      <small className="muted">Normal: acero 2 y titanio 3 · Phobolog: titanio 4 · Advanced Alloys: +1 a ambos</small>
      <label className="field">
        <span>Costo por carta en la investigación (M€)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={cardCost}
          onChange={(e) => setCardCost(Math.max(0, Number(e.target.value) || 0))}
        />
        <small className="muted">3 normalmente · Polyphemos 5 · Terralabs 1</small>
      </label>

      <div className="field">
        <span>Apariencia en este celular</span>
        <div className="segmented three" role="radiogroup" aria-label="Apariencia">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={themePref === o.id}
              className={themePref === o.id ? 'on' : ''}
              onClick={() => setThemePref(o.id)}
            >
              <o.Icon size={16} aria-hidden /> {o.label}
            </button>
          ))}
        </div>
        <small className="muted">Se aplica al instante. "Automático" sigue el modo del celular.</small>
      </div>
    </Modal>
  );
}
