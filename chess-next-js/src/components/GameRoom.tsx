'use client'

import React, { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard } from './ChessBoard'
import { useSocket } from '../hooks/useSocket'
import { Clock, Users, MessageCircle, RotateCcw } from 'lucide-react'

interface Player {
  id: string
  color: 'white' | 'black'
  name: string
}

interface GameRoom {
  id: string
  players: Player[]
  spectators: string[]
  createdAt: Date
  fen?: string
  turn?: string
}

interface GameRoomProps {
  roomId: string
  playerName: string
  onLeaveRoom: () => void
}

export const GameRoom: React.FC<GameRoomProps> = ({
  roomId,
  playerName,
  onLeaveRoom
}) => {
  const socket = useSocket()
  const [game, setGame] = useState<Chess>(new Chess())
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null)
  const [isPlayerTurn, setIsPlayerTurn] = useState(false)
  const [gameStatus, setGameStatus] = useState<string>('Waiting for game to start...')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])

  useEffect(() => {
    if (!socket) return

    // Join the room
    socket.emit('join-room', { roomId, playerName })

    // Socket event listeners
    socket.on('room-created', ({ room: newRoom }) => {
      setRoom(newRoom)
      setPlayerColor('white')
      setGameStatus('Waiting for opponent...')
      if (newRoom.fen) {
        setGame(new Chess(newRoom.fen))
      }
    })

    socket.on('waiting-for-opponent', ({ room: newRoom }) => {
      setRoom(newRoom)
      setPlayerColor('white')
      setGameStatus('Waiting for opponent...')
      if (newRoom.fen) {
        setGame(new Chess(newRoom.fen))
      }
    })

    socket.on('joined-as-spectator', ({ room: newRoom }) => {
      setRoom(newRoom)
      setPlayerColor(null)
      setGameStatus('Spectating game')
      if (newRoom.fen) {
        setGame(new Chess(newRoom.fen))
      }
    })

    socket.on('game-start', ({ room: newRoom }) => {
      setRoom(newRoom)
      const player = newRoom.players.find((p: Player) => p.id === socket.id)
      if (player) {
        setPlayerColor(player.color)
        setIsPlayerTurn(player.color === 'white')
        setGameStatus(player.color === 'white' ? 'Your turn' : "Opponent's turn")
      } else {
        setPlayerColor(null)
        setGameStatus('Spectating game')
      }
      if (newRoom.fen) {
        setGame(new Chess(newRoom.fen))
      }
    })

    socket.on('move-made', ({ move, fen, turn, isCheck, isCheckmate, isDraw, isStalemate }) => {
      const newGame = new Chess(fen)
      setGame(newGame)
      setLastMove({ from: move.from, to: move.to })
      
      // Update move history
      setMoveHistory(prev => [...prev, move.san])

      // Update game status
      if (isCheckmate) {
        setGameStatus(`Checkmate! ${turn === 'w' ? 'Black' : 'White'} wins!`)
        setIsPlayerTurn(false)
      } else if (isDraw || isStalemate) {
        setGameStatus('Game drawn!')
        setIsPlayerTurn(false)
      } else if (isCheck) {
        const nextPlayer = turn === 'w' ? 'White' : 'Black'
        setGameStatus(`${nextPlayer} is in check!`)
        setIsPlayerTurn(playerColor === (turn === 'w' ? 'white' : 'black'))
      } else {
        setIsPlayerTurn(playerColor === (turn === 'w' ? 'white' : 'black'))
        setGameStatus(playerColor === (turn === 'w' ? 'white' : 'black') ? 'Your turn' : "Opponent's turn")
      }
    })

    socket.on('player-disconnected', ({ room: updatedRoom }) => {
      setRoom(updatedRoom)
      setGameStatus('Opponent disconnected')
      if (updatedRoom.fen) {
        setGame(new Chess(updatedRoom.fen))
      }
    })

    socket.on('invalid-move', ({ move }) => {
      console.error('Invalid move:', move)
    })

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message)
      setGameStatus(`Error: ${message}`)
    })

    return () => {
      socket.off('room-created')
      socket.off('waiting-for-opponent')
      socket.off('joined-as-spectator')
      socket.off('game-start')
      socket.off('move-made')
      socket.off('player-disconnected')
      socket.off('invalid-move')
      socket.off('error')
    }
  }, [socket, roomId, playerName, playerColor])

  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    if (!socket || !isPlayerTurn) return
    
    socket.emit('make-move', { roomId, move })
  }

  const getOpponentName = (): string => {
    if (!room || !playerColor) return 'Unknown'
    const opponent = room.players.find(p => p.color !== playerColor)
    return opponent?.name || 'Unknown'
  }

  const getPlayerName = (): string => {
    if (!room || !playerColor) return playerName
    const player = room.players.find(p => p.color === playerColor)
    return player?.name || playerName
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <h1 className="text-3xl font-bold">Chess Game</h1>
            <p className="text-slate-300">Room: {roomId}</p>
          </div>
          <button
            onClick={onLeaveRoom}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Leave Room
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Player Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Opponent Info */}
            <div className="bg-slate-800 rounded-lg p-4 text-white">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-4 h-4 rounded-full ${playerColor === 'white' ? 'bg-gray-900' : 'bg-gray-100'}`}></div>
                <span className="font-semibold">{getOpponentName()}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <Clock size={16} />
                <span>10:00</span>
              </div>
            </div>

            {/* Game Status */}
            <div className="bg-slate-800 rounded-lg p-4 text-white">
              <h3 className="font-semibold mb-2">Game Status</h3>
              <p className="text-slate-300">{gameStatus}</p>
            </div>

            {/* Room Info */}
            <div className="bg-slate-800 rounded-lg p-4 text-white">
              <h3 className="font-semibold mb-2">Room Info</h3>
              <div className="flex items-center space-x-2 text-slate-300">
                <Users size={16} />
                <span>{room ? room.players.length : 0}/2 Players</span>
              </div>
              {room && room.spectators.length > 0 && (
                <div className="flex items-center space-x-2 text-slate-300 mt-1">
                  <MessageCircle size={16} />
                  <span>{room.spectators.length} Spectators</span>
                </div>
              )}
            </div>
          </div>

          {/* Center Panel - Chess Board */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="flex flex-col items-center space-y-4">
              {playerColor && (
                <ChessBoard
                  game={game}
                  playerColor={playerColor}
                  onMove={handleMove}
                  isPlayerTurn={isPlayerTurn}
                  lastMove={lastMove || undefined}
                />
              )}
              {!playerColor && (
                <div className="w-96 h-96 bg-slate-700 rounded-lg flex items-center justify-center text-white">
                  <div className="text-center">
                    <MessageCircle size={48} className="mx-auto mb-4 text-slate-400" />
                    <p>Spectating Mode</p>
                    <p className="text-slate-400 text-sm">You are watching this game</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Move History & Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Player Info */}
            <div className="bg-slate-800 rounded-lg p-4 text-white">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-4 h-4 rounded-full ${playerColor === 'white' ? 'bg-gray-100' : 'bg-gray-900'}`}></div>
                <span className="font-semibold">{getPlayerName()}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <Clock size={16} />
                <span>10:00</span>
              </div>
            </div>

            {/* Move History */}
            <div className="bg-slate-800 rounded-lg p-4 text-white">
              <h3 className="font-semibold mb-3">Move History</h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {moveHistory.length === 0 ? (
                  <p className="text-slate-400 text-sm">No moves yet</p>
                ) : (
                  moveHistory.map((move, index) => (
                    <div key={index} className="flex">
                      <span className="text-slate-400 w-8 text-sm">{Math.floor(index / 2) + 1}.</span>
                      <span className="text-sm">{move}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Game Controls */}
            <div className="bg-slate-800 rounded-lg p-4 text-white">
              <h3 className="font-semibold mb-3">Controls</h3>
              <div className="space-y-2">
                <button 
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors flex items-center justify-center space-x-2"
                  disabled
                >
                  <RotateCcw size={16} />
                  <span>Offer Draw</span>
                </button>
                <button 
                  className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  disabled
                >
                  Resign
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
