# Story 4.3 — Premium StoreKit 2 (mobile)

Le paywall ne possède plus un prix ni un essai fictifs. `SubscriptionProvider` charge les deux produits StoreKit configurés, affiche `displayPrice` fourni par Apple et ne rend l'essai de 7 jours que si l'offre introductive Apple est une période gratuite d'une semaine.

Un visiteur peut lire le paywall mais l'achat et la restauration passent par `AccountGateContext`. Après conversion du compte Supabase, l'action est rejouée une fois avec une session fraîche. L'achat envoie l'UUID du compte permanent dans `appAccountToken`; le JWS retourné est d'abord vérifié par Cloudbreak, puis seulement terminé côté StoreKit. Une annulation garde le paywall ; une erreur générique reste récupérable et ne révèle pas le message natif.

`useSubscription()` considère Premium uniquement pour `plan: premium`, état `trial` ou `active` et expiration future. Le retour au premier plan rafraîchit le droit serveur. La restauration parcourt les droits actifs StoreKit et les vérifie au serveur.

Voir le [fonctionnement partagé](../../docs/story-4-3-storekit-2-abonnements/fonctionnement.md) et le [guide de test](../../docs/story-4-3-storekit-2-abonnements/guide-test.md).

