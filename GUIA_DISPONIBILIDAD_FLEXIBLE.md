# Guía: Configurar Disponibilidad Flexible de Doctores

## 🎯 Objetivo
Permitir que cada doctor tenga:
- Duraciones de turno personalizadas (10-15 minutos, 30 minutos, etc.)
- Disponibilidad específica por fecha (calendario mes a mes)
- Horarios personalizados por día

---

## 📋 Paso 1: Crear Doctor con 15 Minutos

**Ubicación**: Doctores → Crear Doctor

```
1. Rellena datos básicos (nombre, email, teléfono, etc.)
2. Desplázate a "Configuración de Turnos"
3. Duración Preferida: 15 minutos
4. Duración Mínima: 10 minutos
5. Guardar
```

**Resultado**: Este doctor ahora permite turnos de 10-15 minutos.

---

## 📅 Paso 2: Configurar Fechas Específicas

**Ubicación**: Perfil Doctor → "Disponibilidad Personalizada"

### Calendario Visual
Verás un calendario mensual con colores:
- 🟢 **Verde**: Trabaja (horario semanal normal)
- 🔵 **Azul**: Disponibilidad personalizada configurada
- ⚪ **Gris**: No disponible (configurado como no disponible)
- ⚫ **Blanco**: No trabaja (día no en horario semanal)

### Configurar Una Fecha

```
1. Haz clic en cualquier fecha futura del mes
2. Se abre un modal con opciones:

   DISPONIBILIDAD:
   - ✓ Disponible (permite reservas)
   - ✓ No disponible (bloquea reservas)

   SI ESTÁ DISPONIBLE, configura:
   - Hora inicio: 08:00 (ejemplo)
   - Hora fin: 12:00
   - Descanso inicio: (opcional)
   - Descanso fin: (opcional)
   - Notas: "Consultas solo por la mañana"

3. Guardar
```

### Ejemplos de Uso

**Ejemplo 1: Doctora que viene 3-4 veces al mes (miércoles específico)**
```
Marzo:
- 5 de marzo (disponible) 09:00-18:00
- 12 de marzo (disponible) 09:00-18:00
- 19 de marzo (disponible) 09:00-18:00
- 26 de marzo (no disponible)

Abril:
(Configuras diferentes fechas)
```

**Ejemplo 2: Horario especial para fecha específica**
```
15 de marzo: Disponible 08:00-12:00 (solo mañana)
- Hora inicio: 08:00
- Hora fin: 12:00
- Notas: "Solo consultas valoración esta mañana"
```

**Ejemplo 3: Vacaciones o congreso**
```
10-20 de marzo: No disponible
- Seleccionar: No disponible
- Notas: "Vacaciones"
```

---

## 🔗 Paso 3: Verificar en Booking

**Ubicación**: Crear Cita

```
1. Selecciona doctor → Sistema auto-sugiere 15 minutos
2. Selecciona fecha → Calendario respeta disponibilidad
   - Fechas bloqueadas = no disponibles
   - Fechas personalizadas = horario especial
3. Selecciona hora → Solo muestra horas válidas
4. Duración: Puedes elegir 10, 15, 20 min (según doctor)
5. Guardar
```

---

## 🔄 Cambiar Configuración

### Cambiar duración de doctor:
```
Perfil Doctor → "Configuración de Turnos"
→ Editar → Guardar
```

### Cambiar fecha específica:
```
Perfil Doctor → "Disponibilidad Personalizada"
→ Clic en fecha → Modificar → Guardar
```

### Ver historial de cambios:
Cada cambio se registra en:
- Backend: PostgreSQL `doctor_custom_availability` tabla
- N8N: Sincroniza automáticamente con Google Calendar (si está configurado)

---

## 🎨 Interfaz Visual

### DoctorDetailView (Perfil Doctor)

```
┌─────────────────────────────────────┐
│ Dr. Juan - Odontología General      │
│                                     │
│ [Configuración de Turnos]          │
│ ├─ Duración preferida: 15 min      │
│ ├─ Duración mínima: 10 min         │
│ └─ [Editar] [Guardar]              │
│                                     │
│ [Disponibilidad Personalizada]     │
│ ├─ Marzo 2026  ◄─────────────────► │
│ ├─ Do Lu Ma Mi Ju Vi Sa            │
│ ├─ 1 2 3 4 5 6 7                  │
│ ├─ [🟢] [🟢] [🟢] [🟢] ...        │
│ └─ (Clic en fecha para editar)     │
│                                     │
│ [Modal al hacer clic]              │
│                                     │
│ fecha: 15 marzo 2026 (miércoles)   │
│ [✓ Disponible] [○ No disponible]   │
│ Hora inicio: [08:00]                │
│ Hora fin: [12:00]                  │
│ Descanso (opt): [--:--] [--:--]    │
│ Notas: [________________]           │
│ [Guardar] [Cancelar]                │
└─────────────────────────────────────┘
```

---

## ⚙️ Backend Integration

### API Endpoints Usados

```
GET /doctores/:id/availability/custom?startDate=2026-03-01&endDate=2026-03-31
POST /doctores/:id/availability/custom
PUT /doctores/:id/availability/custom/:date
DELETE /doctores/:id/availability/custom/:date

PUT /doctores/:id/slot-duration
```

### Flujo de Datos

```
Frontend UI
    ↓
doctors.service.ts (API methods)
    ↓
Backend API
    ↓
PostgreSQL (doctor_custom_availability table)
    ↓
N8N Webhook (calendar sync, si está configurado)
    ↓
Google Calendar
```

---

## ✅ Checklist de Testing

- [ ] Crear doctor nuevo con 15-min preferida
- [ ] Verificar que aparece en formulario de cita
- [ ] Configurar fecha específica como "disponible 08:00-12:00"
- [ ] Crear cita → Verificar que respeta horario 08:00-12:00
- [ ] Cambiar fecha a "no disponible"
- [ ] Intentar crear cita → Fecha bloqueada
- [ ] Editar disponibilidad existente → Verificar que carga datos previos
- [ ] Verificar N8N calendar sync (si está configurado)

---

## 🚀 Próximas Mejoras (No Implementadas)

- Operaciones en lote (select múltiples fechas)
- Plantillas de configuración (guardar y reutilizar)
- Configuración de mes completo (aplicar a todos los días)
- Eliminar custom availability desde UI

---

## 📞 Soporte

**Problema**: No veo el calendario de disponibilidad
- Verifica que estés en el perfil de un doctor existente
- Recarga la página (F5)
- Verifica que el navegador no tenga errores (F12 → Console)

**Problema**: No puedo hacer clic en fechas
- Solo puedes editar fechas futuras
- El botón está deshabilitado para fechas pasadas

**Problema**: Los cambios no se guardan
- Verifica conexión a internet
- Revisa si hay notificación de error (toast superior)
- Intenta de nuevo

