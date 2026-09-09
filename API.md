# API — Open Challenge ULHN × HAROPA

Contrato entre el frontend y el backend. Los nombres de campo son los que ya usa
la maqueta (`open-challenge-ulhn-haropa.html`), para que portar sea sustituir los
arrays en memoria por llamadas `fetch` sin renombrar nada.

Base: `/api`. Todo JSON. Errores: `{ "error": "mensaje para el usuario" }` con el
código HTTP correspondiente. Los mensajes de error se muestran tal cual en la
interfaz, así que van en francés.

## Modelos (Mongoose)

### Participant
```js
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },   // bcrypt, nunca se devuelve
  lab: { type: String, required: true, enum: LABS },
  disc: [{ type: String, enum: DISCIPLINES }],      // al menos 1
  bio: { type: String, maxlength: 220, default: "" },
  li: { type: String, default: "" },                // LinkedIn
  visible: { type: Boolean, default: false },       // consentimiento RGPD explícito
  ideaId: { type: ObjectId, ref: "Idea", default: null },  // null = sin equipo
  role: { type: String, enum: ["participant","organisateur","admin"], default: "participant" },
  emailVerified: { type: Boolean, default: false },
  nameKey: { type: String, index: true }            // nombre normalizado, para detectar homónimos
}
```

`nameKey` se calcula en un hook `pre('save')`: minúsculas, sin acentos, sin
espacios ni guiones. Sirve **solo para avisar**, nunca para bloquear.

### Challenge
```js
{
  ref: { type: String, required: true, unique: true },   // "HP-01"
  title, desc, owner, referent,                           // String
  theme: { type: String, enum: THEMES },
  pdf: String,          // nombre del archivo en public/documents/
  image: String,        // nombre del archivo en public/images/
  open: { type: Boolean, default: true }
}
```

### Idea
```js
{
  challenge: { type: ObjectId, ref: "Challenge", required: true },
  title: { type: String, required: true, maxlength: 70 },
  angle: { type: String, required: true, maxlength: 140 },   // público
  full: { type: String, default: "" },                        // privado
  has: [String],                                              // disciplinas presentes
  want: [String],                                             // perfiles buscados
  coord: { type: ObjectId, ref: "Participant", required: true },
  membres: [{ type: ObjectId, ref: "Participant" }],
  status: { type: String, enum: ["ouverte","fermee"], default: "ouverte" },
  moderation: { type: String, enum: ["publiee","validee","retiree"], default: "publiee" },
  motifRetrait: String,
  archived: { type: Boolean, default: false },
  confirmed: { type: Boolean, default: false }   // el coordinador validó su correo
}
```

**`full` no se envía nunca** a quien no sea miembro, organizador o admin.
Fíltralo en el servidor, no en el frontend.

### JoinRequest
```js
{
  idea: { type: ObjectId, ref: "Idea", required: true },
  from: { type: ObjectId, ref: "Participant", required: true },
  coord: { type: ObjectId, ref: "Participant", required: true },  // copiado de la idea
  note: String,                                                    // "Un mot pour l'équipe"
  status: { type: String, enum: ["en_attente","acceptee","refusee","annulee"], default: "en_attente" },
  decidedBy: { type: ObjectId, ref: "Participant" },
  decidedAt: Date
}
```
Índice único parcial sobre `{ idea, from }` con `status: "en_attente"`: impide
dos solicitudes simultáneas a la misma idea.

`coord` está duplicado a propósito: permite comprobar permisos con una sola
consulta plana en lugar de mirar dentro de la relación.

### Notification
```js
{
  to: { type: ObjectId, ref: "Participant", index: true },
  kind: String,        // "demande" | "invitation" | "equipe" | "compte" | "doublon"
  text: String,
  read: { type: Boolean, default: false },
  createdAt: Date
}
```
Se crea en el servidor **siempre junto al correo**: el correo es el canal
principal, la campana es un reflejo de lo mismo.

## Autenticación

