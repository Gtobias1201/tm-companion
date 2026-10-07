import { IconCopy, IconShare } from '@tabler/icons-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { inviteLink } from '../net/protocol';

/** Código de invitación grande, QR y botones para compartir el link. */
export function InviteCard({ code }: { code: string }) {
  const link = inviteLink(code);
  const [svg, setSvg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Siempre oscuro sobre blanco: los lectores de QR fallan con colores invertidos
    QRCode.toString(link, { type: 'svg', margin: 1, color: { dark: '#2c2c2a', light: '#ffffff' } })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin permiso de portapapeles: queda el código a la vista
    }
  };

  const share = () => navigator.share?.({ title: 'TM Companion', text: `Unite a mi partida: ${code}`, url: link });

  return (
    <section className="invite-card" aria-label="Invitación">
      <div className="invite-text">
        <span className="muted small">Código de la partida</span>
        <strong className="invite-code">{code}</strong>
        <span className="muted small">Los demás tocan "Unirme" e ingresan el código, o escanean el QR.</span>
        <div className="row">
          <button className="btn small" onClick={copy}>
            <IconCopy size={16} /> {copied ? 'Copiado' : 'Copiar link'}
          </button>
          {'share' in navigator && (
            <button className="btn small" onClick={share}>
              <IconShare size={16} /> Compartir
            </button>
          )}
        </div>
      </div>
      {svg && <div className="invite-qr" aria-label="Código QR para unirse" dangerouslySetInnerHTML={{ __html: svg }} />}
    </section>
  );
}
