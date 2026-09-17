/**
 * Compteur informatif X/5 (C.3 / A.2) — même pastille dans IdeaCard et dans la
 * fiche « Mon équipe ». Dérivé de membres.length, sans aucune validation :
 *  < 3 : alerte (.pill a) ; 3–4 : validation (.pill g) ; 5 : « équipe complète ».
 */
export default function MemberCount({ count = 0 }) {
  const complete = count >= 5;
  const cls = complete ? "" : count < 3 ? "a" : "g";
  return <span className={"pill " + cls}>{complete ? "équipe complète" : count + "/5"}</span>;
}
