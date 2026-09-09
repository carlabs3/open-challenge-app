# Plan de implementación — Open Challenge ULHN × HAROPA

Este documento es para ti. `API.md` y `CLAUDE.md` son para Claude Code.

## Qué tienes hoy

`open-challenge-ulhn-haropa.html`: un archivo con el diseño y toda la lógica
en memoria. Funciona pero no guarda nada. Es la **referencia de diseño**: no lo
borres ni lo modifiques durante la migración, es tu punto de comparación.

## Decisión tomada (2026-09-09): opción B

Se descarta la opción A (dos servicios). Vamos con **un único proyecto Next.js**
(App Router, JavaScript, no TypeScript) en **Vercel**, con las rutas de API dentro
del mismo proyecto. Sin Railway. **MongoDB Atlas** para los datos, **Resend** para
el correo. Sesión en **cookie httpOnly del mismo dominio**. Recordatorio de 72 h
con **cron de Vercel**. Administración: por ahora a mano desde Atlas (nada de
AdminJS). El resto de este documento conserva el razonamiento original; donde diga
Railway / token / AdminJS, prevalece esta decisión.

## Qué vas a construir

Dos piezas (antes tres):

| Pieza | Dónde vive | Qué hace |
| --- | --- | --- |
| App Next.js (frontend + API) | Vercel | Las pantallas y las rutas `/api` en un solo proyecto |
| Base de datos | MongoDB Atlas | Los datos |

## La decisión que conviene tomar antes de escribir código

**Opción A — dos servicios (lo que dijiste).** React en Vercel + Express en
Railway. Dominios distintos, así que hay que configurar CORS y decidir cómo
viaja la sesión. Ventaja: puedes tener un proceso corriendo siempre para los
recordatorios automáticos.

**Opción B — un solo servicio.** Next.js en Vercel con las rutas de API dentro
del mismo proyecto. Mismo dominio, sin CORS, un solo despliegue, un solo juego
de variables. Los recordatorios se hacen con cron de Vercel.

Todo lo que hay en `API.md` sirve igual en las dos. Lo único que cambia es
dónde pones los archivos y la configuración de CORS.

Mi recomendación: **B**, salvo que quieras el proceso permanente.

> **Resuelto: se eligió B.** Ver « Decisión tomada » al principio del documento.

## Sesión: cómo sabe el servidor quién eres

Con dominios distintos (opción A) hay dos caminos:

1. **Cookie de sesión** — más segura, pero hay que ponerla con `sameSite: 'none'`
   y `secure: true`, y activar `credentials` en CORS a los dos lados. Es donde
   más gente se atasca.
2. **Token en la cabecera** — el servidor devuelve un token al entrar, el
   frontend lo guarda y lo manda en cada petición. Mucho más simple de montar.
   Contrapartida: si alguien lograra inyectar un script en tu web, podría leer
   ese token.

Para este proyecto recomiendo el **token**. No hay dinero ni datos sensibles en
juego: nombre, laboratorio, disciplina y una bio pública. El riesgo es bajo y te
ahorra el dolor de las cookies entre dominios. Si eliges la opción B, usa cookie
de sesión: al ser el mismo dominio, deja de ser complicado.

> **Resuelto: cookie httpOnly del mismo dominio.** Con la opción B no hay dos
> dominios, así que la cookie es la vía simple y más segura (el token nunca es
> legible desde JavaScript). La firma va con `JWT_SECRET` y la gestiona
> `lib/session.js`. `lib/api.js` no guarda ningún token.

## La regla que no puede romperse

**Una persona = un equipo = un desafío.** Esto no puede quedar solo en el
frontend, porque dos pestañas abiertas se saltan cualquier comprobación del
navegador. La forma correcta está explicada en `API.md`, en el endpoint de
aceptar solicitudes: primero se "reserva" a la persona con una operación atómica
condicionada a que no tenga equipo, y solo si eso funciona se la añade al equipo.
El orden importa.

## Los PDF de cada desafío

No los subas por la web. Son siete archivos fijos que no van a cambiar: ponlos
en la carpeta pública del frontend (`public/documents/HP-01-….pdf`) y ya está.
Montar subida de archivos para siete PDF es trabajo tirado — y en Railway el
disco se borra en cada despliegue, así que necesitarías además un servicio de
almacenamiento.

## La administración: no la programes

> **Resuelto: por ahora, a mano desde MongoDB Atlas.** Nada de AdminJS en esta
> fase. La interfaz de Atlas sirve para ver, editar, retirar y archivar registros;
> con menos de 50 participantes es suficiente. Una zona de administración propia
> se valorará más adelante, como paso separado.

(Contexto original, ya no vigente: se había propuesto **AdminJS** sobre los
modelos de Mongoose, unas veinte líneas, protegido con el rol `organisateur`.)

## Orden de trabajo

Hazlo en este orden. Cada paso deja algo que funciona.

1. **Base de datos y modelos** (medio día). Crea el cluster en Atlas, define los
   cinco modelos de `API.md` y un script que meta los siete desafíos.
2. **Autenticación** (medio día). Registro, login, olvido de contraseña. Prueba
   con Postman o `curl`, sin frontend todavía.
3. **Endpoints de lectura** (medio día). Desafíos, ideas, participantes.
4. **Portar el frontend a React** (uno o dos días). Ver el aviso de abajo.
5. **Endpoints de escritura** (un día). Proponer idea, editar, cerrar, pedir
   entrar, aceptar, rechazar, invitar.
6. **Correos** (medio día). Resend o el SMTP de Three O'Clock.
7. **Administración**: por ahora a mano desde MongoDB Atlas (sin código).
8. **Recordatorio a las 72 horas** (dos horas), con **cron de Vercel**.

Total realista: **una semana de trabajo**, no cinco días seguidos de código
limpio. Cuenta con despliegues que fallan y con la configuración del correo.

## Aviso sobre el paso 4

Es donde el diseño se degrada. La tentación es reescribir los estilos con
Tailwind o convertirlos a componentes mientras portas. No lo hagas en la misma
pasada.

Copia el bloque `<style>` entero a un único `globals.css` sin tocar una coma, y
haz los componentes usando las mismas clases (`.idea`, `.pill`, `.ch-media`…).
Cuando todo funcione y se vea idéntico, si quieres, reorganizas los estilos.
Dos cambios a la vez y no sabrás si lo que se rompió fue el diseño o la lógica.

## Variables de entorno

Un solo proyecto → un solo juego de variables. En local van en `.env.local`
(plantilla en `.env.local.example`); en Vercel, en los *Environment Variables* del
proyecto. No hay `FRONTEND_URL` ni `*_API_URL`: mismo dominio.

```
MONGODB_URI=          # cluster Atlas
JWT_SECRET=           # firma la cookie de sesión
APP_URL=              # base pública (local: http://localhost:3000). Enlace de reset.
RESEND_API_KEY=       # a partir del paso 6
MAIL_FROM="Open Challenge ULHN × HAROPA <open-challenge@…>"
MAIL_REPLY_TO=open-challenge@univ-lehavre.fr
```

## Lo que sigue pendiente y no es código

- La dirección de envío de correo autenticada (SPF, DKIM, DMARC). Pídela ya.
- Los logos oficiales en `public/logos/` y las fotos en `public/images/`.
- El contenido real de los siete desafíos.
- Si el podio de premios es único o por desafío.
