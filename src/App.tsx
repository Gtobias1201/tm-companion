import { useEffect, useReducer, useState } from 'react';
import { appReducer, loadState, saveState } from './store';
import { Home } from './components/Home';
import { NewGame } from './components/NewGame';
import { GameScreen } from './components/GameScreen';

export function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);
  const [creating, setCreating] = useState(false);

  useEffect(() => saveState(state), [state.games, state.currentId]);

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

  if (creating) {
    return (
      <NewGame
        onCancel={() => setCreating(false)}
        onCreate={(g) => {
          setCreating(false);
          dispatch({ type: 'create', game: g });
        }}
      />
    );
  }

  return (
    <Home
      games={Object.values(state.games).sort((a, b) => b.updatedAt - a.updatedAt)}
      onNew={() => setCreating(true)}
      onOpen={(id) => dispatch({ type: 'open', id })}
      onDelete={(id) => dispatch({ type: 'delete', id })}
    />
  );
}
