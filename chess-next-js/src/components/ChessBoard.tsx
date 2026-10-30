'use client'

import React, { useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Chess, Square } from 'chess.js'
import { ChessSquare } from './ChessSquare'

interface ChessBoardProps {
  game: Chess
  playerColor: 'white' | 'black'
  onMove?: (move: { from: string; to: string; promotion?: string }) => void
  isPlayerTurn: boolean
  lastMove?: { from: string; to: string }
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  game,
  playerColor,
  onMove,
  isPlayerTurn,
  lastMove
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [validMoves, setValidMoves] = useState<string[]>([])

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = playerColor === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8']

  const board = game.board()

  const getSquarePosition = (file: string, rank: string): string => {
    return file + rank
  }

  const isSquareLight = (file: string, rank: string): boolean => {
    const fileIndex = files.indexOf(file)
    const rankIndex = parseInt(rank)
    return (fileIndex + rankIndex) % 2 === 0
  }

  const handleSquareClick = (position: string) => {
    if (!isPlayerTurn) return

    const piece = game.get(position as Square)
    
    if (selectedSquare) {
      if (selectedSquare === position) {
        // Deselect
        setSelectedSquare(null)
        setValidMoves([])
      } else if (validMoves.includes(position)) {
        // Make move
        makeMove(selectedSquare, position)
        setSelectedSquare(null)
        setValidMoves([])
      } else if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
        // Select new piece
        selectSquare(position)
      } else {
        // Invalid move, deselect
        setSelectedSquare(null)
        setValidMoves([])
      }
    } else {
      if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
        selectSquare(position)
      }
    }
  }

  const selectSquare = (position: string) => {
    setSelectedSquare(position)
    const moves = game.moves({ square: position as Square, verbose: true })
    setValidMoves(moves.map(move => move.to))
  }

  const makeMove = (from: string, to: string) => {
    try {
      // Check for pawn promotion
      const piece = game.get(from as Square)
      const isPromotion = piece?.type === 'p' && 
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))

      const move = {
        from,
        to,
        promotion: isPromotion ? 'q' : undefined // Auto-promote to queen for now
      }

      if (onMove) {
        onMove(move)
      }
    } catch (error) {
      console.error('Invalid move:', error)
    }
  }

  const handlePieceDrop = (from: string, to: string) => {
    if (!isPlayerTurn) return
    if (selectedSquare) {
      setSelectedSquare(null)
      setValidMoves([])
    }
    makeMove(from, to)
  }

  const getPieceAtSquare = (file: string, rank: string): string | null => {
    const fileIndex = files.indexOf(file)
    const rankIndex = 8 - parseInt(rank)
    const piece = board[rankIndex]?.[fileIndex]
    
    if (!piece) return null
    
    const color = piece.color === 'w' ? 'w' : 'b'
    const type = piece.type.toUpperCase()
    return color + type
  }

  const isInCheck = (position: string): boolean => {
    const piece = game.get(position as Square)
    return piece?.type === 'k' && game.inCheck()
  }

  const isLastMoveSquare = (position: string): boolean => {
    return lastMove && (lastMove.from === position || lastMove.to === position) || false
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="inline-block border-4 border-amber-900 bg-amber-900 rounded-lg shadow-2xl">
        <div className="grid grid-cols-8 gap-0">
          {ranks.map((rank) =>
            files.map((file) => {
              const position = getSquarePosition(file, rank)
              const piece = getPieceAtSquare(file, rank)
              const isLight = isSquareLight(file, rank)
              const isSelected = selectedSquare === position
              const isValidMove = validMoves.includes(position)
              const isCheck = !!(piece && isInCheck(position))
              const isLastMove = isLastMoveSquare(position)

              return (
                <ChessSquare
                  key={position}
                  position={position}
                  piece={piece}
                  isLight={isLight}
                  isSelected={isSelected}
                  isValidMove={isValidMove}
                  isInCheck={isCheck}
                  isLastMove={isLastMove}
                  onSquareClick={handleSquareClick}
                  onPieceDrop={handlePieceDrop}
                  isDraggable={isPlayerTurn}
                />
              )
            })
          )}
        </div>
      </div>
    </DndProvider>
  )
}
