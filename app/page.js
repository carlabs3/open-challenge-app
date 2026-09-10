import HomeChallenges from "./components/HomeChallenges";
import HeroMedia from "./components/HeroMedia";
import { OrgLogo, France2030Logo } from "./components/OrgLogo";

/**
 * Accueil — port fidèle de la vue #v-home de la maquette
 * (open-challenge-ulhn-haropa.html:321-491). Contenu statique en français,
 * repris VERBATIM ; seule la grille des défis est dynamique (#home-grid).
 */
export default function HomePage() {
  return (
    <div className="view on" id="v-home">
      <div className="hero">
        <HeroMedia />
        <div className="wrap">
          <p className="lab">
            1<sup>er</sup> Open Challenge · ULHN × HAROPA Port
          </p>
          <h1 className="word">
            Port Open Challenge<sup>™</sup>
          </h1>
          <div className="dates">
            <span>
              <b>8 octobre → 12 novembre 2026</b>
            </span>
            <span>Ouvert aux chercheurs et doctorants de l'ULHN</span>
            <span>
              <b className="hl">10 000 €</b> de prix
            </span>
          </div>
        </div>
      </div>

      <section className="on-dark tight" style={{ background: "var(--steel-dk)", color: "#fff" }}>
        <div className="wrap">
          <p className="lab" style={{ color: "rgba(255,255,255,.7)" }}>
            Le principe
          </p>
          <h2 className="statement">
            Des problèmes réels du port. Cinq semaines. Des équipes qui ne se croisent jamais.
          </h2>
        </div>
        <div className="wrap split">
          <div aria-hidden="true"></div>
          <div>
            <p style={{ fontSize: "1.16rem", lineHeight: 1.5 }}>
              Le challenge mobilise les chercheurs de l'ULHN en équipes pluridisciplinaires pour
              répondre à des défis concrets proposés par HAROPA Port : logistique, transition
              énergétique, données portuaires, résilience des infrastructures, enjeux
              environnementaux.
            </p>
            <p style={{ marginTop: "18px", color: "rgba(255,255,255,.82)" }}>
              On part de problématiques réelles du monde portuaire et maritime, on constitue des
              équipes aux profils complémentaires, et on leur donne quelques semaines pour proposer
              des pistes de réponse innovantes.
            </p>
            <p style={{ marginTop: "18px", color: "rgba(255,255,255,.82)" }}>
              Vous n'avez pas besoin d'une idée pour participer : vous pouvez rejoindre une équipe
              qui cherche votre discipline.
            </p>
            <div className="stats">
              <div>
                <b>7</b>
                <span style={{ color: "rgba(255,255,255,.72)" }}>défis proposés</span>
              </div>
              <div>
                <b>3 à 5</b>
                <span style={{ color: "rgba(255,255,255,.72)" }}>personnes par équipe</span>
              </div>
              <div>
                <b>~2 j</b>
                <span style={{ color: "rgba(255,255,255,.72)" }}>d'engagement estimé</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="lab">Comment ça marche</p>
              <h2 style={{ marginTop: "14px" }}>Trois étapes, et rien à retenir par cœur.</h2>
            </div>
          </div>
          <div className="steps">
            <div className="step">
              <p className="lab plain" style={{ fontSize: "0.8rem" }}>
                01
              </p>
              <h3>Vous vous identifiez une fois</h3>
              <p>
                Nom, laboratoire, discipline. Deux minutes. Vous pouvez le faire depuis la page
                « Participer » ou directement en proposant une idée.
              </p>
            </div>
            <div className="step">
              <p className="lab plain" style={{ fontSize: "0.8rem" }}>
                02
              </p>
              <h3>Vous formez une équipe</h3>
              <p>
                Proposez une idée sur un défi, rejoignez une idée qui cherche votre profil, ou
                laissez une équipe venir vous chercher. Les équipes se closent le 26 octobre.
              </p>
            </div>
            <div className="step">
              <p className="lab plain" style={{ fontSize: "0.8rem" }}>
                03
              </p>
              <h3>Vous travaillez le défi</h3>
              <p>
                Workshop de co-création, puis mentorat avec les référents HAROPA. Pitch final devant
                le porteur du défi le 12 novembre.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="on-dark">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="lab">Calendrier</p>
              <h2 style={{ marginTop: "14px" }}>Quatre rendez-vous.</h2>
            </div>
          </div>
          <div className="tl">
            <div>
              <p className="d">8 OCT</p>
              <b>Lancement du challenge</b>
              <p>Ouverture des inscriptions et de la formation des équipes.</p>
            </div>
            <div>
              <p className="d">16 OCT</p>
              <b>Workshop de co-création</b>
              <p>Une journée avec les équipes constituées pour cadrer les pistes.</p>
            </div>
            <div>
              <p className="d">26 OCT</p>
              <b>Sessions de mentorat</b>
              <p>Accompagnement par les référents HAROPA Port. Clôture des équipes.</p>
            </div>
            <div>
              <p className="d">12 NOV</p>
              <b>Pitch des idées</b>
              <p>Restitution devant les porteurs de défis et le jury.</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="lab">Prix</p>
              <h2 style={{ marginTop: "14px" }}>
                10 000 € répartis entre les trois meilleures équipes.
              </h2>
            </div>
            <span className="draft">Brouillon · à confirmer</span>
          </div>
          <div className="prizes">
            <div className="prize">
              <p className="r">
                1<sup>re</sup> place
              </p>
              <b>6 000 €</b>
              <p className="small">Toutes équipes et tous défis confondus.</p>
            </div>
            <div className="prize">
              <p className="r">
                2<sup>e</sup> place
              </p>
              <b>3 000 €</b>
              <p className="small mut">{" "}</p>
            </div>
            <div className="prize">
              <p className="r">
                3<sup>e</sup> place
              </p>
              <b>1 000 €</b>
              <p className="small mut">{" "}</p>
            </div>
          </div>
          <p className="small mut" style={{ marginTop: "22px", maxWidth: "62ch" }}>
            Montants et modalités de répartition en cours de validation par l'organisation. Un
            podium unique départage l'ensemble des équipes, quel que soit le défi traité.
          </p>
        </div>
      </section>

      <section style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="lab">Les défis</p>
              <h2 style={{ marginTop: "14px" }}>Sept problématiques posées par HAROPA Port.</h2>
            </div>
            <a className="btn btn-ghost" href="/defis">
              Tout voir
            </a>
          </div>
          <HomeChallenges />
        </div>
      </section>

      <section>
        <div className="wrap">
          <p className="lab">Organisé par</p>
          <h2 style={{ margin: "14px 0 34px" }}>Organisateurs et partenaires.</h2>
          <div className="orgs">
            <div className="org">
              <OrgLogo src="/logos/ulhn.png" alt="Université Le Havre Normandie" />
              <b>Université Le Havre Normandie</b>
              <span>Organisateur</span>
            </div>
            <div className="org">
              <OrgLogo src="/logos/haropa-port.png" alt="HAROPA Port" />
              <b>HAROPA Port</b>
              <span>Porteur des défis</span>
            </div>
            <div className="org">
              <OrgLogo src="/logos/three-oclock.svg" alt="Three O'Clock" />
              <b>Three O'Clock</b>
              <span>Conception et animation</span>
            </div>
          </div>
          <div className="anr">
            <div>
              <France2030Logo />
            </div>
            <div>
              <p>
                Ce travail a bénéficié d'une aide de l'État gérée par l'Agence Nationale de la
                Recherche au titre de France 2030 portant la référence « ANR-23-EXES-0011 ».
              </p>
              <p className="small mut" style={{ marginTop: "12px" }}>
                Projet PolyCampus LH 2030.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="site">
        <div className="wrap">
          <div>
            <p className="lab">Une question ?</p>
            <h2 style={{ marginTop: "14px" }}>Le comité d'organisation vous répond.</h2>
            <a
              className="btn btn-g"
              href="mailto:open-challenge@univ-lehavre.fr?subject=Open%20Challenge%20ULHN%20%C3%97%20HAROPA%20Port"
            >
              Contactez-nous
            </a>
          </div>
          <div className="meta">
            <span>Open Challenge ULHN × HAROPA Port</span>
            <span>8 octobre → 12 novembre 2026</span>
            <span>
              <a href="mailto:open-challenge@univ-lehavre.fr">open-challenge@univ-lehavre.fr</a>
            </span>
            <span>Mentions légales · Données personnelles</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
