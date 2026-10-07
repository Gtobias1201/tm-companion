import { IconBook, IconChevronRight, IconDeviceMobile, IconLogin, IconTrash, IconUser, IconWifi } from '@tabler/icons-react';
import { useState } from 'react';
import { colorHex } from '../game/constants';
import { isTerraformed } from '../game/logic';
import type { Game } from '../game/types';
import type { ClientSession } from '../online/session';
import { GUIDE_TOPIC_COUNT, Guide } from './Guide';

interface Props {
  games: Game[];
  /** Última partida online a la que se unió este celular como invitado. */
  clientSession: ClientSession | null;
  onHost: () => void;
  onJoin: () => void;
  onSolo: () => void;
  onRejoin: (session: ClientSession) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Home({ games, clientSession, onHost, onJoin, onSolo, onRejoin, onOpen, onDelete }: Props) {
  const [guide, setGuide] = useState(false);
  return (
    <div className="page">
      <header className="hero">
        <img src={`${import.meta.env.BASE_URL}mars.svg`} alt="" className="hero-logo" />
        <div>
          <h1>TM Companion</h1>
          <p className="muted">Recursos, producción y terraformación de tu partida de Terraforming Mars.</p>
        </div>
      </header>

      <div className="home-actions">
        <button className="btn primary block" onClick={onHost}>
          <IconWifi size={18} /> Crear partida online
        </button>
        <button className="btn block" onClick={onJoin}>
          <IconLogin size={18} /> Unirme con un código
        </button>
        <button className="btn ghost block" onClick={onSolo}>
          <IconUser size={18} /> Partida solitaria (sin conexión)
        </button>
      </div>

      <button className="guide-entry" onClick={() => setGuide(true)}>
        <span className="guide-icon big">
          <IconBook size={22} />
        </span>
        <span className="grow">
          <strong>Guía de uso</strong>
          <small className="muted">Cómo se usa la app, en {GUIDE_TOPIC_COUNT} temas cortos</small>
        </span>
        <IconChevronRight size={18} className="muted" aria-hidden />
      </button>

      {clientSession && (
        <button className="game-open rejoin" onClick={() => onRejoin(clientSession)}>
          <IconDeviceMobile size={20} aria-hidden />
          <span className="grow">
            <strong>Volver a {clientSession.name}</strong>
            <small className="muted">Partida online · código {clientSession.code}</small>
          </span>
        </button>
      )}

      <h2 className="section-title">Partidas guardadas</h2>
      {games.length === 0 ? (
        <p className="empty">Todavía no hay partidas en este celular.</p>
      ) : (
        <ul className="game-list">
          {games.map((g) => (
            <li key={g.id} className="game-item">
              <button className="game-open" onClick={() => onOpen(g.id)}>
                <div className="game-name">{g.name}</div>
                <div className="game-meta">
                  {g.online ? `Online · sos el anfitrión · código ${g.online.code}` : 'Sin conexión'} · Generación{' '}
                  {g.generation}
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

      {guide && <Guide onClose={() => setGuide(false)} />}
    </div>
  );
}
