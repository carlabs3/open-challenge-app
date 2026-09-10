# Open Challenge ULHN × HAROPA Port

Sitio de inscripción y formación de equipos para el primer Open Challenge de la
Université Le Havre Normandie con HAROPA Port (8 de octubre → 12 de noviembre de
2026). Menos de 50 participantes: investigadores y doctorandos. La regla central
es **una persona = un equipo = un desafío**, validada en el servidor.

## Stack

Un único proyecto **Next.js** (App Router, JavaScript) desplegado en **Vercel**,
con las rutas de API dentro del mismo proyecto. Base de datos **MongoDB Atlas**.
Sesión en cookie httpOnly del mismo dominio. Correo con Resend (a partir del paso
6). No hay backend Express aparte.

`open-challenge-ulhn-haropa.html` es la **referencia de diseño**: no se modifica.
`app/globals.css` es una copia literal de su bloque `<style>`.

## Arrancar en local

Requiere Node 18+.

```bash
npm install
cp .env.local.example .env.local     # y rellena las variables (abajo)
npm run seed:challenges               # los 7 desafíos
npm run dev                           # http://localhost:3000
```

## Variables de entorno

Van en `.env.local` (no se versiona). En Vercel, en *Settings → Environment
Variables*.

| Variable | Para qué | Ejemplo |
| --- | --- | --- |
| `MONGODB_URI` | Conexión a MongoDB Atlas (incluye el nombre de la base) | `mongodb+srv://user:pass@cluster.xxx.mongodb.net/open-challenge?retryWrites=true&w=majority` |
| `JWT_SECRET` | Firma la cookie de sesión | cadena larga aleatoria |
| `APP_URL` | Base pública, para el enlace de recuperación de contraseña | local: `http://localhost:3000` · prod: la URL de Vercel |

Genera un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Las variables de correo (`RESEND_API_KEY`, `MAIL_FROM`…) se añaden en el paso 6.

## Sembrar y vaciar (tres comandos, todos idempotentes)

```bash
npm run seed:challenges   # solo los 7 desafíos HP-01…HP-07 (esos SÍ van en la web)
npm run seed:demo         # + 12 participantes, 8 ideas y 1 solicitud, TODO FICTICIO
npm run seed:clear        # vacía participantes, ideas, solicitudes y notificaciones
                          # (NO los desafíos). Pide retapear el nombre de la base.
```

`seed:demo` valida al final el invariante «una persona = un equipo = un desafío» y
falla si algo no cuadra. `seed:clear` es **destructivo** y apunta a la base que
tengas en `MONGODB_URI` (¡producción si es la de Atlas!): por eso exige teclear el
nombre exacto de la base antes de borrar. Borra las cuatro colecciones enteras
(participantes, ideas, solicitudes, notificaciones), así que **no quedan
referencias colgando** a participantes eliminados; los desafíos se conservan.

> ⚠️ **Los participantes, ideas y solicitudes de `seed:demo` son ficticios**
> (contraseña única `challenge2026`). **Vaciarlos con `npm run seed:clear` antes
> de abrir el challenge al público real.** Cuenta de prueba: `camille.renaud@univ-lehavre.fr`
> / `challenge2026`.

## Probar la autenticación

Con el servidor arrancado (`npm run dev`):

```bash
bash test-auth.sh                     # por defecto http://localhost:3000
```

Comprueba el contrato de `API.md`: registro, login, cookie httpOnly, logout,
homónimo, olvido de contraseña y que no se filtran datos sensibles. Debe salir
`Correctos: 22   Fallos: 0`. El reset con token real se prueba a mano siguiendo
las instrucciones que imprime el propio script.

## En qué paso estamos

Orden de trabajo en `PLAN.md`. Hechos:

1. ✅ Modelos y seed (desafíos + datos de prueba de la maqueta)
2. ✅ Autenticación (cookie de sesión)
3. ✅ Endpoints de lectura (desafíos, detalle, participantes)
4. ✅ Frontend completo: home, defis, detalle, participants, participer, mon-espace
5. ✅ Endpoints de escritura (proponer, editar, cerrar, pedir, aceptar, rechazar, invitar)
6. ⬜ Correos (Resend) — por ahora las acciones crean las notificaciones en base
   y dejan un `TODO` donde iría el envío
7. ⬜ Administración (por ahora, a mano desde MongoDB Atlas)
8. ⬜ Recordatorio de 72 h (cron de Vercel)

## Documentación

- `CLAUDE.md` — reglas del proyecto (no negociables).
- `PLAN.md` — plan e historial de decisiones de arquitectura.
- `API.md` — modelos de datos y contrato de la API.
- `reference/` — el antiguo backend Express, solo como consulta (no se ejecuta).
