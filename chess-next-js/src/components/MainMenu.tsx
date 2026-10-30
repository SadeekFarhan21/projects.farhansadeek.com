'use client'

import React, { useState } from 'react'
import { Zap, Users, UserPlus, Gamepad2 } from 'lucide-react'

interface MainMenuProps {
  onQuickMatch: (playerName: string) => void
  onCreateRoom: (playerName: string) => void
  onJoinRoom: (playerName: string, roomId: string) => void
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onQuickMatch,
  onCreateRoom,
  onJoinRoom
}) => {
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [gameMode, setGameMode] = useState<'quick' | 'create' | 'join' | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    switch (gameMode) {
      case 'quick':
        onQuickMatch(playerName.trim())
        break
      case 'create':
        onCreateRoom(playerName.trim())
        break
      case 'join':
        if (roomId.trim()) {
          onJoinRoom(playerName.trim(), roomId.trim().toUpperCase())
        }
        break
    }
  }

  const startGame = (mode: 'quick' | 'create' | 'join') => {
    setGameMode(mode)
    setShowNameInput(true)
  }

  const goBack = () => {
    setShowNameInput(false)
    setGameMode(null)
    setRoomId('')
  }

  if (showNameInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Gamepad2 size={64} className="mx-auto mb-4 text-blue-400" />
            <h1 className="text-3xl font-bold text-white mb-2">Chess Online</h1>
            <p className="text-slate-300">
              {gameMode === 'quick' && 'Quick Match'}
              {gameMode === 'create' && 'Create Room'}
              {gameMode === 'join' && 'Join Room'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
                required
                autoFocus
              />
            </div>

            {gameMode === 'join' && (
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-slate-300 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter room code"
                  required
                />
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={goBack}
                className="flex-1 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {gameMode === 'quick' && 'Find Match'}
                {gameMode === 'create' && 'Create Room'}
                {gameMode === 'join' && 'Join Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Gamepad2 size={64} className="mx-auto mb-4 text-blue-400" />
          <h1 className="text-4xl font-bold text-white mb-2">Chess Online</h1>
          <p className="text-slate-300">Play chess with friends or strangers around the world</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => startGame('quick')}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Zap size={24} />
            <span className="text-lg font-semibold">Quick Match</span>
          </button>

          <button
            onClick={() => startGame('create')}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <UserPlus size={24} />
            <span className="text-lg font-semibold">Create Room</span>
          </button>

          <button
            onClick={() => startGame('join')}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Users size={24} />
            <span className="text-lg font-semibold">Join Room</span>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            Choose your preferred way to play
          </p>
        </div>
      </div>
    </div>
  )
}
