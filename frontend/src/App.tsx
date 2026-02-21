import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameState } from './hooks/useGameState';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { LandingPage } from './components/LandingPage';
import { HowToPlay } from './components/HowToPlay';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const gameStateApi = useGameState();
  const { state } = gameStateApi;

  return (
    <BrowserRouter>
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

      <Routes>
        {/* Landing page — app entry point */}
        <Route path="/" element={<LandingPage />} />

        {/* How to play rules page */}
        <Route path="/how-to-play" element={<HowToPlay />} />

        {/* Lobby — moved from "/" to "/play" */}
        <Route
          path="/play"
          element={
            <>
              <div className="city-bg" />
              <div className="rain-bg" />
              <div className="relative z-10 min-h-screen">
                <Lobby api={gameStateApi} />
              </div>
            </>
          }
        />

        {/* Game room */}
        <Route
          path="/room/:code"
          element={
            state.roomCode ? (
              <>
                <div className="city-bg" />
                <div className="rain-bg" />
                <div className="relative z-10 min-h-screen">
                  <Room api={gameStateApi} />
                </div>
              </>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
