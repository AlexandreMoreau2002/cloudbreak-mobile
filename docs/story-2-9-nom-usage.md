# Story 2.9 — Nom d’usage dans le Profil

## Idée

Le Profil peut afficher un nom choisi par la personne. Ce nom est facultatif : si elle n’en a
pas donné, l’app affiche une identité neutre. L’e-mail reste visible comme moyen de contact, mais
son début n’est jamais transformé en nom ou en initiales.

## Fonctionnement

```text
iPhone Profil → PATCH authentifié → validation FastAPI → PostgreSQL display_name
      ↑                                                        │
      └────────────── profil renvoyé / carte mise à jour ──────┘
```

Le Profil charge `display_name` avec le profil utilisateur, puis propose un dialogue pour le
modifier, l’annuler ou l’effacer. Le hook transmet uniquement le changement à l’API avec le JWT.
Le backend nettoie les espaces, limite le nom à 25 caractères et renvoie le profil sauvegardé.
Le nom n’est pas enregistré dans le stockage local persistant de l’iPhone.

Lors d’une création Apple, iOS peut fournir le nom une seule fois si la personne le partage.
L’app l’envoie après avoir établi et provisionné le compte permanent. Si Apple ne fournit aucun
nom, le compte existant n’est pas modifié et la connexion reste valide même si cette mise à jour
facultative échoue.

Le renouvellement du JWT conserve une sauvegarde déjà en cours pour le même compte. Un
changement de compte invalide les anciennes réponses ; la modale ne se ferme que lorsque son
PATCH a réussi. Une initialisation Apple réussie déclenche un nouveau chargement du profil déjà
monté, via un compteur en mémoire sans donnée personnelle. Les initiales lisent des points de
code Unicode entiers, y compris les emoji.

## Fichiers concernés

- `src/app/(tabs)/profile.tsx` et son test : affichage de la carte et ouverture du dialogue.
- `src/components/profile/UserCard.tsx`, `DisplayNameModal.tsx` et `index.ts`, avec leurs tests :
  identité neutre, saisie, compteur, validation, sauvegarde, effacement et annulation.
- `src/hooks/useDisplayName.ts` et son test : lecture/écriture API, état asynchrone et rejet des
  réponses tardives après changement de session.
- `src/services/api/user.ts` et son test : contrat mobile et requête `PATCH`.
- `src/contexts/AuthContext.tsx` et son test : initialisation facultative depuis Apple.
- `src/locales/fr.ts` et `src/locales/en.ts` : textes localisés.
- `docs/security.md` : données personnelles, logs, stockage local et suppression de compte.
- Backend associé : modèle, migration, schéma, endpoint, service, tests et `http/user.http` (voir
  [`documentation backend`](../../backend/docs/story-2-9-nom-usage.md)).

## Vérification

Les tests automatisés couvrent les états de chargement, sauvegarde, annulation, effacement,
erreur et changement de session. Le parcours complet sur appareil réel est décrit dans
[`story-2-9-nom-usage/guide-test.md`](story-2-9-nom-usage/guide-test.md), conservé localement.