**Sesión por cookie httpOnly (opción B).** El servidor NO devuelve ningún `token`
en el cuerpo: al entrar o registrarse pone una cookie httpOnly del mismo dominio
(`oc_session`, JWT firmado con `JWT_SECRET`, 30 días) mediante `Set-Cookie`. El
frontend no guarda ni envía tokens; el navegador manda la cookie sola. Cerrar
sesión es `POST /api/auth/logout`, que borra la cookie. `lib/session.js` la firma
y la lee; `lib/api.js` no toca tokens.

### `POST /api/auth/register`
```
{ name, email, password, lab, disc[], bio?, li?, visible }
→ 201 { me, homonymWarning? }        // + Set-Cookie: oc_session
→ 400 { error: "Indiquez votre nom et votre prénom." }        // nom < 2 mots
→ 400 { error: "Cette adresse n'est pas valide." }
→ 400 { error: "Huit caractères minimum." }                    // mot de passe < 8
→ 400 { error: "Choisissez votre laboratoire." }
→ 400 { error: "Cochez au moins une discipline." }
→ 409 { error: "Cette adresse est déjà inscrite. Connectez-vous plutôt que de créer un second compte." }
```
Validación en servidor con los mismos mensajes que la maqueta. `me` no incluye
nunca `passwordHash`.
`homonymWarning` es un string cuando existe otro participante con el mismo
`nameKey`. La inscripción se completa igualmente; el frontend muestra el aviso en
« Mon espace » y crea una notificación de tipo `doublon` para la organización.

### `POST /api/auth/login`
```
{ email, password }
→ 200 { me }        // + Set-Cookie: oc_session
→ 401 { error: "Adresse ou mot de passe incorrect." }
```
Un solo mensaje para los dos casos: no revelar si la dirección existe.
`emailVerified` NO bloquea el login: es solo una bandera informativa (alimenta la
etiqueta « à confirmer » de las ideas).

### `POST /api/auth/logout`
```
→ 200 { ok: true }        // borra la cookie oc_session
```

### `POST /api/auth/forgot`
```
{ email }
→ 200 { ok: true }    // siempre 200, exista o no la dirección
```
Manda un correo con `token` de un uso, válido **2 horas**. La contraseña nueva se
elige desde el enlace, nunca desde el formulario de la web.

### `POST /api/auth/reset`
```
{ token, password }
→ 200 { ok: true }
→ 400 { error: "Ce lien a expiré. Demandez-en un nouveau." }
```

### `GET /api/me`
Requiere token. Devuelve `{ me, idea, requests: { incoming[], outgoing[] }, notifications[] }`.
Es lo que necesita « Mon espace » de una sola vez.

## Lectura

### `GET /api/challenges`
Público. Devuelve los desafíos con contadores agregados:
`{ ref, title, desc, theme, owner, referent, pdf, image, ideaCount, openCount }`.
Ordena por `ideaCount` ascendente — la maqueta muestra primero los desafíos
vacíos, y es intencionado.

### `GET /api/challenges/:ref`
Público. El desafío más sus ideas, ya separadas:
```
{ challenge, open: [...], closed: [...] }
```
Reglas de visibilidad, aplicadas en el servidor:
- Se excluyen `moderation: "retiree"` y `archived: true`, salvo para organizadores
  y para el propio coordinador.
- En `closed`, cada idea lleva solo `{ id, title, membresCount, status }`.
  **Sin `angle`, sin `full`, sin lista de miembros** — salvo si quien pregunta es
  miembro de esa idea, y entonces va completa.
- En `open`, se envía `{ id, title, angle, has, want, membresCount, labs[], coordName, pendingCount }`.
  `pendingCount` solo si quien pregunta es miembro.

**Tamaño de equipo — invariante (3 a 5 personas).** Una idea es « ouverte » solo
si `status: "ouverte"`, tiene al menos un perfil buscado (`want.length > 0`) **y**
`membres.length < 5` (maqueta: `open-challenge-ulhn-haropa.html:889`; texto público
« 3 à 5 personnes par équipe »). Al llegar a 5 miembros deja de aparecer como
abierta aunque conserve perfiles en `want`. El **mínimo de 3 no se valida** al
crear (un equipo empieza con 1 persona): la organización reagrupa los equipos de
menos de 3 antes del 26 de octubre de 2026.

