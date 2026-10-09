# Story 2.9 — Nom d’usage dans le Profil

## Idée

Le Profil peut afficher un nom choisi par la personne. Ce nom est facultatif : si elle n’en a
pas donné, l’app affiche « Ajouter un nom d’usage » et la première lettre de l’e-mail dans
l’avatar. L’e-mail complet reste visible comme moyen de contact.

## Fonctionnement

```text
iPhone Profil → PATCH authentifié → validation FastAPI → PostgreSQL display_name
      ↑                                                        │
      └────────────── profil renvoyé / carte mise à jour ──────┘
```

Le Profil charge `display_name` avec le profil utilisateur. Toute la carte identité est tactile,
sans crayon ni ligne dans les paramètres COMPTE. Au toucher, le nom devient un champ prérempli,
avec focus automatique et clavier. La carte reçoit une bordure accent de 1,5 px et un halo de
4 px ; le champ mesure 34 px avec un soulignement accent et 8 px avant l’e-mail. Le compteur
montre `n/24`, le bouton rond ✓ mesure 34 px et une aide rappelle que le nom reste modifiable.

```text
Carte au repos → toucher → saisie inline
                              ├─ ✓ / Retour / perte de focus → PATCH
                              │                                ├─ succès → carte actualisée
                              │                                └─ erreur → saisie conservée
                              └─ Échap / quitter le Profil → annulation sans requête
```

Le hook transmet le changement à l’API avec le JWT. L’app nettoie les espaces et refuse plus
de 24 caractères ; seuls les lettres (accents compris), chiffres, espaces, tirets et apostrophes
sont acceptés (même règle que le serveur) ; un champ vide envoie `null` pour effacer le nom. Le backend
valide aussi cette limite et renvoie le profil sauvegardé. Un garde synchrone évite une double
requête quand la perte de focus précède la pression sur ✓.
Le nom n’est pas enregistré dans le stockage local persistant de l’iPhone.

Lors d’une création Apple, iOS peut fournir le nom une seule fois si la personne le partage.
L’app ne garde que les caractères autorisés, envoie « prénom nom » s’il tient en 24 caractères,
sinon le prénom seul (tronqué si besoin). Elle l’envoie après avoir établi et provisionné le compte
permanent, et seulement si le profil n’a pas déjà de nom : un nom choisi n’est jamais remplacé. Si
Apple ne fournit aucun nom, le compte existant n’est pas modifié et la connexion reste valide même si cette mise à jour
facultative échoue.

Le renouvellement du JWT conserve une sauvegarde déjà en cours pour le même compte. Un
changement de compte invalide les anciennes réponses ; l’édition ne se ferme que lorsque son
PATCH a réussi. Une initialisation Apple réussie déclenche un nouveau chargement du profil déjà
monté, via un compteur en mémoire sans donnée personnelle. Les initiales lisent des points de
code Unicode entiers.

## Fichiers concernés

- `src/app/(tabs)/profile.tsx` et son test : carte inline reliée directement au hook et réinitialisée
  au changement de compte, sans ligne dans les paramètres COMPTE.
- `src/components/profile/UserCard.tsx` et son test : initiales, saisie inline, compteur,
  validation, sauvegarde, effacement et annulation. `DisplayNameModal.tsx` et son test ont été
  supprimés, ainsi que leur export dans `index.ts`.
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
