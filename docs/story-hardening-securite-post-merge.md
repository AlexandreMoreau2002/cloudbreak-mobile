# Fix — Durcissement sécurité/robustesse post-merge auth

## Ce qui a été fait

Suite au merge du lot auth 2.5+2.6+2.7+2.8, 4 corrections ciblées de sécurité/robustesse :

1. **Rename `retryEmailUpgradeProvisioning` → `retryProvisioning`** (`AuthContext.tsx`) — la
   fonction était déjà générique (relit la session, rappelle le provisioning), le nom
   trahissait à tort un usage limité à l'email upgrade.
2. **Durcissement `verify.tsx`** : redirection vers `/account` si l'écran est ouvert sans
   email/password en mémoire (ex : app tuée en plein flow) ; log debug sur un nouvel échec
   de retry provisioning (au lieu d'un `return` muet).
3. **Retry provisioning sur `account.tsx`** (login e-mail + Apple) : si `signIn()` ou
   `signInWithApple()` réussit côté Supabase mais que le provisioning backend échoue,
   affichage d'un état `provisioningError` dédié + bouton retry, au lieu du message générique
   `errorNetwork`. Détection factorisée dans `isProvisioningError()` (exportée par
   `AuthContext.tsx`), utilisée identiquement par `verify.tsx` et `account.tsx`. Le retry
   respecte le `mode` d'origine (creation → `/survey`, connexion → `complete()`).
4. **Timeout HTTP réel** (`fetchService.ts`) : un `AbortController` interne abort désormais
   réellement la requête réseau sous-jacente quand le timeout (10s) se déclenche, au lieu de
   la laisser continuer en arrière-plan après avoir perdu la `Promise.race`. Propage aussi
   l'annulation d'un signal externe.
5. **Garde env Supabase** (`supabaseClient.ts`) : `throw` explicite au chargement du module
   si `extra.supabaseUrl`/`extra.supabaseKey` sont absents, au lieu d'un crash opaque plus
   tard.

## Comment ça fonctionne

Voir `docs/security.md`, section "2026-09-12 Durcissement post-merge auth" pour le détail
technique de chaque point.

## Comment tester

```bash
cd mobile
npm test && npx tsc --noEmit && npm run lint
```

Scénarios manuels :
- Tuer l'app en plein flow email upgrade (entre `/account` et `/verify`) → relancer sur
  `/verify` → doit rediriger vers `/account` sans crash
- Couper le réseau en pleine requête → l'erreur doit être `NETWORK_TIMEOUT` après 10s, sans
  requête fantôme qui continue en arrière-plan
- Retirer temporairement `extra.supabaseUrl` de `app.config.ts` → l'app doit échouer
  explicitement au démarrage avec un message clair

## Acceptance criteria vérifiés

- [x] `retryProvisioning` renommé partout (AuthContext, verify.tsx, account.tsx, tests)
- [x] verify.tsx redirige si credentials absents
- [x] verify.tsx et account.tsx logguent un nouvel échec de retry sans quitter l'écran
- [x] account.tsx affiche un état provisioning dédié + retry sur login/Apple, respecte le mode
- [x] fetchService.ts abort réellement le fetch sous-jacent au timeout
- [x] supabaseClient.ts échoue explicitement si la config est absente
- [x] Tous les tests passent (`npm test && npx tsc --noEmit && npm run lint`)

## Fichiers impactés

- `src/contexts/AuthContext.tsx` (+ test)
- `src/app/verify.tsx` (+ test)
- `src/app/account.tsx` (+ test)
- `src/locales/fr.ts` / `en.ts`
- `src/services/fetchService.ts` (+ test)
- `src/services/supabaseClient.ts` (+ nouveau fichier de test `supabaseClient.env-guard.test.ts`)
