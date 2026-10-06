import { PLAYER_COLORS } from '../game/constants';

export function ColorPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="color-picker" role="radiogroup" aria-label="Color">
      {PLAYER_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          aria-label={c.label}
          className={`swatch ${value === c.id ? 'selected' : ''}`}
          style={{ background: c.hex }}
          onClick={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}
