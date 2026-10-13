import { lazy, Suspense, useEffect, useReducer, useRef, useState } from 'react';
import { appReducer, loadState, saveState } from './store';
import type { Game } from './game/types';
import { Home } from './components/Home';
import { NewGame } from './components/setup/NewGame';
import { GameScreen } from './components/game/GameScreen';
import { JoinScreen } from './online/JoinScreen';
import { currentClientId, loadClientSession, rememberClientId } from './online/session';
import { normalizeCode } from './net/protocol';
import { Tour } from './components/tour/Tour';
import { tourSeen } from './components/tour/steps';

// El modo online (PeerJS, QR) se descarga recién al usarlo: la app abre más rápido para jugar solo
const OnlineHost = lazy(() => import('./online/OnlineHost').then((m) => ({ default: m.OnlineHost })));
const OnlineClient = lazy(() => import('./online/OnlineClient').then((m) => ({ default: m.OnlineClient })));

/** Guardar en el celular en cada toque es caro con partidas largas: se agrupa y se guarda al salir. */
const SAVE_DEBOUNCE_MS = 400;

type Screen =
  | { kind: 'home' }
  | { kind: 'solo' }
  | { kind: 'host'; resume?: Game }
  | { kind: 'join'; code?: string }
  | { kind: 'client'; code: string; clientId: string };

/** Abrir el link de invitación lleva directo a "Unirme" con el código cargado. */
function screenFromLink(): Screen | null {
  const match = location.hash.match(/join=([A-Za-z0-9]+)/);
  if (!match) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return { kind: 'join', code: normalizeCode(match[1]) };
}

// Se calcula una sola vez al cargar: screenFromLink limpia el link y no puede repetirse
const INITIAL_SCREEN: Screen = screenFromLink() ?? { kind: 'home' };

export function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);
  const [screen, setScreen] = useState<Screen>(INITIAL_SCREEN);
  const home = () => setScreen({ kind: 'home' });
  // El recorrido arranca solo la primera vez, en un celular sin partidas (no al abrir una invitación)
  const [touring, setTouring] = useState(
    () => INITIAL_SCREEN.kind === 'home' && Object.keys(state.games).length === 0 && !loadClientSession() && !tourSeen(),
  );

  const latest = useRef(state);
  latest.current = state;
  const hosting = screen.kind === 'host';
  useEffect(() => {
    // El anfitrión guarda al instante: su copia es la oficial y ya les confirmó a los demás
    if (hosting) return saveState(latest.current);
    const t = window.setTimeout(() => saveState(latest.current), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [state.games, state.currentId, hosting]);
  // Al cerrar o mandar la app al fondo se guarda ya, sin esperar
  useEffect(() => {
    const flush = () => saveState(latest.current);
    const onHidden = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, []);

  // Un link de invitación abierto con la app ya cargada en esta pestaña
  useEffect(() => {
    const onHash = () => {
      const next = screenFromLink();
      if (next) setScreen(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  switch (screen.kind) {
    case 'host':
      return (
        <Suspense fallback={<Loading />}>
          <OnlineHost resume={screen.resume} onSave={(game) => dispatch({ type: 'save', game })} onExit={home} />
        </Suspense>
      );
    case 'join':
      return (
        <JoinScreen
          initialCode={screen.code}
          onCancel={home}
          onJoin={(code) => setScreen({ kind: 'client', code, clientId: currentClientId() })}
        />
      );
    case 'client':
      return (
        <Suspense fallback={<Loading />}>
          <OnlineClient code={screen.code} clientId={screen.clientId} onExit={home} />
        </Suspense>
      );
    case 'solo':
      return (
        <NewGame
          onCancel={home}
          onCreate={(g) => {
            dispatch({ type: 'create', game: g });
            home();
          }}
        />
      );
  }

  const homeView = (
    <Home
      games={Object.values(state.games).sort((a, b) => b.updatedAt - a.updatedAt)}
      clientSession={loadClientSession()}
      onHost={() => setScreen({ kind: 'host' })}
      onJoin={() => setScreen({ kind: 'join' })}
      onSolo={() => setScreen({ kind: 'solo' })}
      onRejoin={(session) => {
        rememberClientId(session.clientId);
        setScreen({ kind: 'client', code: session.code, clientId: session.clientId });
      }}
      onOpen={(id) => {
        const g = state.games[id];
        // Una partida online guardada en este celular se vuelve a hospedar con el mismo código
        if (g?.online) setScreen({ kind: 'host', resume: g });
        else dispatch({ type: 'open', id });
      }}
      onDelete={(id) => dispatch({ type: 'delete', id })}
      onTour={() => setTouring(true)}
    />
  );
  if (touring) return <Tour home={homeView} onClose={() => setTouring(false)} />;

  // Partidas locales: solitario (y partidas de un solo celular guardadas antes del modo online)
  const game = state.currentId ? state.games[state.currentId] : null;
  if (game) {
    return (
      <GameScreen
        game={game}
        canUndo={(state.undo[game.id]?.length ?? 0) > 0}
        dispatch={(action) => dispatch({ type: 'game', action })}
        onUndo={() => dispatch({ type: 'undo' })}
        onExit={() => dispatch({ type: 'close' })}
      />
    );
  }

  return homeView;
}

function Loading() {
  return (
    <div className="page">
      <div className="empty-state">
        <p className="muted">Cargando…</p>
      </div>
    </div>
  );
}
