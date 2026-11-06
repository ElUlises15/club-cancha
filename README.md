# Club Cancha — Cancha Norte

Webapp de reservas de fútbol 5 para un club **ficticio**. Interfaz en español rioplatense, fotos generadas y precios demo. Backend Node + SQLite sin dependencias externas. Frontend estático compatible con GitHub Pages y subdirectorios.

## Ejecutar

Requiere Node 22.13 o posterior (verificado con Node 24.22.1).

```bash
npm start
```

Abrí http://localhost:3850. No hace falta instalar paquetes. `node:sqlite` puede emitir un aviso experimental según la versión de Node.

```bash
PORT=3850 ADMIN_KEY=una-clave-propia DB_PATH=data/cancha.sqlite npm start
npm test
```

- `PORT`: 3850 por defecto, escucha en `0.0.0.0`.
- `DB_PATH`: `data/cancha.sqlite`, creado automáticamente; su carpeta debe existir si se cambia.
- `ADMIN_KEY`: `cancha-demo` por defecto. Para una instalación compartida configurá una clave propia.

## Uso

1. Elegí día (hoy a 90 días), cancha y horario disponible.
2. Ingresá nombre y teléfono. La confirmación muestra número, fecha, horario y precio.
3. Abrí **Administración** en el pie, ingresá la clave y consultá las reservas.
4. Cada cancelación pide un segundo clic en **¿Confirmás?** y vuelve a liberar el horario.

Dos canchas descubiertas; turnos de 60 minutos entre 15 y 23 h. Cancha 1: $28.000/h; cancha 2: $26.000/h. Son valores ficticios de demostración, definidos en `server.js` y en el fallback de `public/app.js`. No hay cobros ni envío de mensajes. Se permiten turnos de todo el día seleccionado, sin corte por hora actual. No hay reservas precargadas.

## Pages / modo estático

El directorio `public/` es el sitio completo y se puede servir con cualquier servidor estático. El workflow `.github/workflows/pages.yml` publica ese directorio **sólo al ejecutarlo manualmente** desde Actions, después de configurar Pages con GitHub Actions. No se ejecutó publicación ni git push.

Sin API disponible, aparece un aviso visible de **Modo demo local**. Las reservas quedan en `localStorage` de ese navegador y no se sincronizan con otros usuarios ni con SQLite. La administración local usa `cancha-demo`. Para reiniciar esa demo eliminá la clave `cancha-bookings` del almacenamiento del sitio. Si el backend falla durante una confirmación, se informa el error: no se convierte silenciosamente esa reserva en local.

## API

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/availability?date=YYYY-MM-DD` | Canchas, precios, horas y ocupación sin datos personales |
| POST | `/api/bookings` | JSON: `name`, `phone`, `court` (1/2), `date`, `hour` (15–23) |
| GET | `/api/admin/bookings` | Reservas con datos; requiere encabezado `x-admin-key` |
| DELETE | `/api/admin/bookings/:id` | Cancelar; requiere encabezado `x-admin-key` |

La restricción SQLite `UNIQUE(court,date,hour)` evita dobles reservas, incluso ante solicitudes simultáneas. Devuelve 409 si el turno está ocupado; 400 para datos inválidos; 401 para clave incorrecta. La fecha de referencia del servidor usa Buenos Aires. Los datos persisten en SQLite y no se versionan. Para producción harían falta HTTPS, control de abuso, sesiones y una política de tratamiento de datos; esta entrega es una demo.

## Diseño y assets

Se leyeron `frontend-design` y `anti-generico`; decisiones y referencias en `spec.md`. `public/assets/` incluye cinco PNG generados con la herramienta integrada imagegen: `hero-cancha.png`, `nocturna.png`, `vestuarios.png`, `quincho.png`, `pelota.png`. Son representaciones del club ficticio. Los prompts completos están en `image-prompts.md`. Fuentes Anton y DM Sans vía Google Fonts, con alternativas del sistema.

Noindex: meta robots en HTML, `robots.txt` y encabezado `X-Robots-Tag` del servidor. El noindex no sustituye autenticación. Layout responsive, navegación por teclado, estados de carga/error, diálogos y respeto de reduced-motion.

## Verificación

`npm test` inicia un servidor aislado en 3851 con base temporal: validación, reserva, conflicto, persistencia tras reinicio, autorización, cancelación y liberación del turno. Se probó además el recorrido real con Playwright a 1280 y 390 px: reserva, confirmación, cancelación, fallback estático y persistencia local. Capturas locales en `test-results/` (no versionadas). Sin errores JS ni desborde horizontal móvil.
