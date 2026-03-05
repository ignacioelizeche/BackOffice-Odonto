'use client'

import React, { useState, useEffect } from 'react'
import { Notificacion } from '@/services/notifications.service'
import { notificationsService } from '@/services/notifications.service'
import { X } from 'lucide-react'

interface NotificationItemProps {
  notification: Notificacion
  onMarkAsRead: (id: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
  isLoading?: boolean
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  isLoading,
}) => {
  const [relativeTime, setRelativeTime] = useState(
    notificationsService.getRelativeTime(notification.created_at)
  )
  const icon = notificationsService.getIconForType(notification.type)
  const colorClass = notificationsService.getColorForType(notification.type)
  const textColorClass = notificationsService.getTextColorForType(notification.type)

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(notificationsService.getRelativeTime(notification.created_at))
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [notification.created_at])

  const handleNotificationClick = async (e: React.MouseEvent) => {
    // If clicking on the delete button, don't mark as read
    if ((e.target as HTMLElement).closest('[data-action="delete"]')) {
      return
    }

    // Mark as read when clicking anywhere on the notification
    if (!notification.read && !isLoading) {
      await onMarkAsRead(notification.id)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLoading) {
      await onDelete(notification.id)
    }
  }

  return (
    <div
      className={`border-l-4 px-4 py-3 mb-2 rounded-r-lg cursor-pointer transition-all ${colorClass} ${
        !notification.read ? 'opacity-100' : 'opacity-75'
      } hover:opacity-100 hover:shadow-sm`}
      onClick={handleNotificationClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icon}</span>
            <h4 className={`font-semibold text-sm ${textColorClass} truncate`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="inline-flex w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
            )}
          </div>
          <p className={`text-sm ${textColorClass} opacity-80 line-clamp-2`}>
            {notification.message}
          </p>
          <p className={`text-xs ${textColorClass} opacity-60 mt-1`}>
            {relativeTime.label}
          </p>
        </div>

        <button
          onClick={handleDelete}
          disabled={isLoading}
          data-action="delete"
          className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors flex-shrink-0"
          title="Eliminar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
