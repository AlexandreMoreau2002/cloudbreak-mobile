# Story 5.1 — Infrastructure push (mobile)

## Objectif

Permettre au backend d'envoyer des notifications à l'appareil : l'app enregistre son token Expo
Push auprès du backend pour un compte permanent, et le libère à la déconnexion.

## Fonctionnement

```text
App (compte permanent, permission iOS déjà accordée)
   └─ usePushToken → getExpoPushTokenAsync → POST /api/v1/user/push-token

Logout (signOut / signOutToAnonymous)
   └─ DELETE /api/v1/user/push-token (best-effort) → supabase.auth.signOut
```

## ACs côté mobile

- Le token Expo Push est envoyé au backend quand l'utilisateur est permanent et que la permission est `granted`.
- Aucun envoi pour un compte anonyme ou sans session.
- Le token n'est pas renvoyé pour une même session et un même token ; il l'est pour un autre utilisateur ; un renouvellement du JWT ne le renvoie pas.
- Le token est libéré au logout avant la perte du JWT ; une erreur ne bloque pas la déconnexion.
- Les erreurs d'obtention ou d'envoi ne bloquent jamais l'app.

## Fichiers

- `src/services/api/user.ts` : `updatePushToken` corrigé (POST avec corps `{ push_token, locale }` ; le backend 5.2 doit être déployé avant ce mobile, sinon 422 sur `locale`), `deletePushToken` ajouté.
- `src/hooks/usePushToken.ts` : hook d'enregistrement, monté dans `AppStack` (`src/app/_layout.tsx`).
- `src/contexts/AuthContext.tsx` : `releasePushToken` appelé par `signOut` et `signOutToAnonymous`.
- `jest.setup.ts` : mock de `getExpoPushTokenAsync`.
- Tests : `user.test.ts`, `usePushToken.test.ts`, `AuthContext.test.tsx`.

## Décisions

- Comptes permanents uniquement.
- La permission n'est jamais redemandée par le hook (l'onboarding la demande).
- Token libéré au logout en best-effort, borné à 2,5 s ; pas d'appel dans `deleteAccount` (suppression serveur).
