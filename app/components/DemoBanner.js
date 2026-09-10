// TODO retirer avant l'ouverture — bandeau « environnement de démonstration ».
// Un seul composant, une seule classe existante (.warn) : se supprime en
// retirant la ligne <DemoBanner /> du layout.
export default function DemoBanner() {
  return (
    <div className="warn">
      Environnement de démonstration — données fictives. Le challenge n'est pas encore ouvert aux
      inscriptions.
    </div>
  );
}
