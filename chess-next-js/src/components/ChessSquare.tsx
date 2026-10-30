'use client'

import React from 'react'
import { useDrop } from 'react-dnd'
import { ChessPiece } from './ChessPiece'

interface ChessSquareProps {
  position: string
  piece: string | null
  isLight: boolean
  isSelected?: boolean
  isValidMove?: boolean
  isInCheck?: boolean
  isLastMove?: boolean
  onSquareClick?: (position: string) => void
  onPieceDrop?: (from: string, to: string) => void
  isDraggable?: boolean
}

export const ChessSquare: React.FC<ChessSquareProps> = ({
  position,
  piece,
  isLight,
  isSelected = false,
  isValidMove = false,
  isInCheck = false,
  isLastMove = false,
  onSquareClick,
  onPieceDrop,
  isDraggable = true
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'piece',
    drop: (item: { piece: string; from: string }) => {
      if (onPieceDrop && item.from !== position) {
        onPieceDrop(item.from, position)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const handleClick = () => {
    if (onSquareClick) {
      onSquareClick(position)
    }
  }

  const getSquareColor = () => {
    if (isSelected) return 'bg-yellow-400'
    if (isInCheck) return 'bg-red-500'
    if (isLastMove) return 'bg-yellow-300'
    if (isValidMove) return 'bg-green-400'
    if (isOver && canDrop) return 'bg-blue-400'
    return isLight ? 'bg-amber-100' : 'bg-amber-800'
  }

  const file = position[0]
  const rank = position[1]

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      onClick={handleClick}
      className={`
        w-16 h-16 relative cursor-pointer
        flex items-center justify-center
        transition-colors duration-200
        ${getSquareColor()}
        ${isValidMove ? 'ring-2 ring-green-600' : ''}
      `}
    >
      {/* Square coordinates */}
      {rank === '1' && (
        <span className="absolute bottom-0 right-1 text-xs font-bold text-gray-600">
          {file}
        </span>
      )}
      {file === 'a' && (
        <span className="absolute top-1 left-1 text-xs font-bold text-gray-600">
          {rank}
        </span>
      )}

      {/* Valid move indicator */}
      {isValidMove && !piece && (
        <div className="w-6 h-6 bg-green-600 rounded-full opacity-70" />
      )}

      {/* Chess piece */}
      {piece && (
        <ChessPiece 
          piece={piece} 
          position={position} 
          isDraggable={isDraggable}
        />
      )}
    </div>
  )
}
