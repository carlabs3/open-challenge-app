/**
 * Une idée est « ouverte » (elle cherche des membres et apparaît dans les
 * filtres) seulement si : elle n'est pas close, elle affiche au moins un profil
 * recherché, et l'équipe n'est pas complète.
 *
 * Repris VERBATIM de la maquette : open-challenge-ulhn-haropa.html:889
 *   const isOpen = i => i.status === "ouverte" && i.want.length > 0 && i.membres.length < 5;
 *
 * Conséquence voulue : une idée « ouverte » mais pleine (5 membres) ou sans
 * profil recherché bascule côté « équipes constituées », pas côté ouvertes.
 */
export const isOpen = (idea) =>
  idea.status === "ouverte" && (idea.want?.length || 0) > 0 && (idea.membres?.length || 0) < 5;
