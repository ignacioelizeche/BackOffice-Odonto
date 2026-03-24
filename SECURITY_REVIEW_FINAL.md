# Informe de Seguridad Técnica – BackOffice Odonto (Versión final)

Este informe sintetiza el análisis de seguridad realizado a partir de artefactos y configuraciones visibles en el repositorio, sin modificar código ni entornos. Se centra en la identificación de riesgos y en propuestas de mitigación priorizadas para el equipo técnico.

Autoridad y alcance
- Alcance: frontend en TypeScript (Next.js, una app identificada en el repositorio), backend en Python (FastAPI) y PostgreSQL. Infraestructura contenedora basada en Docker Compose.
- Datos sensibles: presentes (PII/datos personales y podría incluir información de pacientes). Cumplimiento relevante a considerar.
- Entrega: informe técnico con backlog de mitigaciones prioritizado.
- Lectura y observación: no se modifican código/configuración ni infra en esta fase.

Metodología de trabajo
- Modelos de amenaza: STRIDE/PASTA; defensa en profundidad; OWASP Top 10 como marco de referencia.
- Artefactos analizados: estructura de carpetas, archivos de configuración y documentación visible; artefactos de despliegue (docker-compose.yml); archivos .env y ejemplos de entorno; dependencias de frontend y backend.
- Entregables: inventario de activos, arquitectura/DFD, hallazgos con evidencias, backlog de mitigaciones, guías de configuración segura y plan de verificación.

Resumen ejecutivo de riesgos (alto nivel)

Inventario de activos (plantilla rellena con lo encontrado)
- Frontend App: dental-back-office (Next.js, TypeScript)
  - Dueño: Equipo Frontend
  - Descripción: aplicación Next.js de gestión dental; cliente para cita, pacientes, doctores, etc.
  - Datos manejados: datos de pacientes, citas, doctores, historiales clínicos (PII/PHI probable)
  - Sensibilidad: Alto
  - Artefactos relevantes: frontend/dental-back-office/package.json, tsconfig.json,/.env (no verificado en repo, ver .env.example)
- Backend: FastAPI API
  - Dueño: Equipo Backend
  - Descripción: API REST para gestión clínica, autenticación y notificaciones
  - Datos manejados: datos de pacientes, citas, historial, usuarios
  - Sensibilidad: Alto
  - Artefactos relevantes: backend/requirements.txt, backend/.env, backend/main.py (estructura general), migrations
- PostgreSQL (BD)
  - Dueño: DBA / Infra
  - Descripción: base de datos relacional con schemas para pacientes, citas, historial, usuarios
  - Datos manejados: PII/PHI
  - Sensibilidad: Alto
  - Artefactos relevantes: docker-compose.yml (db y volúmenes), esquemas en backend (migraciones)
- Entorno/CI-CD
  - Dueño: DevOps
  - Descripción: orquestación con Docker Compose para desarrollo; pipelines no analizados en esta fase
  - Artefactos relevantes: docker-compose.yml, .env.example, .env (en backend) 

Arquitectura y flujos de datos (DFD) – notas
- Flujo básico: Frontend -> Backend -> PostgreSQL
- Puntos de exposición: API pública/externa a través de rutas de backend; posibles servicios externos referenciados en env (p. ej. webhooks, notificaciones)
- Controles de red: CORS y límites de hosts definidos, posible uso de gateway/API manager no detectado en este alcance de lectura
- Diagrama de alto nivel: disponible en documentación del repositorio (no incluido en este informe por falta de fuente de imagen en lectura)

Hallazgos y evidencias (plantilla ya rellenada con evidencia observada)
- Hallazgo 1: Configuración sensible expuesta en repo
  - Área afectada: Seguridad de configuración
  - Impacto: Crítico
  - Probabilidad: Alta
  - Evidencia: SECRET_KEY y DATABASE_URL presentes en backend/.env. ALLOWED_ORIGINS=* y ALLOWED_HOSTS=* en backend/.env
  - Recomendaciones: eliminar secretos del control de versiones; usar gestor de secretos; rotar SECRET_KEY; limitar ALLOWED_ORIGINS/ALLOWED_HOSTS a entornos controlados; evitar usar DATABASE_URL con credenciales en texto claro. 
- Hallazgo 2: Entorno en producción con configuración de desarrollo
  - Área afectada: Configuración/operaciones
  - Impacto: Alto
  - Probabilidad: Media
  - Evidencia: ENVIRONMENT=development en backend/.env
  - Recomendaciones: establecer ENVIRONMENT=production en entornos productivos; usar variables de entorno seguras y/o servicios de configuración gestionados
- Hallazgo 3: Exposición de base de datos en docker-compose para desarrollo
  - Área afectada: Infraestructura/Red
  - Impacto: Alto
  - Probabilidad: Media
  - Evidencia: docker-compose.yml expone 5432:5432 para db
  - Recomendaciones: limitar acceso a DB en redes privadas; habilitar TLS; considerar usar un servicio de base de datos administrado o red privada para prod
