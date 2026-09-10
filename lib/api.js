/**
 * Único punto de contacto con el backend.
 * Ningún componente debe llamar a fetch directamente.
 *
 * Opción B (un solo proyecto Next): las rutas viven en el mismo dominio, así que
 * las llamadas son relativas a `/api`. La sesión va en una cookie httpOnly que el
 * navegador envía sola — no hay token que guardar ni cabecera Authorization.
 *
 * Las formas de datos que devuelve son las mismas que usa la maqueta
 * (open-challenge-ulhn-haropa.html), así que portar una pantalla consiste en
 * sustituir el array en memoria por la llamada correspondiente.
 */

async function call(path, { method = "GET", body } = {}) {
  const res = await fetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    // Mismo origen: la cookie de sesión viaja sola. `same-origin` es explícito.
    credentials: "same-origin",
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo */
  }

  if (!res.ok) {
    // El backend envía { error } con un mensaje en français listo para mostrar.
    const err = new Error((data && data.error) || "Une erreur est survenue. Réessayez.");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/* ---------- authentification ---------- */

export const auth = {
  // La cookie de sesión la pone el servidor (Set-Cookie). r = { me, homonymWarning? }.
  register: (fields) => call("/auth/register", { method: "POST", body: fields }),

  login: (email, password) => call("/auth/login", { method: "POST", body: { email, password } }),

  forgot: (email) => call("/auth/forgot", { method: "POST", body: { email } }),

  reset: (token, password) => call("/auth/reset", { method: "POST", body: { token, password } }),

  logout: () => call("/auth/logout", { method: "POST" }),
};

/** Estado completo de « Mon espace » en una sola llamada. */
export const getMe = () => call("/me");

/** Rectificar los propios datos (RGPD). Solo los campos permitidos. */
export const updateMe = (fields) => call("/me", { method: "PATCH", body: fields });

/** Cambiar la contraseña, pidiendo la actual. */
export const changePassword = (currentPassword, newPassword) =>
  call("/me/password", { method: "POST", body: { currentPassword, newPassword } });

/* ---------- lecture ---------- */

export const getChallenges = () => call("/challenges");
export const getChallenge = (ref) => call("/challenges/" + encodeURIComponent(ref));
export const getParticipants = () => call("/participants");

/* ---------- idées ---------- */

export const createIdea = (fields) => call("/ideas", { method: "POST", body: fields });
export const updateIdea = (id, fields) => call("/ideas/" + id, { method: "PATCH", body: fields });
export const closeIdea = (id) => call("/ideas/" + id + "/close", { method: "POST" });

/* ---------- demandes et invitations ---------- */

export const requestJoin = (ideaId, note) => call("/ideas/" + ideaId + "/requests", { method: "POST", body: { note } });
export const acceptRequest = (id) => call("/requests/" + id + "/accept", { method: "POST" });
export const refuseRequest = (id) => call("/requests/" + id + "/refuse", { method: "POST" });
export const invite = (ideaId, participantId) => call("/ideas/" + ideaId + "/invite", { method: "POST", body: { participantId } });

/* ---------- notifications ---------- */

export const markNotificationsRead = () => call("/notifications/read", { method: "POST" });
