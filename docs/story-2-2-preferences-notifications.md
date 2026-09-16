# Story 2.2 — Préférences de notifications + réalignement Profil

## Ce qui a été fait

- Nouvel écran `Profil → Notifications` (`src/app/notifications.tsx`) : 3 toggles indépendants
  (Alertes favoris, Alertes régionales, Validation terrain GPS), sauvegarde immédiate via
  `useNotificationPreferences` (update optimiste + rollback si échec)
- Verrouillage de la ligne GPS si la permission de localisation n'est pas accordée (`value`
  "Indisponible", tap désactivé, message explicatif sous la section)
- `SettingsRow` étendu avec `tone="danger"` (déconnexion/suppression) et `disabled` (ligne GPS
  verrouillée)
- Profil parent réordonné : Apparence, Langue, Notifications, Localisation, Newsletter, Sommet par
  défaut (lecture seule) dans "Préférences" ; Déconnexion + Suppression seules dans "Compte"
- Footer version app ajouté
- `ProBanner` restylé (dégradé, rayon 20, padding 22)
- Fix : `updateNotificationPreferences()` envoyait un `PATCH` sans body — corrigé pour transmettre
  la préférence modifiée

## Comment ça fonctionne

Chaque tap sur une préférence bascule l'état local immédiatement (optimiste) puis appelle
`PATCH /api/v1/user/notifications` avec seulement le champ modifié. En cas d'échec réseau, l'état
revient à sa valeur précédente sans message d'erreur bloquant.

La préférence GPS est indisponible tant que l'autorisation de localisation n'est pas accordée.
L'écran affiche alors une ligne désactivée et une explication, sans tenter de modifier la
préférence ni d'appeler l'API.

## Comment tester

1. Ouvrir Profil → Notifications, vérifier les 3 toggles et leur état initial.
2. Basculer chaque préférence, vérifier la persistance (relancer l'app, l'état doit être conservé).
3. Refuser la permission de localisation (Réglages iOS), revenir sur l'écran Notifications : la
   ligne GPS doit afficher "Indisponible", être grisée, et le tap ne doit rien faire.
4. Vérifier que Newsletter et Localisation sont bien dans "Préférences" et que "Compte" ne contient
   plus que Déconnexion/Suppression.

## Acceptance Criteria vérifiés (epics.md Story 2.2)

- [x] 3 toggles indépendants visibles sur Profil → Notifications, état chargé depuis le backend
- [x] Bascule sauvegardée via PATCH, reflet immédiat
- [x] Colonnes DB avec défaut `true`
