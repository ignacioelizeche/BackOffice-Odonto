'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check,
  Trash2,
  Filter,
  Search as SearchIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Bell,
} from 'lucide-react'
import { notificationsService, type NotificationType, type Notificacion } from '@/services/notifications.service'
import { useNotifications } from '@/contexts/notifications-context'

type FilterType = NotificationType | 'all'

export function NotificationsContent() {
  const { notifications: allNotifications, loading, markAsRead, deleteNotification } = useNotifications()
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const itemsPerPage = 10

  // Apply filters
  const filteredNotifications = allNotifications.filter((notif) => {
    // Search filter
    if (searchTerm && !notif.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !notif.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Type filter
    if (filterType !== 'all' && notif.type !== filterType) {
      return false
    }

    // Unread filter
    if (showOnlyUnread && notif.read) {
      return false
    }

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
  const startIdx = (page - 1) * itemsPerPage
  const paginatedNotifications = filteredNotifications.slice(startIdx, startIdx + itemsPerPage)

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, filterType, showOnlyUnread])

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id)
  }

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true)
      await deleteNotification(id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    // Mark all visible unread notifications as read
    for (const notif of filteredNotifications) {
      if (!notif.read) {
        await markAsRead(notif.id)
      }
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    return notificationsService.getIconForType(type)
  }

  const getNotificationBadgeColor = (type: NotificationType) => {
    const { bg, text } = {
      appointment_scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
      new_patient_assigned: { bg: 'bg-purple-100', text: 'text-purple-800' },
      appointment_reminder_30m: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      appointment_started: { bg: 'bg-green-100', text: 'text-green-800' },
      appointment_completed: { bg: 'bg-teal-100', text: 'text-teal-800' },
      appointment_cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
    }[type] || { bg: 'bg-gray-100', text: 'text-gray-800' }

    return { bg, text }
  }

  const getNotificationLabel = (type: NotificationType) => {
    const labels: Record<NotificationType, string> = {
      appointment_scheduled: 'Cita Agendada',
      new_patient_assigned: 'Nuevo Paciente',
      appointment_reminder_30m: 'Recordatorio',
      appointment_started: 'Cita Iniciada',
      appointment_completed: 'Cita Completada',
      appointment_cancelled: 'Cita Cancelada',
    }
    return labels[type]
  }

  const unreadCount = allNotifications.filter((n) => !n.read).length

  if (loading && allNotifications.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Todas las notificaciones</h2>
            <p className="text-sm text-muted-foreground">
              {filteredNotifications.length} notificación{filteredNotifications.length !== 1 ? 'es' : ''}{' '}
              {showOnlyUnread && `sin leer (${unreadCount} total)`}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            <Check className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar notificaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Type filter */}
        <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
          <SelectTrigger className="w-full sm:w-48" suppressHydrationWarning>
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="appointment_scheduled">Cita Agendada</SelectItem>
            <SelectItem value="new_patient_assigned">Nuevo Paciente</SelectItem>
            <SelectItem value="appointment_reminder_30m">Recordatorios</SelectItem>
            <SelectItem value="appointment_started">Cita Iniciada</SelectItem>
            <SelectItem value="appointment_completed">Cita Completada</SelectItem>
            <SelectItem value="appointment_cancelled">Cita Cancelada</SelectItem>
          </SelectContent>
        </Select>

        {/* Unread filter toggle */}
        <Button
          variant={showOnlyUnread ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowOnlyUnread(!showOnlyUnread)}
          className="w-full sm:w-auto"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Sin leer ({unreadCount})
        </Button>
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {paginatedNotifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 h-8 w-8 text-muted-foreground opacity-50" />
              <p className="text-center text-muted-foreground">
                {filteredNotifications.length === 0 && (searchTerm || filterType !== 'all' || showOnlyUnread)
                  ? 'No se encontraron notificaciones con los filtros seleccionados'
                  : 'No tienes notificaciones'}
              </p>
            </CardContent>
          </Card>
        ) : (
          paginatedNotifications.map((notif) => {
            const relativeTime = notificationsService.getRelativeTime(notif.created_at)
            const { bg, text } = getNotificationBadgeColor(notif.type)

            return (
              <Card
                key={notif.id}
                className={`transition-all ${!notif.read ? 'bg-primary/5 border-primary/20' : 'opacity-75'} hover:opacity-100`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{notif.title}</h3>
                            <Badge className={`${bg} ${text} border-0 text-xs`}>
                              {getNotificationLabel(notif.type)}
                            </Badge>
                            {!notif.read && <Badge className="bg-blue-500 text-white text-xs">Nuevo</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{notif.message}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notif.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notif.id)}
                              disabled={isDeleting}
                              title="Marcar como leído"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notif.id)}
                            disabled={isDeleting}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">{relativeTime.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
