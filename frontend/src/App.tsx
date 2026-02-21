import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameState } from './hooks/useGameState';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const gameStateApi = useGameState();
  const { state } = gameStateApi;

  return (
    <BrowserRouter>
      {/* Fixed noir background */}
      <div className="city-bg" />
      <div className="rain-bg" />

      {/* Global error toast */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            className="error-toast"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            ⚠ {state.error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen">
        <Routes>
          <Route path="/" element={<Lobby api={gameStateApi} />} />
          <Route
            path="/room/:code"
            element={
              state.roomCode ? (
                <Room api={gameStateApi} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
