'use client'

import React, { useState, useEffect } from 'react'
import { MainMenu } from '../components/MainMenu'
import { GameRoom } from '../components/GameRoom'
import { useSocket } from '../hooks/useSocket'

export default function Home() {
  const socket = useSocket()
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'game' | 'waiting'>('menu')
  const [roomId, setRoomId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [waitingMessage, setWaitingMessage] = useState<string>('')

  useEffect(() => {
    if (!socket) return

    // Initialize socket connection
    socket.emit('get', '/api/socket')

    // Socket event listeners
    socket.on('room-created', ({ room }) => {
      setRoomId(room.id)
      setCurrentScreen('game')
    })

    socket.on('game-start', () => {
      setCurrentScreen('game')
    })

    socket.on('waiting-for-match', () => {
      setWaitingMessage('Looking for an opponent...')
      setCurrentScreen('waiting')
    })

    socket.on('waiting-for-opponent', () => {
      setWaitingMessage('Waiting for opponent to join...')
      setCurrentScreen('waiting')
    })

    socket.on('error', ({ message }) => {
      alert(`Error: ${message}`)
      setCurrentScreen('menu')
    })

    return () => {
      socket.off('room-created')
      socket.off('game-start')
      socket.off('waiting-for-match')
      socket.off('waiting-for-opponent')
      socket.off('error')
    }
  }, [socket])

  const handleQuickMatch = (name: string) => {
    setPlayerName(name)
    if (socket) {
      socket.emit('quick-match', { playerName: name })
    }
  }

  const handleCreateRoom = (name: string) => {
    setPlayerName(name)
    if (socket) {
      socket.emit('create-room', { playerName: name })
    }
  }

  const handleJoinRoom = (name: string, roomCode: string) => {
    setPlayerName(name)
    setRoomId(roomCode)
    if (socket) {
      socket.emit('join-room', { roomId: roomCode, playerName: name })
      setCurrentScreen('game')
    }
  }

  const handleLeaveRoom = () => {
    setCurrentScreen('menu')
    setRoomId('')
    setPlayerName('')
    setWaitingMessage('')
  }

  if (currentScreen === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">{waitingMessage}</h2>
          <p className="text-slate-300 mb-6">Please wait while we set up your game...</p>
          <button
            onClick={handleLeaveRoom}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (currentScreen === 'game' && roomId) {
    return (
      <GameRoom 
        roomId={roomId} 
        playerName={playerName} 
        onLeaveRoom={handleLeaveRoom} 
      />
    )
  }

  return (
    <MainMenu
      onQuickMatch={handleQuickMatch}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
    />
  )
}
