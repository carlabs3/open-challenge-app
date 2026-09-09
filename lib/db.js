import mongoose from "mongoose";

/**
 * Connexion Mongoose partagée.
 *
 * En serverless (Vercel), chaque invocation peut réutiliser le même process.
 * Sans cache, on ouvrirait une connexion par requête jusqu'à saturer Atlas.
 * On garde donc la connexion (et la promesse en cours) sur `globalThis`, qui
 * survit au hot-reload de `next dev` et aux invocations réutilisées en prod.
 */

const MONGODB_URI = process.env.MONGODB_URI;

let cached = globalThis._mongoose;
if (!cached) {
  cached = globalThis._mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI manque. Renseignez-le dans .env.local (voir .env.local.example).");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // permet une nouvelle tentative à la requête suivante
    throw e;
  }
  return cached.conn;
}
