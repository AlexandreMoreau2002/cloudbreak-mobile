# Story 4.3 — Premium StoreKit 2 (mobile)

Le paywall ne possède plus un prix ni un essai fictifs. `SubscriptionProvider` charge les deux produits StoreKit configurés, affiche `displayPrice` fourni par Apple et ne rend l'essai de 7 jours que si l'offre introductive Apple est une période gratuite d'une semaine.

Un visiteur peut lire le paywall mais l'achat et la restauration passent par `AccountGateContext`. Après conversion du compte Supabase, l'action est rejouée une fois avec une session fraîche. L'achat envoie l'UUID du compte permanent dans `appAccountToken`; le JWS retourné est d'abord vérifié par Cloudbreak, puis seulement terminé côté StoreKit. Une annulation garde le paywall ; une erreur générique reste récupérable et ne révèle pas le message natif.

`useSubscription()` considère Premium uniquement pour `plan: premium`, état `trial` ou `active` et expiration future. Le retour au premier plan rafraîchit le droit serveur. La restauration parcourt les droits actifs StoreKit et les vérifie au serveur.

## Parcours de test manuel StoreKit

Pour le quotidien, `npm run start`, puis `i` dans Metro, sert aux écrans et à la navigation sur
le simulateur ; cela ne prouve pas un achat Apple réel. Les preuves StoreKit se font sur un iPhone
ayant déjà la development build installée, avec `npm run start -- --dev-client`, un compte Apple
Sandbox et un backend joignable. Une build EAS est exceptionnelle : première installation sur
l'appareil ou modification native. Workflow : `docs/dev-ios-workflow.md`.

- [ ] En visiteur, toucher Mensuel ou Annuel ouvre la création/connexion Cloudbreak ; la feuille
      Apple ne s'ouvre jamais.
- [ ] Tester les produits mensuel et annuel : les prix viennent d'Apple, sans valeur hardcodée.
- [ ] Vérifier que l'essai gratuit de 7 jours n'est affiché que si Apple confirme l'éligibilité et
      l'offre gratuite ; utiliser un autre Sandbox Tester si nécessaire.
- [ ] Acheter, puis annuler la feuille Apple : aucune souscription ni droit Premium n'est accordé.
- [ ] Couper le réseau après la confirmation Apple, puis le rétablir : l'erreur est récupérable et
      la vérification peut aboutir sans faux Premium.
- [ ] Réinstaller l'app et restaurer avec le même Apple ID Sandbox et le même compte Cloudbreak.
- [ ] Essayer la restauration avec un autre compte Cloudbreak : l'abonnement ne se transfère pas.
- [ ] Vérifier l'annulation, l'expiration et la révocation/remboursement : maintien jusqu'à la fin,
      puis états `expired` et `revoked` attendus.

Voir le [fonctionnement partagé](../../docs/story-4-3-storekit-2-abonnements/fonctionnement.md) et le [guide de test](../../docs/story-4-3-storekit-2-abonnements/guide-test.md).
