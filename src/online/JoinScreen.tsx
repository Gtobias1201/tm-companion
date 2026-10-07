import { IconArrowLeft } from '@tabler/icons-react';
import { useState, type FormEvent } from 'react';
import { isValidCode, normalizeCode } from '../net/protocol';

interface Props {
  initialCode?: string;
  onJoin: (code: string) => void;
  onCancel: () => void;
}

export function JoinScreen({ initialCode = '', onJoin, onCancel }: Props) {
  const [code, setCode] = useState(normalizeCode(initialCode));
  const valid = isValidCode(code);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onJoin(code);
  };

  return (
    <form className="page" onSubmit={submit}>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Volver">
          <IconArrowLeft size={20} />
        </button>
        <h1>Unirme a una partida</h1>
      </header>

      <label className="field">
        <span>Código que te pasó el anfitrión</span>
        <input
          className="code-input"
          value={code}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABC23"
          onChange={(e) => setCode(normalizeCode(e.target.value))}
        />
      </label>
      <p className="note">El anfitrión tiene que tener la app abierta con la sala de espera.</p>

      <button type="submit" className="btn primary block" disabled={!valid}>
        Unirme
      </button>
    </form>
  );
}
