import { useEffect, useReducer, useState } from 'react';
import { appReducer, loadState, saveState } from './store';
import type { Game } from './game/types';
import { Home } from './components/Home';
import { NewGame } from './components/NewGame';
import { GameScreen } from './components/GameScreen';
import { OnlineHost } from './online/OnlineHost';
import { OnlineClient } from './online/OnlineClient';
import { JoinScreen } from './online/JoinScreen';
import { currentClientId, loadClientSession, rememberClientId } from './online/session';
import { normalizeCode } from './net/protocol';

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

  useEffect(() => saveState(state), [state.games, state.currentId]);

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
        <OnlineHost resume={screen.resume} onSave={(game) => dispatch({ type: 'save', game })} onExit={home} />
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
      return <OnlineClient code={screen.code} clientId={screen.clientId} onExit={home} />;
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

  return (
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
    />
  );
}
