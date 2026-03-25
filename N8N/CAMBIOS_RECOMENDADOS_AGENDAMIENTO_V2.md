# Cambios Recomendados para Agendamiento_v2.json

## Resumen
Actualizar el flow para:
1. ✅ Obtener próximas fechas disponibles Con información del doctor
2. ✅ Mostrar fechas al usuario (en lugar de pedir texto libre)
3. ✅ Usar `preferred_slot_duration` del doctor (no hardcodeado a 30 min)

---

## Endpoint Backend Nuevo

**URL**: `POST /api/whatsapp-flow/next-available-dates`

**Request**:
```json
{
  "empresa_id": 1,
  "doctor_id": 8
}
```

**Response**:
```json
{
  "success": true,
  "doctor": {
    "id": 8,
    "name": "Doctora María",
    "preferred_slot_duration": 30,
    "minimum_slot_duration": 15
  },
  "dates": [
    {
      "date": "2026-03-25",
      "display": "25/03 (Martes)",
      "hasSlots": true
    },
    {
      "date": "2026-03-26",
      "display": "26/03 (Miércoles)",
      "hasSlots": true
    }
  ],
  "message": "Próximas fechas disponibles"
}
```

---

## Cambios en el Flujo N8N

### 1. **Reemplazar la Solicitud Manual de Fecha**

**Ubicación**: Donde actualmente dice "Escribir fecha en formato DD/MM/YYYY"

**Cambio**:
- Llamar al endpoint `/next-available-dates` después de seleccionar doctor
- Mostrar opciones numeradas de fechas disponibles
- Usuario responde con el número (1-7)

**Nodo a Agregar**:
- HTTP Request → `/next-available-dates`
- Code Node → Construir mensaje con fechas numeradas
- Evolution API → Mostrar opciones

**Mensaje Ejemplo**:
```
¿Para cuál fecha querés agendar?

1️⃣ 25/03 (Martes)
2️⃣ 26/03 (Miércoles)
3️⃣ 27/03 (Jueves)
4️⃣ 28/03 (Viernes)
5️⃣ 29/03 (Sábado)
6️⃣ 30/03 (Domingo)
7️⃣ 31/03 (Lunes)

Respondé escribiendo el número.
```

---

### 2. **Usar preferred_slot_duration en Code Node**

**Ubicación**: `Code in JavaScript3` (línea ~185)

**Cambio Anterior**:
```javascript
const duracion = 30;  // ❌ Hardcodeado
```

**Cambio Nuevo**:
```javascript
// Obtener duración del doctor desde  $('Llamada_ProximasFechas').first().json.doctor.preferred_slot_duration
const duracion = $('HTTP_NextAvailableDates').first().json.doctor.preferred_slot_duration || 30;
```

---

### 3. **Procesar Respuesta de Selección de Fecha**

**Nodo necesario**: Code Node para procesar número (1-7)

**Lógica**:
```javascript
const opcion = parseInt(input, 10);
const fechas = $('HTTP_NextAvailableDates').first().json.dates;

if (isNaN(opcion) || opcion < 1 || opcion > fechas.length) {
  return [{ json: {
    valido: false,
    mensaje: `❌ Opción inválida. Respondé con un número del 1 al ${fechas.length}.`
  }}];
}

const fechaElegida = fechas[opcion - 1];

return [{
  json: {
    valido: true,
    fecha_selected: fechaElegida.date,  // YYYY-MM-DD
    fecha_display: fechaElegida.display  // DD/MM (Día)
  }
}];
```

---

## Flujo Actualizado (Secuencia)

1. **Usuario selecciona doctor** ✅ (ya existe)
2. ↓
3. **Llamar `/next-available-dates`** ← **NUEVO**
4. ↓
5. **Mostrar 7 próximas fechas con números** ← **CAMBIO**
6. ↓
7. **Usuario responde con número (1-7)** ← **CAMBIO**
8. ↓
9. **Procesar selección fecha** ← **NUEVO**
10. ↓
11. **Llamar `/available-times` con fecha elegida** ✅ (ya existe)
12. ↓
13. **Mostrar horarios disponibles** ✅ (ya existe)
14. ↓
15. **Usuario elige hora** ✅ (ya existe)
16. ↓
17. **Usar `preferred_slot_duration` para calcular fin** ← **CAMBIO**
18. ↓
19. **Crear cita** ✅ (ya existe)

---

## Ventajas de Este Cambio

✅ **No más errores de formato** - Usuario selecciona de opciones
✅ **Duración automática** - Se ajusta al doctor
✅ **UX mejorado** - Opciones claras y numeradas
✅ **Datos en tiempo real** - Muestra solo fechas con slots
✅ **Datos del doctor disponibles** - Para futuros usos (ej: mostrar duración mínima)

---

## Archivos a Modificar

- `N8N/Agendamiento_v2.json` - Actualizar flow principal

## Archivos Creados (Backend)

- ✅ Nuevo endpoint en `backend/app/routers/whatsapp_flow_api.py`
  - Clase `NextAvailableDateInfo`
  - Clase `NextAvailableDatesResponse`
  - Endpoint POST `/next-available-dates`

---

## Testing

1. Cambiar estado a "Inicio" en Redis
2. Agregar doctor en conversación WhatsApp
3. Enviar número de doctor
4. Verificar que se muestren 7 fechas con disponibilidad
5. Seleccionar una fecha (número 1-7)
6. Verificar que se calcule correctamente la duración del doctor

