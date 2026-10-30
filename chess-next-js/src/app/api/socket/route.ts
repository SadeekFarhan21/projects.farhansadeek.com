import { Server as NetServer } from 'http'
import { Server as ServerIO } from 'socket.io'
import { Chess } from 'chess.js'

export const dynamic = 'force-dynamic'

interface GameRoom {
  id: string
  players: { id: string; color: 'white' | 'black'; name: string }[]
  game: Chess
  spectators: string[]
  createdAt: Date
  timeControl?: {
    initial: number // minutes
    increment: number // seconds
  }
}

interface SocketServer extends NetServer {
  io?: ServerIO
}

const rooms = new Map<string, GameRoom>()
const waitingQueue: { id: string; name: string }[] = []

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function createRoom(roomId: string, creator: { id: string; name: string }): GameRoom {
  const room: GameRoom = {
    id: roomId,
    players: [{ ...creator, color: 'white' }],
    game: new Chess(),
    spectators: [],
    createdAt: new Date(),
    timeControl: { initial: 10, increment: 0 }
  }
  rooms.set(roomId, room)
  return room
}

function serializeRoom(room: GameRoom) {
  return {
    id: room.id,
    players: room.players,
    spectators: room.spectators,
    createdAt: room.createdAt,
    timeControl: room.timeControl,
    fen: room.game.fen(),
    turn: room.game.turn()
  }
}

export async function GET() {
  try {
    const server = (global as unknown as { socketServer: SocketServer }).socketServer
    
    if (!server.io) {
      console.log('Initializing Socket.IO server...')
      const io = new ServerIO(server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      })

      io.on('connection', (socket) => {
        console.log('Client connected:', socket.id)

        // Join a room
        socket.on('join-room', ({ roomId, playerName }) => {
          const room = rooms.get(roomId)
          if (!room) {
            socket.emit('error', { message: 'Room not found' })
            return
          }

          if (room.players.length >= 2) {
            // Join as spectator
            room.spectators.push(socket.id)
            socket.join(roomId)
            socket.emit('joined-as-spectator', { room: serializeRoom(room) })
          } else {
            // Join as player
            const color = room.players.length === 0 ? 'white' : 'black'
            room.players.push({ id: socket.id, color, name: playerName })
            socket.join(roomId)
            
            if (room.players.length === 2) {
              // Game can start
              io.to(roomId).emit('game-start', { room: serializeRoom(room) })
            } else {
              socket.emit('waiting-for-opponent', { room: serializeRoom(room) })
            }
          }
        })

        // Create a room
        socket.on('create-room', ({ playerName }) => {
          const roomId = generateRoomId()
          const room = createRoom(roomId, { id: socket.id, name: playerName })
          socket.join(roomId)
          socket.emit('room-created', { room: serializeRoom(room) })
        })

        // Quick match
        socket.on('quick-match', ({ playerName }) => {
          if (waitingQueue.length > 0) {
            // Match with waiting player
            const opponent = waitingQueue.shift()!
            const roomId = generateRoomId()
            const room = createRoom(roomId, opponent)
            room.players.push({ id: socket.id, color: 'black', name: playerName })
            
            socket.join(roomId)
            io.sockets.sockets.get(opponent.id)?.join(roomId)
            
            io.to(roomId).emit('game-start', { room: serializeRoom(room) })
          } else {
            // Add to waiting queue
            waitingQueue.push({ id: socket.id, name: playerName })
            socket.emit('waiting-for-match')
          }
        })

        // Make a move
        socket.on('make-move', ({ roomId, move }) => {
          const room = rooms.get(roomId)
          if (!room) return

          const player = room.players.find(p => p.id === socket.id)
          if (!player) return

          // Check if it's player's turn
          const currentTurn = room.game.turn()
          if ((currentTurn === 'w' && player.color !== 'white') || 
              (currentTurn === 'b' && player.color !== 'black')) {
            return
          }

          try {
            const result = room.game.move(move)
            if (result) {
              // Broadcast move to all players in room
              io.to(roomId).emit('move-made', {
                move: result,
                fen: room.game.fen(),
                turn: room.game.turn(),
                isCheck: room.game.inCheck(),
                isCheckmate: room.game.isCheckmate(),
                isDraw: room.game.isDraw(),
                isStalemate: room.game.isStalemate()
              })
            }
          } catch (err) {
            socket.emit('invalid-move', { move })
          }
        })

        // Disconnect
        socket.on('disconnect', () => {
          console.log('Client disconnected:', socket.id)
          
          // Remove from waiting queue
          const queueIndex = waitingQueue.findIndex(p => p.id === socket.id)
          if (queueIndex > -1) {
            waitingQueue.splice(queueIndex, 1)
          }

          // Handle room cleanup
          for (const [roomId, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id)
            if (playerIndex > -1) {
              room.players.splice(playerIndex, 1)
              if (room.players.length === 0) {
                rooms.delete(roomId)
              } else {
                io.to(roomId).emit('player-disconnected', { room: serializeRoom(room) })
              }
              break
            }

            const spectatorIndex = room.spectators.findIndex(id => id === socket.id)
            if (spectatorIndex > -1) {
              room.spectators.splice(spectatorIndex, 1)
              break
            }
          }
        })
      })

      server.io = io
      ;(global as unknown as { socketServer: SocketServer }).socketServer = server
    }

    return new Response('Socket.IO server initialized', { status: 200 })
  } catch (err) {
    console.error('Socket.IO initialization error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