### `GET /api/participants`
Público. Solo `visible: true`. Nunca el correo.
`{ id, name, lab, disc, bio, li, challengeRef | null }`.

## Escritura

Todas requieren token.

### `POST /api/ideas`
```
{ challengeRef, title, angle, full?, has[], want[] }
→ 201 { idea }
→ 409 { error: "Vous faites déjà partie d'une équipe. Une seule équipe par personne." }
```
El servidor pone `coord` y `membres` a partir del token, y actualiza el
`ideaId` del participante. Comprueba **en el servidor** que no tenga ya equipo.

### `PATCH /api/ideas/:id`
Coordinador o miembro. Campos editables: `title`, `angle`, `full`, `has`, `want`.
`status`, `moderation` y `archived` **no** son editables por aquí.

### `POST /api/ideas/:id/close`
Solo el coordinador. Pone `status: "fermee"`. Las solicitudes en espera pasan a
`annulee` y se avisa a cada solicitante por correo — si no, se quedan esperando
una respuesta que no llegará nunca.

### `POST /api/ideas/:id/requests`
```
{ note }
→ 201 { request }
→ 409 si ya tiene equipo, si ya tiene una solicitud en espera en esa idea,
       o si la idea está cerrada
```
Crea notificación y correo para **todos los miembros** del equipo, con la nota.

### `POST /api/requests/:id/accept`
Solo el coordinador de la idea (o un organizador, para desbloquear un
coordinador que no responde). Rechaza con 409 si la idea está cerrada o si el
equipo ya tiene 5 miembros (*« Cette équipe est complète (5 personnes maximum). »*
— ver `reference/routes/requests.js`). **El orden de las dos operaciones importa:**

```js
// 1. Reservar a la persona: falla si ya entró en otro equipo entre medias
const claimed = await Participant.findOneAndUpdate(
  { _id: req.from, ideaId: null },
  { $set: { ideaId: idea._id } },
  { new: true }
);
if (!claimed) return res.status(409).json({
  error: "Cette personne a rejoint une autre équipe entre-temps."
});

// 2. Añadirla al equipo
await Idea.updateOne({ _id: idea._id }, {
  $addToSet: { membres: claimed._id, has: { $each: claimed.disc } },
  $pull:     { want: { $in: claimed.disc } }
});

// 3. Anular sus otras solicitudes en espera y avisarla
```
Si haces primero el equipo y luego la persona, una carrera entre dos
coordinadores mete a la misma persona en dos equipos.

### `POST /api/requests/:id/refuse`
Solo el coordinador. `status: "refusee"` y correo al solicitante. Sin motivo
obligatorio: pedirlo hace que nadie responda.

### `POST /api/ideas/:id/invite`
```
{ participantId }
→ 201 { invitation }
```
El sentido contrario de una solicitud: solo miembros de la idea, y solo hacia
participantes con `visible: true` y sin equipo. Se guarda como `JoinRequest`
con un campo `direction: "invitation"` y la acepta la persona invitada, no el
coordinador.

### `POST /api/notifications/read`
Marca como leídas las notificaciones del usuario.

## Endpoints de organización

Requieren `role: "organisateur"` o `"admin"`.

- `PATCH /api/admin/ideas/:id` — `moderation`, `motifRetrait`, `archived`
- `GET /api/admin/export` — CSV de participantes, ideas y solicitudes
- `GET /api/admin/stale-requests` — solicitudes en espera desde más de 72 h

Nada se borra. `archived: true` sustituye al borrado; solo `admin` puede
eliminar de verdad.

## Correos que hay que mandar

| Cuándo | A quién |
| --- | --- |
| Inscripción | confirmación de dirección |
| Idea publicada | al coordinador, y aviso a la organización |
| Solicitud recibida | a todos los miembros del equipo, con la nota |
| Solicitud aceptada o rechazada | al solicitante |
| Invitación recibida | a la persona invitada, con enlaces de aceptar y rechazar |
| Idea retirada | al coordinador, con el motivo |
| 72 h sin respuesta | recordatorio al coordinador, copia a la organización |

Todos los correos llevan al pie el enlace para recuperar la contraseña. Es lo
que evita la mitad de los mensajes de soporte.
