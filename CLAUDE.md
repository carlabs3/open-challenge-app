# CLAUDE.md — Open Challenge ULHN × HAROPA Port

Contexto del proyecto para Claude Code. Lee también `PLAN.md` y `API.md`.

## Qué es esto

Sitio de inscripción y formación de equipos para el primer Open Challenge de la
Université Le Havre Normandie con HAROPA Port. Del 8 de octubre al 12 de
noviembre de 2026. Menos de 50 participantes previstos: investigadores y
doctorandos. Proyecto financiado por el Estado francés (France 2030,
ANR-23-EXES-0011), lo que implica exigencias de accesibilidad y de mención de
los financiadores.

## Arquitectura (decidida — opción B)

Un **único proyecto Next.js** (App Router, JavaScript, no TypeScript) desplegado
en **Vercel**. Las rutas de API viven dentro del mismo proyecto (`app/api/**`).
Sin servicio Express aparte, sin Railway. Base de datos **MongoDB Atlas**. Correos
con **Resend**. Consecuencias que no se negocian:

- La sesión va en una **cookie httpOnly del mismo dominio**, no en `localStorage`
  ni en cabecera `Authorization`. La pone y la lee el servidor (`lib/session.js`).
  `lib/api.js` hace llamadas relativas a `/api`; no hay `BASE` ni token en cliente.
- **Nada de AdminJS.** La administración se hará más adelante; por ahora los
  organizadores editan desde MongoDB Atlas.
- El recordatorio de 72 horas será un **cron de Vercel**, no un proceso permanente.
- `backend/` ya no existe: su contenido está en `reference/` como material de
  consulta. La única versión ejecutable de los modelos es `lib/models.js`.
  `reference/routes/requests.js` es la referencia del algoritmo atómico del paso 5.

Correo desde Resend (dirección autenticada de Three O'Clock / univ-lehavre).

## Reglas que no se negocian

1. **`open-challenge-ulhn-haropa.html` es la referencia de diseño.** No lo
   modifiques. Cuando dudes de cómo debe verse o comportarse algo, míralo ahí.
2. **Los estilos se copian, no se reescriben.** El bloque `<style>` va a un
   único `globals.css` sin cambios. No introduzcas Tailwind, CSS modules ni
   CSS-in-JS. Los componentes reutilizan las clases existentes (`.idea`,
   `.pill`, `.ch-media`, `.statement`…).
3. **Los textos están en francés y son deliberados.** No los reformules, no los
   traduzcas y no los "mejores". Cada mensaje de error, cada etiqueta y cada
   aviso está pensado. Si un texto nuevo hace falta, escríbelo en francés y
   señálalo para revisión.
4. **Una persona = un equipo = un desafío.** Se comprueba en el servidor, con la
   operación atómica descrita en `API.md`. Nunca solo en el frontend.
5. **`full` (descripción completa de una idea) no sale del servidor** salvo para
   miembros del equipo, organizadores y admin. Las ideas cerradas exponen solo
   el título.
6. **Ningún correo electrónico aparece en respuestas públicas.** Ni en la lista
   de participantes, ni en las tarjetas de idea, ni en las solicitudes.
7. **Nada se borra.** `archived: true` en lugar de borrar. Solo el rol `admin`
   puede eliminar de verdad.
8. **Las contraseñas se guardan con bcrypt.** Nunca en claro, ni en logs, ni en
   respuestas. Nadie puede consultar la contraseña de otra persona, solo
   resetearla.
9. **El consentimiento de visibilidad (`visible`) es explícito y separado.** Si
   está en `false`, esa persona no aparece en ninguna lista pública y no puede
   recibir invitaciones.
10. **La moderación es posterior a la publicación.** Una idea se publica al
    instante (`moderation: "publiee"`) y un organizador la revisa después. No
    introduzcas colas de aprobación previa.
11. **Un equipo tiene entre 3 y 5 personas. El máximo de 5 se valida en el
    servidor** (la maqueta lo aplica: `open-challenge-ulhn-haropa.html:889`, y la
    home lo anuncia como texto público « 3 à 5 personnes par équipe »). Una idea
    deja de aparecer como `ouverte` cuando llega a 5 miembros, aunque conserve
    perfiles buscados. El **mínimo de 3 NO se valida** al crear la idea: un equipo
    empieza con 1 persona; es la organización quien reagrupa los equipos de menos
    de 3 antes del 26 de octubre de 2026. El error 409 al aceptar con equipo lleno
    es el de `reference/routes/requests.js`: *« Cette équipe est complète
    (5 personnes maximum). »*

## Detalles de comportamiento fáciles de romper

- Los desafíos se ordenan por número de ideas **ascendente**. Es intencionado:
  empuja hacia los desafíos vacíos. No lo cambies a "los más populares primero".
- Los perfiles buscados y las disciplinas son **listas cerradas** de ocho
  valores. Nunca texto libre: el filtro dejaría de funcionar.
- El límite público es `title` 70 caracteres y `angle` 140, con contador visible.
  Valídalo también en el servidor.
- No hay límite de equipos por desafío.
- Los botones de unirse se muestran **desactivados con el motivo escrito** cuando
  la persona ya tiene equipo. No se ocultan: si desaparecen, el usuario no
  entiende por qué.
- El mensaje de login fallido es uno solo para dirección inexistente y
  contraseña incorrecta.
- El enlace de recuperación de contraseña vale 2 horas; la contraseña nueva se
  elige desde el correo, no desde la web.

## Estructura esperada

Proyecto único Next.js (App Router). Estructura objetivo:

```
/app
  layout.js        raíz (paso 4)
  globals.css      copia literal del <style> de la maqueta (paso 4)
  /(páginas)       pantallas portadas de la maqueta (paso 4)
  /api             route handlers — el "backend" vive aquí
    /auth          register, login, logout, forgot, reset
    /me
    /challenges, /participants, /ideas, /requests, /notifications, /admin
/lib
  db.js            conexión Mongoose cacheada (serverless)
  models.js        los cinco modelos — ÚNICA versión ejecutable
  session.js       cookie httpOnly: firmar / leer / borrar
  passwords.js     bcryptjs (hash + compare)
  http.js          helpers de respuesta { error } y manejo de errores
  api.js           único lugar donde el frontend llama a /api
/scripts
  seed-challenges.js   siembra los siete desafíos
/public
  /logos       ulhn.svg, haropa-port.svg, three-oclock.svg, france-2030.svg
  /images      hero.jpg, hp-01.jpg … hp-07.jpg
  /documents   HP-01-cahier-des-charges.pdf …
/reference       material de consulta, NO se ejecuta
  server.js, models.js, routes/requests.js   (el antiguo backend Express)
open-challenge-ulhn-haropa.html   referencia de diseño (no se toca)
```

Si los logos o las imágenes no existen todavía, el comportamiento correcto es
que el hueco desaparezca o se muestre la trama de color — nunca un icono roto.
La maqueta ya lo hace con `onerror`; mantenlo.

## Cómo trabajar

- Sigue el orden de pasos de `PLAN.md`. Cada paso debe quedar funcionando antes
  de empezar el siguiente.
- Todas las llamadas al backend pasan por `lib/api.js`. No metas `fetch` suelto
  en los componentes.
- Después de portar cada pantalla, compárala con la maqueta abierta al lado.
  Diferencias de espaciado o de color son errores, no interpretaciones.
- Los mensajes de commit en inglés, el contenido del sitio en francés, la
  documentación en español.
