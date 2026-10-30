'use client'

import React from 'react'
import { useDrag } from 'react-dnd'

interface ChessPieceProps {
  piece: string
  position: string
  onPieceClick?: (piece: string, position: string) => void
  isDraggable?: boolean
}

const pieceSymbols: { [key: string]: string } = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ 
  piece, 
  position, 
  onPieceClick, 
  isDraggable = true 
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'piece',
    item: { piece, from: position },
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const handleClick = () => {
    if (onPieceClick) {
      onPieceClick(piece, position)
    }
  }

  const pieceColor = piece[0] === 'w' ? 'text-gray-100' : 'text-gray-900'
  const symbol = pieceSymbols[piece] || ''

  return (
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
      onClick={handleClick}
      className={`
        text-4xl font-bold cursor-pointer select-none
        flex items-center justify-center
        transition-all duration-200
        ${pieceColor}
        ${isDragging ? 'opacity-50 scale-110' : 'hover:scale-110'}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
      `}
      style={{
        textShadow: piece[0] === 'w' 
          ? '1px 1px 2px rgba(0,0,0,0.8)' 
          : '1px 1px 2px rgba(255,255,255,0.8)'
      }}
    >
      {symbol}
    </div>
  )
}