- Hallazgo 4: Prácticas de manejo de secretos en desarrollo vs producción
  - Área afectada: Gestión de secretos
  - Impacto: Medio
  - Probabilidad: Media
  - Evidencia: presencia de SECRET_KEY y SMTP_PASSWORD en .env.example/.env en backend
  - Recomendaciones: migrar a Secrets Manager ( Vault, AWS Secrets Manager, etc. ); no almacenar secretos en archivos estáticos; rotaciones regulares
- Hallazgo 5: Dependencias y base de código sin escaneo de CVE en este informe
  - Área afectada: Seguridad de dependencias
  - Impacto: Medio
  - Probabilidad: Media
  - Evidencia: listas de dependencias en requirements.txt y package.json pero sin resultados de CVE en este informe
  - Recomendaciones: ejecutar escaneos de dependencias y bloquear versiones vulnerables; fijar hashes; firmar paquetes cuando aplique

Priorización de mitigaciones (backlog inicial)
ID, Área, Descripción, Prioridad, Dueño, Esfuerzo estimado (h), Dependencias, Estado, Evidencia/Notas

| ID  | Área                          | Descripción                                              | Prioridad | Dueño | Esfuerzo (h) | Dependencias | Estado  | Evidencia/Notas |
|-----|-------------------------------|----------------------------------------------------------|-----------|-------|--------------:|--------------|---------|-----------------|
| C01 | Configuración/Secretos        | Eliminar secretos en código; usar gestor de secretos; TLS obligatorio | Crítico   |       |              |              | Por hacer | SECRET_KEY, DATABASE_URL en backend/.env |
| C02 | CORS/Hosts                    | Restringir orígenes y hosts a entornos de confianza       | Alto      |       |              |              | Por hacer | ALLOWED_ORIGINS=*, ALLOWED_HOSTS=*  |
| C03 | Entorno                       | Establecer ENVIRONMENT=production en prod                 | Alto      |       |              |              | Por hacer | ENVIRONMENT=development en repo (producción) |
| C04 | Infraestructura/BD            | Retirar exposición de DB en prod; TLS; red privada         | Alto      |       |              |              | Por hacer | docker-compose expone 5432:5432 |
| C05 | Dependencias                  | Escanear CVEs y bloquear versiones vulnerables            | Medio     |       |              |              | Por hacer | Listado de requirements/paquetes sin CVE verificado |
| C06 | Gestión de secretos en CI/CD | Usar Secrets Manager, rotación de credenciales              | Medio     |       |              |              | Por hacer | Secretos en .env/example/… |
| C07 | Logs/Privacidad               | Evitar registrar datos sensibles en logs                   | Medio     |       |              |              | Por hacer | Revisión de logs pendiente |

Guía de configuración segura (alto nivel)
- Frontend (Next.js/TS):
  - Evitar almacenar datos sensibles en localStorage; usar cookies HttpOnly cuando aplique; reducir logs del cliente.
- Backend (FastAPI):
  - Asegurar TLS para todas las comunicaciones; usar hashing con sal para contraseñas; validar entradas; MFA si aplicable; token expirable y revocable.
- PostgreSQL: 
  - Roles con privilegios mínimos; políticas de acceso; auditoría; cifrado en reposo si disponible; backup seguro.
- Infraestructura: 
  - Usar imágenes actualizadas y no root; limitar capacidades de contenedores; TLS en tránsito; separar redes entre entorno prod y dev.

Plan de verificación post-mitigación (alto nivel)
- Verificación documental de evidencias tras mitigaciones.
- Verificación de configuración segura en artefactos leídos (archivos de entorno y Docker/compose).
- Verificación de que no se expongan datos sensibles en logs o en respuestas de API.
- Pruebas manuales de vectores de alto impacto (sin ejecutar código ni cambiar sistemas).

Anexos
- Glosario de términos de seguridad.
- Referencias: OWASP, guías de seguridad de FastAPI/Next.js, prácticas recomendadas de gestión de secretos.
- Diagrama/DFD disponible en la documentación del proyecto.

Riesgo residual y monitoreo
- Evaluación de riesgo residual tras mitigaciones (alto nivel).
- Indicadores de monitoreo recomendados: intentos de acceso no autorizado, exfiltración de datos, fallos de autenticación, cambios en configuración crítica.

Próximos pasos (para avanzar fuera de lectura)
- Generar inventario de activos y diagramas de flujo de datos en formato gráfico/MD.
- Completar el borrador del informe técnico y backlog con datos recopilados.
- Entregar el Markdown de borrador para revisión del equipo, seguido de un plan de verificación.

Notas finales
- Este informe se basa en artefactos visibles y en lectura; no se modifican código/configuración ni infraestructura a este paso.
- Si quieres, puedo actualizar este informe con evidencias específicas extraídas tras la lectura de artefactos y/o una auditoría de dependencias más detallada.

Cierre: ¿Quieres que integre este informe final en un PR o CSV/Markdown en el repositorio para revisión por el equipo?
