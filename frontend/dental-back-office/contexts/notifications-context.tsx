'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { notificationsService, Notificacion, NotificacionesListResponse } from '@/services/notifications.service'

interface NotificationsContextType {
  notifications: Notificacion[]
  unreadCount: number
  loading: boolean
  error: string | null
  fetchNotifications: () => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: number) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notificacion[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await notificationsService.getNotifications()
      setNotifications(response.data)
      setUnreadCount(response.unread_count)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching notifications'
      setError(errorMessage)
      console.error('[Notifications] Error fetching:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(
    async (id: number) => {
      try {
        setLoading(true)
        setError(null)
        await notificationsService.markAsRead(id)

        // Update local state
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error marking notification as read'
        setError(errorMessage)
        console.error('[Notifications] Error marking as read:', err)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const markAllAsRead = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      await notificationsService.markAllAsRead()

      // Update local state
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
      setUnreadCount(0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error marking all as read'
      setError(errorMessage)
      console.error('[Notifications] Error marking all as read:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteNotification = useCallback(
    async (id: number) => {
      try {
        setLoading(true)
        setError(null)
        const wasUnread = notifications.find((n) => n.id === id)?.read === false

        await notificationsService.delete(id)

        // Update local state
        setNotifications((prev) => prev.filter((notif) => notif.id !== id))
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error deleting notification'
        setError(errorMessage)
        console.error('[Notifications] Error deleting:', err)
      } finally {
        setLoading(false)
      }
    },
    [notifications]
  )

  // Auto-fetch notifications on mount and set up polling
  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return context
}
