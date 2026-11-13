# Story — Setup EAS / Apple / App Store Connect

## Objectif atteint

Cloudbreak dispose maintenant du socle EAS iOS nécessaire pour produire des builds internes et
une archive App Store. L'application App Store Connect existe et le projet Expo distant est lié à
la configuration mobile.

```text
Code mobile
  └─ app.json / app.config.ts / eas.json
       └─ EAS (@alexgrimpeurs-team/cloudbreak)
            ├─ development / preview : distribution interne Ad Hoc
            └─ production : distribution App Store
                 └─ App Store Connect : Cloudbreak – Mer de nuage
```

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `app.json` | Nom de marque, slug Expo, bundle iOS immuable et liaison EAS distante |
| `app.config.ts` | Conservation de `extra.eas.projectId` dans la configuration dynamique |
| `eas.json` | Profils `development`, `preview` et `production` |
| `docs/setup-eas-apple.md` | Procédure, garde-fous et état de configuration |

## État externe vérifié

- Projet Expo : `@alexgrimpeurs-team/cloudbreak`.
- Bundle iOS : `com.alexandremoreau.cloudbreak`, déjà enregistré côté Apple.
- App iOS App Store Connect créée sous le nom français **Cloudbreak – Mer de nuage**.
- Credentials EAS de production : certificat de distribution Apple et provisioning profile App
  Store actifs.
- Credentials EAS internes : certificat de distribution Apple et provisioning profile Ad Hoc
  actifs ; un iPhone de développement est enregistré sans exposer son UDID.
- Le réglage `development` a réutilisé ce profil interne Ad Hoc ; cela est cohérent avec sa
  distribution interne et son development client.

## Ce que cette story ne fait pas

Elle ne crée aucun produit StoreKit, aucun token ou envoi push, aucune association Universal
Links, et ne valide pas la connexion Apple réelle avec Supabase. Les capabilities détectées par
Apple pendant le provisioning ne suffisent pas à valider ces parcours.

La fiche App Store anglaise reste à préparer lors du chantier de métadonnées. Son nom souhaité est
**Cloudbreak – Sea of Clouds** ; ne pas le substituer au slug Expo ou au bundle identifier.

## Risques et suite

Le premier build EAS iOS constitue la preuve opérationnelle finale : il doit être lancé sur chaque
profil utile et téléchargé/testé sur l'iPhone enregistré pour les builds internes. Les profils et
certificats Apple expirent ; EAS doit être relancé à temps afin de les renouveler. Aucune valeur
secrète ou identifiant matériel ne doit être archivée dans ce dépôt.
