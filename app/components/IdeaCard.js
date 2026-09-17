"use client";

import { DISC } from "@/lib/constants";

/**
 * Carte d'idée — port de ideaCard (maquette:1152). Mêmes classes, même logique
 * d'affichage. Les drapeaux (mine, isCoord, requested, confirmed, pendingCount)
 * sont calculés côté serveur (GET /api/challenges/:ref).
 *
 * `open` = l'idée est dans la section « ouvertes » (isOpen). `myIdea` = l'idée
 * de la personne connectée, ou null.
 */
export default function IdeaCard({ idea, open, myIdea, onEdit, onJoin, onClose }) {
  const member = !!idea.mine;
  const cls = "idea" + (open ? "" : " closed") + (member ? " mine" : "");

  const labs = idea.labs || [];
  let line = idea.membresCount + (idea.membresCount > 1 ? " membres" : " membre");
  if (open) line += " · " + labs.join(", ") + " · coordonnée par " + (idea.coordName || "—");
  if (open && member && idea.pendingCount) {
    line += " · " + idea.pendingCount + " demande" + (idea.pendingCount > 1 ? "s" : "") + " à traiter";
  }

  const hasTeam = !!myIdea;

  // Compteur informatif X/5 (4.2) — dérivé de membres.length, sans nouvelle règle.
  // < 3 : couleur d'alerte (.pill a) ; 3–4 : validation (.pill g) ; 5 : « équipe complète ».
  const count = idea.membresCount ?? 0;
  const complete = count >= 5;
  const counterCls = complete ? "" : count < 3 ? "a" : "g";

  return (
    <div className={cls}>
      {/* Sur « Les équipes », chaque carte rappelle son défi (implicite sur la page d'un
          défi, donc absent là-bas : le serveur n'y met pas challengeRef). */}
      {idea.challengeRef && (
        <p className="lab" style={{ marginBottom: "10px" }}>
          {idea.challengeRef}
          {idea.challengeTitle ? " · " + idea.challengeTitle : ""}
        </p>
      )}
      <div className="idea-top">
        <h3>{idea.title}</h3>
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", alignItems: "center" }}>
          {/* La pastille « à confirmer » a été retirée : le champ `confirmed` est lié à la
              vérification de l'adresse mail, pas à une ouverture d'idée, et aucun bouton ne
              le change. Le libellé promettait une action inexistante (voir API.md). */}
          {member && <span className="pill b">{idea.isCoord ? "vous coordonnez" : "votre équipe"}</span>}
          <span className={"pill " + counterCls}>{complete ? "équipe complète" : count + "/5"}</span>
          <span className={"pill " + (open ? "g" : "")}>{open ? "cherche des profils" : "candidatures closes"}</span>
        </div>
      </div>

      {open || member ? (
        <>
          <p className="angle">{idea.angle}</p>
          <div className="disc">
            {(idea.has || []).map((k) => (
              <span className="has" key={"h" + k}>
                {DISC[k]}
              </span>
            ))}
            {(idea.want || []).map((k) => (
              <span className="want" key={"w" + k}>
                cherche {DISC[k].toLowerCase()}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="locked">Le détail de cette idée n'est plus public. L'équipe est constituée.</p>
      )}

      <div className="idea-foot">
        <span>{line}</span>
        <Acts idea={idea} open={open} member={member} hasTeam={hasTeam} onEdit={onEdit} onJoin={onJoin} onClose={onClose} />
      </div>

      {open && !member && hasTeam && (
        <p className="small mut">
          Vous êtes déjà engagé dans une équipe sur le défi {myIdea.challengeRef}.
        </p>
      )}

      {/* Le bouton « Rejoindre » est désactivé quand une demande est déjà partie : le motif
          doit être visible à l'écran, pas seulement dans l'attribut `title`. Le cas « déjà
          en équipe » est traité au-dessus ; celui-ci le complète. */}
      {open && !member && !hasTeam && idea.requested && (
        <p className="small mut">Votre demande est en attente de réponse.</p>
      )}
    </div>
  );
}

function Acts({ idea, open, member, hasTeam, onEdit, onJoin, onClose }) {
  const acts = [];
  if (member) {
    acts.push(
      <button type="button" className="btn btn-s btn-ghost" key="edit" onClick={() => onEdit(idea)}>
        Modifier
      </button>
    );
  }
  if (idea.isCoord && idea.status === "ouverte") {
    acts.push(
      <button type="button" className="btn btn-s btn-ghost" key="close" onClick={() => onClose(idea)}>
        Clôturer les candidatures
      </button>
    );
  }
  if (open && !member) {
    const already = idea.requested;
    const disabled = hasTeam || already;
    acts.push(
      <button
        type="button"
        key="join"
        className={"btn btn-s" + (disabled ? " btn-ghost" : " btn-g")}
        disabled={disabled}
        title={
          already
            ? "Votre demande est en attente de réponse."
            : hasTeam
            ? "Vous êtes déjà dans une équipe : une seule équipe par personne."
            : undefined
        }
        onClick={disabled ? undefined : () => onJoin(idea)}
      >
        {already ? "Demande envoyée" : "Rejoindre cette équipe"}
      </button>
    );
  }
  if (!acts.length) return null;
  return <div className="acts">{acts}</div>;
}
