# Story 2.8 — Mini-sondage post-création

## État

Implémentation livrée avec 2.5 et 2.6 sur `feature/parcours-compte-2-5-2-6-2-8`, **review
bloquée** tant que le provisioning et le préflight Supabase ne sont pas éprouvés en réel.

## Fonctionnement

Après une création e-mail vérifiée ou Apple, `/survey` propose deux questions optionnelles :
canal d'acquisition (`app_store`, `google_search`, `instagram`, `tiktok`, `word_of_mouth`,
`other`) et pratique (`hiker`, `trail_runner`, `paraglider`, `photographer`, `mountaineer`,
`other`), plus une case newsletter. Chaque choix peut être retiré ; le bouton sans réponse et
le lien skip envoient `{"skipped": true}`. La reconnexion à un compte existant ne passe jamais
par cet écran. Après succès seulement, l'action en attente est rejouée.

## Contrat de données

`PATCH /api/v1/user/survey` refuse les champs inconnus (`extra="forbid"`) et ne modifie plus un
sondage déjà complété ou skippé. Les valeurs sont des enums, le consentement newsletter est
stocké séparément et `GET /api/v1/user/me` expose les timestamps. Le backend crée le profil si
nécessaire via le même get-or-create idempotent que `/provision` ; voir
[`backend/docs/story-2-5-provisioning.md`](../../backend/docs/story-2-5-provisioning.md).

## Retrait du consentement newsletter (RGPD)

Le consentement newsletter fixé au sondage est **révocable à tout moment** depuis l'onglet
Profil → section « Compte » → ligne « Newsletter » (visible uniquement pour un compte
permanent). Le hook [`useNewsletterConsent`](../src/hooks/useNewsletterConsent.ts) lit l'état
courant via `GET /api/v1/user/me` (`newsletter_opt_in`) et bascule via
`PATCH /api/v1/user/preferences` (`{ newsletter_opt_in: bool }`) — mise à jour optimiste,
rollback si l'appel échoue. Contrairement au sondage, cet endpoint n'a pas de champ terminal :
on peut retirer **et** ré-accorder le consentement (RGPD art. 7-3). Event analytics :
`newsletter_consent_toggled` (`opted_in`).

## Tests

Les tests mobile mockent `saveSurvey`, le routeur et le gate : réponses partielles, toutes les
catégories, skip, double soumission, erreur réseau et replay après succès sont couverts. Le test
réel doit vérifier les deux questions, chaque catégorie, caractères/locale, skip, retry après
erreur, idempotence serveur et absence du sondage en reconnexion. Les tests mockés ne prouvent
pas la persistance PostgreSQL ni un compte Supabase réel.
