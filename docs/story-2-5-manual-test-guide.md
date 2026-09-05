# Story 2.5 — Guide de test manuel du préflight Supabase

> Gate bloquante avant de raccorder le parcours e-mail aux écrans `account` / `verify`.
> Ce document ne vaut pas validation du dashboard, de la boîte mail ou d'une build native.

## État du préflight

Dernière vérification : **2026-09-05**, projet Supabase de développement référencé par
`mobile/app.config.ts` (URL lue depuis la configuration locale, aucun secret affiché).

| Vérification | Résultat | Preuve / suite requise |
| --- | --- | --- |
| Endpoint de configuration Auth accessible avec la clé publique | ✅ | `GET /auth/v1/settings` a répondu HTTP 200. |
| Inscriptions e-mail autorisées | ✅ | `disable_signup: false`, `external.email: true`. |
| Anonymous Auth | ❌ bloquant | `external.anonymous_users: false`; un appel réel à `POST /auth/v1/signup` avec un corps vide a répondu HTTP 422, `Anonymous sign-ins are disabled`. Activer **Authentication → Providers → Anonymous → Allow anonymous sign-ins**. |
| Confirm email | ❌ non validé | L'API de configuration a exposé `mailer_autoconfirm: true`, ce qui indique l'auto-confirmation active. Vérifier/mettre **Confirm email ON** dans le dashboard puis refaire le probe avec une adresse de test. |
| Template OTP à six chiffres | ⏳ non testé | Aucun accès à la boîte mail de test. Configurer le template effectivement déclenché avec `{{ .Token }}` et vérifier la réception d'un code, pas seulement d'un lien. |
| `verifyOtp.type` accepté | ⏳ non déterminé | Ne pas considérer `email_change` dans `AuthContext` comme validé. Le type doit être relevé lors du flow réel après réception du code. |
| UUID avant/après upgrade | ⏳ non testé | Impossible sans Anonymous Auth, boîte mail et build/dev app. Relever `session.user.id` avant et après : ils doivent être strictement identiques. |
| Provider Apple | ❌ non validé | `external.apple: false`. Activer le provider, associer les identifiants Apple au bundle iOS et vérifier dans une build native avec la capability Sign in with Apple. Expo Go/simulateur ne suffit pas. |

### Conclusion de cette exécution

Le préflight réel est **bloqué** par des réglages Supabase et des accès manquants. Aucun type
OTP n'est déduit par intuition et aucun changement n'a été fait dans `AuthContext` ou dans les
écrans. Le code actuel utilise provisoirement `verifyOtp.type: 'email_change'` et
`resend({ type: 'email_change' })`; il ne doit pas être raccordé à l'UI tant que le flow ci-dessous
n'a pas produit une preuve.

## Procédure à exécuter avec accès dashboard + boîte mail + build native

### 1. Réglages dashboard

- [ ] Authentication → Providers → Anonymous : **Allow anonymous sign-ins = ON**.
- [ ] Authentication → Providers → Email : **Confirm email = ON**.
- [ ] Email template du flow réellement déclenché : conserver l'identifiant du template et
  utiliser `{{ .Token }}` dans le contenu ; ne pas remplacer le code par un lien magique.
- [ ] Provider Apple : activé, Service ID / clé / Team ID configurés selon Supabase ; bundle iOS
  `com.alexandremoreau.cloudbreak` et capability **Sign in with Apple** présents dans la build.
- [ ] Noter la date et le projet ciblé. Ne jamais copier de `service_role` key dans ce guide ou
  dans les logs.

### 2. Vérification anonyme et upgrade e-mail

Dans une build dev, après l'onboarding :

1. Appeler `signInAnonymously()` et relever localement (sans le publier) `user.id` et
   `user.is_anonymous === true`.
2. Faire un premier score, puis lancer la création de compte e-mail depuis le mur différé.
3. Vérifier que le message reçu contient exactement un code numérique à six chiffres et noter le
   template déclenché (nom/identifiant dashboard, sans contenu sensible).
4. Tester le ou les types `verifyOtp` documentés par la version Supabase du projet **uniquement
   avec le code reçu**. Noter le type qui répond sans erreur et le conserver dans le contrat de
   l'implémentation ; ne pas garder `email_change` si l'instance accepte un autre type.
5. Relever après validation `session.user.id`, `session.user.is_anonymous` et l'état de session.
   Comparer l'UUID avant/après caractère par caractère : l'upgrade doit conserver le même UUID et
   passer `is_anonymous` à `false`.
6. Vérifier une adresse déjà utilisée : le flow doit afficher l'erreur produit prévue, sans créer
   une seconde identité ni écraser la session anonyme de manière silencieuse.
7. Tester le renvoi, l'expiration et un code erroné. Ne pas marquer le compte converti en cas
   d'erreur réseau ou de code refusé.

### 3. Vérification Apple

- [ ] Depuis une session anonyme, Sign in with Apple lie l'identité et conserve l'UUID anonyme.
- [ ] Depuis une session permanente, le même bouton reconnecte le compte existant sans afficher
  le code OTP ni le sondage de création.
- [ ] Annulation Apple ne détruit pas la session anonyme et ne rejoue aucune action.
- [ ] Vérifier sur iOS buildée, pas dans Expo Go ; relever seulement l'UUID avant/après et l'état
  `is_anonymous`, jamais les tokens.

## Commande de preuve reproductible

Cette commande lit la configuration publique déjà présente et résume uniquement des champs non
sensibles. Elle ne modifie pas le dashboard. Elle ne crée pas de compte.

```bash
cd mobile
node - <<'NODE'
const fs = require('fs');
const config = fs.readFileSync('app.config.ts', 'utf8');
const url = process.env.SUPABASE_URL ?? config.match(/supabaseUrl:\s*process\.env\.SUPABASE_URL \?\? '([^']+)'/)[1];
const key = process.env.SUPABASE_KEY ?? config.match(/supabaseKey:\s*process\.env\.SUPABASE_KEY \?\? '([^']+)'/)[1];
(async () => {
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  const body = await response.json();
  console.log(JSON.stringify({
    status: response.status,
    anonymous_users: body.external?.anonymous_users,
    apple: body.external?.apple,
    email: body.external?.email,
    disable_signup: body.disable_signup,
    mailer_autoconfirm: body.mailer_autoconfirm,
  }));
})();
NODE
```

Ne pas imprimer les headers, la clé, les réponses complètes, les access tokens ni les adresses
e-mail. La réponse de cette exécution est consignée dans le tableau ci-dessus ; elle ne remplace
pas la réception d'un vrai message OTP.

## Critère de levée de la gate

La gate n'est levée que lorsque les cases Anonymous Auth, Confirm email, template OTP et Apple
sont prouvées sur l'instance dev, et que le compte e-mail de test documente : template déclenché,
`verifyOtp.type` accepté, UUID avant/après identique, session permanente après validation, renvoi et
adresse déjà utilisée. Jusqu'à cette preuve, les modifications doivent rester limitées au
backend/provisioning et aux tests unitaires ; aucun raccordement e-mail/OTP dans l'UI n'est autorisé.
