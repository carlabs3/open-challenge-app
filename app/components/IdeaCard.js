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

  return (
    <div className={cls}>
      <div className="idea-top">
        <h3>{idea.title}</h3>
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", alignItems: "center" }}>
          {!idea.confirmed && <span className="pill a">à confirmer</span>}
          {member && <span className="pill b">{idea.isCoord ? "vous coordonnez" : "votre équipe"}</span>}
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
