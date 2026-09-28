# Setup Apple / EAS

Ce document décrit le socle de distribution iOS de Cloudbreak. Il permet de construire et de
distribuer l'application, mais n'implémente aucune fonctionnalité métier Apple.

## Identité du projet

| Élément | Valeur |
|---|---|
| Marque / nom affiché dans l'application et sur l'App Store FR | Cloudbreak – Mer de nuage |
| Nom de la fiche Store EN ciblé | Cloudbreak – Sea of Clouds |
| Slug Expo technique | `cloudbreak` |
| Projet Expo | `@alexgrimpeurs-team/cloudbreak` |
| Bundle identifier iOS | `com.alexandremoreau.cloudbreak` |

Le bundle identifier est définitif. Il ne doit pas être renommé, même si le nom marketing ou les
localisations évoluent. Le schéma existant `mobile` reste technique et n'est pas un nom présenté
dans le Store.

L'application iOS a été créée dans App Store Connect avec la langue principale française et le
nom **Cloudbreak – Mer de nuage**. La localisation anglaise de la fiche, dont le nom cible est
**Cloudbreak – Sea of Clouds**, est volontairement différée au chantier de métadonnées Store :
Apple demandera alors aussi les champs et visuels de la fiche appropriés.

## Liaison Expo

`app.json` contient `extra.eas.projectId`. `app.config.ts` propage `config.extra` afin que cette
valeur survive à la configuration dynamique ; sans cette propagation, EAS ne saurait pas à quel
projet distant rattacher une build.

```text
app.json (identité + projectId)
        ↓
app.config.ts (conserve config.extra)
        ↓
EAS Build @alexgrimpeurs-team/cloudbreak
        ↓
Apple Developer / App Store Connect
```

## Profils de build

| Profil | Usage | Distribution | Credentials constatés |
|---|---|---|---|
| `development` | client de développement natif | interne | la configuration EAS a réutilisé le profil interne Ad Hoc existant |
| `preview` | test iPhone interne partageable | interne | certificat de distribution Apple réutilisé + provisioning profile Ad Hoc |
| `production` | archive destinée à App Store Connect | App Store | certificat de distribution Apple + provisioning profile App Store |

`eas.json` déclare `developmentClient: true` pour `development`, `distribution: internal` pour
`development` et `preview`, et `autoIncrement: true` pour `production`. La version de build est
gérée par EAS (`cli.appVersionSource: remote`).

Un iPhone de développement a été enregistré pendant la création du profil Ad Hoc. Son UDID,
ainsi que les numéros de série, identifiants de profil et identifiants de session Apple, ne sont
pas consignés dans le dépôt. Ajouter un autre appareil doit se faire par EAS et régénérer le
profil interne si EAS le demande.

## Commandes utiles

Depuis `mobile/` :

```bash
npm exec --yes --package=eas-cli@latest -- eas whoami
npm exec --yes --package=eas-cli@latest -- eas credentials --platform ios
npm exec --yes --package=eas-cli@latest -- eas build --platform ios --profile preview
npm exec --yes --package=eas-cli@latest -- eas build --platform ios --profile production
```

`eas credentials` et `eas credentials:configure-build` peuvent demander l'Apple ID, le mot de
passe et la double authentification. Les saisir seulement dans le terminal local : ne jamais les
mettre dans un fichier, un secret Expo public, un commit, une issue ou une conversation.

## Périmètre volontairement exclu

Ce chantier ne modifie pas StoreKit, les notifications push, les Universal Links ni le flux réel
Sign in with Apple. La synchronisation des capabilities Apple pendant la création des credentials
ne vaut pas implémentation ni validation de ces stories. Chaque chantier devra produire une build
native et ses tests propres avant d'être considéré comme livré.

Avant une soumission App Store, il reste notamment à compléter les métadonnées/localisations de la
fiche, les captures, les informations commerciales et les exigences de conformité Apple
applicables à la version soumise.
