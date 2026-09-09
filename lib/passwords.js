import bcrypt from "bcryptjs";

// bcryptjs : implémentation JavaScript pure de bcrypt (même algorithme que le
// module natif `bcrypt`), sans compilation native — plus sûr sur Vercel.

const ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
