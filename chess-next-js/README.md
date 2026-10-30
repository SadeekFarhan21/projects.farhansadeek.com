# Chess Online - Multiplayer Chess Game

A real-time multiplayer chess game built with Next.js, Socket.io, and TypeScript. Play chess with friends or strangers around the world with a chess.com-inspired interface.

## Features

### 🎮 Game Modes
- **Quick Match**: Get matched with a random opponent instantly
- **Create Room**: Create a private room and share the code with friends
- **Join Room**: Join a friend's game using their room code
- **Spectator Mode**: Watch ongoing games

### ♟️ Chess Features
- Full chess rules implementation using chess.js
- Drag & drop piece movement
- Click-to-move alternative
- Move validation and legal move highlighting
- Check, checkmate, and stalemate detection
- Special moves: castling, en passant, pawn promotion
- Move history tracking
- Last move highlighting

### 🎨 UI/UX
- Chess.com-inspired design
- Beautiful chess board with piece symbols
- Real-time game state updates
- Player information panels
- Game status indicators
- Responsive design for all devices

### 🌐 Real-time Features
- WebSocket-based real-time communication
- Instant move synchronization
- Player connection/disconnection handling
- Room management system

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io
- **Chess Logic**: chess.js
- **Drag & Drop**: react-dnd
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SadeekFarhan21/chess-next-js.git
cd chess-next-js
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Deployment

### Render Deployment

1. Push your code to GitHub
2. Connect your repository to [Render](https://render.com)
3. Create a new Web Service with these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Auto-Deploy**: Yes

4. Add environment variables if needed:
   - `NODE_ENV=production`

The app will be automatically deployed and accessible via the Render URL.

### Other Deployment Options

- **Vercel**: Deploy with `vercel` CLI or GitHub integration
- **Railway**: Connect repository and deploy
- **Heroku**: Use the Heroku CLI or GitHub integration

## How to Play

1. **Choose Game Mode**:
   - Quick Match: Instant matchmaking
   - Create Room: Get a room code to share
   - Join Room: Enter a friend's room code

2. **Enter Your Name**: Choose a display name for the game

3. **Play Chess**: 
   - Drag pieces or click to move
   - Green highlights show valid moves
   - Yellow highlights show the last move
   - Red highlights indicate check

4. **Game Features**:
   - View move history
   - See opponent information
   - Watch the game timer
   - Use game controls (coming soon)

## Project Structure

```
src/
├── app/
│   ├── api/socket/          # Socket.io API route
│   └── page.tsx             # Main application component
├── components/
│   ├── ChessBoard.tsx       # Main chess board component
│   ├── ChessPiece.tsx       # Individual chess piece component
│   ├── ChessSquare.tsx      # Chess board square component
│   ├── GameRoom.tsx         # Game room interface
│   └── MainMenu.tsx         # Main menu and game mode selection
└── hooks/
    └── useSocket.ts         # Socket.io React hook
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## Future Enhancements

- [ ] Game timers and time controls
- [ ] Player ratings and statistics
- [ ] Chat system
- [ ] Game analysis and review
- [ ] Tournament system
- [ ] Themes and customization
- [ ] Mobile app
- [ ] Bot opponents

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Chess logic powered by [chess.js](https://github.com/jhlywa/chess.js)
- Drag and drop by [react-dnd](https://github.com/react-dnd/react-dnd)
- Icons by [Lucide](https://lucide.dev)
- Inspired by Chess.com's user interface
