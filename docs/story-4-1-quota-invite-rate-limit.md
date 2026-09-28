# Story 4.1 — Mitigation quota invité

## But

Une session anonyme Supabase peut être recréée et obtenir un nouveau `user_id`. L'application
conserve donc un UUID d'installation dans Keychain et le joint aux appels de score authentifiés.
Le backend l'utilise avec une limite IP pour rendre ce contournement coûteux.

## Flux

```text
Premier score invité
  -> SecureStore lit ou génère UUID v4
  -> apiFetch ajoute X-Cloudbreak-Installation-Id
  -> backend contrôle IP + installation + quota utilisateur
```

Une rotation du JWT anonyme ne change pas l'UUID SecureStore. Aucun App Attest/DeviceCheck n'est
inclus : cette story n'empêche pas un client modifié de fabriquer un autre UUID.

## Vérification

Voir le scénario iOS « Persistance Keychain » dans
[`backend/docs/quota-invite-rate-limit/guide-test.md`](../../backend/docs/quota-invite-rate-limit/guide-test.md).
