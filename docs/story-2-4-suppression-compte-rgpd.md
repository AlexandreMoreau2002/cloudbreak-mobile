# Story 2-4 — Suppression du Compte et Données Personnelles (RGPD)

## Ce qui a été fait

| Fichier | Rôle |
|---------|------|
| `src/services/api/user.ts` | Ajout de `deleteAccount(token)` — `DELETE /api/v1/user` via `apiFetch` |
| `src/contexts/AuthContext.tsx` | Ajout de `deleteAccount()` — orchestre service → signOut → AsyncStorage.clear() |
| `src/components/profile/DeleteAccountModal.tsx` | Nouveau composant modal avec champ email, validation, état loading/error |
| `src/components/profile/index.ts` | Ajout export `DeleteAccountModal` |
| `src/locales/fr.ts` + `en.ts` | Clés i18n `profile.deleteAccount` et `profile.deleteAccountModal.*` |
| `src/app/(tabs)/profile.tsx` | Bouton "Supprimer mon compte" (rouge, section Compte) + intégration modale |
| `src/services/api/user.test.ts` | Tests `deleteAccount` : succès, erreur réseau, mode MOCK_API, debug log |
| `src/components/profile/DeleteAccountModal.test.tsx` | 7 cas : email mismatch, email correct, onConfirm appelé, erreur générique, annulation |

## Comment ça fonctionne

### Flux de suppression

1. L'utilisateur appuie sur "Supprimer mon compte" dans l'onglet Profil → section Compte
2. `DeleteAccountModal` s'ouvre (modal React Native transparent, backdrop semi-opaque)
3. L'utilisateur saisit son email — le bouton "Supprimer définitivement" n'est actif que si `emailInput === userEmail`
4. Si email ne correspond pas : message d'erreur `profile.deleteAccountModal.errorMismatch`
5. Si email correspond : `onConfirm()` → `AuthContext.deleteAccount()` :
   - `deleteAccountService(token)` → `DELETE /api/v1/user` → 204
   - `supabase.auth.signOut()` → déclenche `onAuthStateChange` → `AuthGuard` redirige vers `/login`
   - `AsyncStorage.clear()` → supprime tout le cache local (score, selectedPeak, etc.)
6. Si erreur API : message `profile.deleteAccountModal.errorGeneric`, spinner arrêté

### Couleurs

- Bouton destructif : `#C25C4A` (couleur "danger" du design system)
- Bouton désactivé : opacité 40%

## Comment tester

```bash
cd mobile
npm test -- --testPathPattern="DeleteAccountModal|user.test"
npx tsc --noEmit
```

### Test manuel (simulateur)

1. Lancer `npm start` (ou `npx expo run:ios` si build absent)
2. Se connecter avec un compte de test
3. Aller dans l'onglet Profil
4. Appuyer sur "Supprimer mon compte" (rouge, section Compte)
5. Vérifier que la modale s'ouvre avec le message d'irréversibilité
6. Saisir un email incorrect → bouton reste grisé → après appui : message d'erreur email
7. Saisir l'email correct → bouton devient actif
8. Confirmer → spinner → redirection vers l'écran de connexion

### Mode MOCK_API

Activer `MOCK_API: true` dans `src/constants/devConfig.ts` pour tester sans backend.

## Acceptance Criteria vérifiés

- [x] AC1 — Bouton "Supprimer mon compte" dans profil → modale avec "irréversible" + champ email + validation avant activation du bouton de confirmation
- [x] AC2 — Appel `DELETE /api/v1/user` avec JWT (géré dans `AuthContext.deleteAccount`)
- [x] AC3 — Après 204 : signOut → AsyncStorage.clear → redirection login (via onAuthStateChange + AuthGuard)
- [x] AC4 — Sans JWT : 403 retourné par le backend (testé dans les tests backend)
