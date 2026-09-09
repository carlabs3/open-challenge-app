/**
 * Serveur Open Challenge ULHN × HAROPA Port
 *
 * Opción A del PLAN.md : Express en Railway, frontend en Vercel.
 * Si pasas a la opción B (todo en Next.js sobre Vercel), lo único que sobra de
 * este archivo es la configuración de CORS y el arranque del servidor: los
 * middlewares y las rutas se reutilizan tal cual.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const { Participant } = require("./models");

const app = express();
app.set("trust proxy", 1);            // Railway está detrás de un proxy
app.use(express.json({ limit: "200kb" }));

/* ---------- CORS ----------
   Dominios distintos: solo se permite el frontend, y no hace falta
   `credentials` porque la sesión viaja en la cabecera Authorization. */
const allowed = [process.env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  methods: ["GET", "POST", "PATCH"],
}));

/* ---------- limites ----------
   Protege el login y el "olvidé mi contraseña" de intentos automatizados.
   Los límites son generosos: con menos de 50 participantes nadie legítimo
   los va a tocar. */
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 40 }));

/* ---------- session ----------
   Token de 30 días. `requireAuth` deja req.me listo para las rutas. */
const signToken = (id) => jwt.sign({ sub: String(id) }, process.env.JWT_SECRET, { expiresIn: "30d" });

async function readAuth(req, _res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const { sub } = jwt.verify(token, process.env.JWT_SECRET);
      req.me = await Participant.findById(sub).lean();
    } catch { /* token inválido o caducado: se sigue como visitante */ }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.me) return res.status(401).json({ error: "Votre session a expiré. Reconnectez-vous." });
  next();
}

function requireStaff(req, res, next) {
  if (!req.me || !["organisateur", "admin"].includes(req.me.role)) {
    return res.status(403).json({ error: "Accès réservé à l'organisation." });
  }
  next();
}

app.use(readAuth);

/* ---------- routes ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/challenges", require("./routes/challenges"));
app.use("/api/participants", require("./routes/participants"));
app.use("/api/ideas", requireAuth, require("./routes/ideas"));
app.use("/api/requests", requireAuth, require("./routes/requests"));
app.use("/api/notifications", requireAuth, require("./routes/notifications"));
app.use("/api/me", requireAuth, require("./routes/me"));
app.use("/api/admin", requireStaff, require("./routes/admin"));

/* ---------- panel d'administration ----------
   AdminJS genera el CRUD completo sobre los modelos: revisar ideas, retirar,
   archivar, reasignar. Es lo que evita programar un dashboard a mano.
   Móntalo detrás de una autenticación propia, nunca abierto. */
// const { buildAdmin } = require("./admin");
// buildAdmin(app);

/* ---------- erreurs ---------- */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Une erreur est survenue. Réessayez dans un instant." });
});

/* ---------- démarrage ---------- */
const PORT = process.env.PORT || 4000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log("API prête sur " + PORT)))
  .catch((e) => { console.error("Connexion MongoDB impossible", e); process.exit(1); });

module.exports = { app, signToken, requireAuth, requireStaff };
