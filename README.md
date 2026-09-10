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
npm run seed                          # siembra los 7 desafíos (una vez)
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

## Sembrar los datos de prueba

```bash
npm run seed          # idempotente: dos veces no duplica nada
npm run seed:reset    # vacía las colecciones y vuelve a sembrar
```

Inserta los siete desafíos `HP-01`…`HP-07`, los **12 participantes**, las **8
ideas** y la solicitud pendiente de la maqueta. Al final valida el invariante
«una persona = un equipo = un desafío» y falla si algo no cuadra.

> ⚠️ **Todos los participantes, ideas y solicitudes son ficticios y de prueba**
> (personas inventadas, contraseña única `challenge2026`). Sirven para testear el
> recorrido completo. **Hay que vaciarlos antes de abrir el challenge al público
> real** (`npm run seed:reset`, o borrar las colecciones desde Atlas). Cuenta de
> prueba para entrar: `camille.renaud@univ-lehavre.fr` / `challenge2026`.

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
