'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/contexts/notifications-context'
import { NotificationItem } from './notification-item'

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayNotifications = notifications.slice(0, 10)
  const hasMoreNotifications = notifications.length > 10

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await markAllAsRead()
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="Notificaciones"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Notificaciones {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="inline-block animate-spin">
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              </div>
            ) : displayNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay notificaciones</p>
              </div>
            ) : (
              <div className="px-4 py-3">
                {displayNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                    isLoading={loading}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {displayNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              {hasMoreNotifications && (
                <p className="text-xs text-gray-500 text-center mb-2">
                  Mostrando 10 de {notifications.length} notificaciones
                </p>
              )}
              <a
                href="/notificaciones"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 rounded hover:bg-blue-50 transition-colors"
              >
                Ver todas las notificaciones
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
