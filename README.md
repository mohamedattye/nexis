# Suivi logistique des camions (Nexis)

Plateforme web interne pour piloter vos opérations logistiques camion par camion, avec calcul de performance réelle.

## Nouveauté demandée

Vous pouvez maintenant suivre en plus des courses:
- entretiens,
- dépenses mécaniques,
- assurances,
- salaires chauffeurs,
- charges sociales,
- autres charges.

Le système calcule la **performance réelle du véhicule**:
- Marge opérationnelle = CA - dépenses course
- Résultat net réel = Marge opérationnelle - charges fixes/mécaniques

## Utilisation

1. Ouvrir `index.html` dans votre navigateur.
2. Ajouter les courses dans la section **Ajouter une course**.
3. Ajouter les charges mensuelles dans **Ajouter charges véhicule**.
4. Filtrer par mois / camion.
5. Lire les cartes, graphiques et la table de revue mensuelle par camion.
6. Exporter les données (courses + charges) via **Exporter CSV**.

## Données

Les données sont sauvegardées localement dans le navigateur (`localStorage`).
