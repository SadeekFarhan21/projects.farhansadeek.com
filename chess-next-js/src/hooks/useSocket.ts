'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export const useSocket = () => {
  const socket = useRef<Socket | null>(null)

  useEffect(() => {
    if (!socket.current) {
      socket.current = io({
        path: '/api/socket',
        autoConnect: true
      })

      socket.current.on('connect', () => {
        console.log('Connected to server')
      })

      socket.current.on('disconnect', () => {
        console.log('Disconnected from server')
      })
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect()
        socket.current = null
      }
    }
  }, [])

  return socket.current
}
