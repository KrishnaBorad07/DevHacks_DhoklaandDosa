# Who Lies Tonight? (WLT) 🎭🕶️

A production-grade multiplayer **Mafia/Werewolf** browser game set in a neon-noir 1920s–1980s crime syndicate city.

## Tech Stack

| Layer    | Technology                                         |
| -------- | -------------------------------------------------- |
| Frontend | Vite + React 19 + TypeScript + Framer Motion       |
| Styling  | Vanilla CSS (noir palette: #000, #FF0000, #FFD700) |
| Backend  | Node.js 22 + Express + Socket.io v4.8              |
| Realtime | Socket.io (in-memory rooms, no DB)                 |

## Quick Start

### 1. Install backend dependencies

```bash
cd backend
npm install
npm run dev        # Starts on http://localhost:3001
```

### 2. Install frontend dependencies (separate terminal)

```bash
cd frontend
npm install
npm run dev        # Starts on http://localhost:5173
```

### 3. Open the game

Visit **http://localhost:5173**

- Click **Create Room** → get a 6-char code (e.g. `X7K9P2`)
- Open 3+ more browser tabs → **Join Room** with the same code
- When 4+ players are in, the **host** clicks **START GAME**

---

## Roles (assigned randomly)

| Role                | Count rule         | Night action                          |
| ------------------- | ------------------ | ------------------------------------- |
| 🕶️ Gangster (Mafia) | ~33% (min 1)       | Choose 1 player to eliminate          |
| 💉 Doctor           | Always 1           | Choose 1 player to protect            |
| 🕵️ Detective        | Only if >4 players | Investigate 1 player (learn if Mafia) |
| 👤 Citizen          | Remainder          | No action (wait for day)              |

## Phases

1. **Night (60s)** – Mafia vote kill, Doctor saves, Detective investigates
2. **Day (90s)** – Narration + cutscene play; all players discuss
3. **Vote (30s)** – Click an avatar to vote; majority → lynched
4. Repeat until win condition

## Win Conditions

- 🕶️ **Mafia wins** when alive Mafia ≥ alive Town
- 🏙️ **Town wins** when all Mafia are eliminated

---

## Project Structure

```
Devhacks/
├── backend/
│   └── src/
│       ├── server.ts       ← Express + Socket.io entry
│       ├── gameState.ts    ← TypeScript interfaces
│       ├── gameLogic.ts    ← Roles, night resolution, win checks
│       ├── narrator.ts     ← Hardcoded narrator strings
│       └── roomManager.ts  ← In-memory room CRUD + cleanup
└── frontend/
    └── src/
        ├── App.tsx
        ├── index.css       ← Noir theme
        ├── hooks/          ← useSocket, useGameState
        ├── lib/            ← avatarConfig (SVG renderer)
        ├── types/          ← Shared TypeScript types
        └── components/
            ├── Lobby.tsx
            ├── Room.tsx            ← Master game view
            ├── AvatarPicker.tsx    ← Lego-style avatar system
            ├── TableScene.tsx      ← Round table + avatars
            ├── NarratorBox.tsx     ← Crime boss + typewriter
            ├── CutscenePlayer.tsx  ← 4 film-noir cutscenes
            ├── Chat.tsx            ← Global + Mafia chat
            ├── PhaseOverlay.tsx    ← Night Falls / Day Breaks
            ├── NightActionModal.tsx ← Night role actions
            ├── VotePanel.tsx       ← Day voting UI
            └── GameEndScreen.tsx   ← Winner reveal
```

## Security

- All actions validated **server-side** (phase, role, alive status)
- Chat rate limit: 10 messages / 5 seconds per player
- 30s reconnect grace period (session ID in localStorage)
- Room auto-deleted after 10 minutes of inactivity

## Deployment

- **Frontend** → [Vercel](https://vercel.com) (static site)
- **Backend** → [Railway](https://railway.app) or [Render](https://render.com) (persistent Node.js server needed for Socket.io)
- Set `VITE_SOCKET_URL=https://your-backend.railway.app` in Vercel env vars

## Environment Variables

See `.env.example` in the backend folder.
