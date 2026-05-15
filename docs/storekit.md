# StoreKit 2 — Documentation technique

StoreKit 2 gère l'intégralité des paiements dans Cloudbreak. **Pas de Stripe, pas de backend de paiement** — tout passe par Apple. Le backend intervient uniquement pour valider le receipt et mettre à jour la DB.

| Rôle | Où | Déclencheur |
|------|----|-------------|
| Chargement des produits | `useSubscription` hook | Montage du PaywallScreen |
| Achat | `product.purchase()` | CTA "Passer à Pro" |
| Restauration | `AppStore.sync()` | Bouton "Restaurer un achat" |
| Validation | `POST /api/v1/user/subscription/verify` | Après chaque transaction réussie |

---

## Concepts clés

### `Product`

Produit défini dans App Store Connect. Chargé au runtime via son identifiant :

```swift
let products = try await Product.products(for: ["app.cloudbreak.pro.monthly", "app.cloudbreak.pro.annual"])
```

Contient le prix localisé, la description, la durée d'abonnement. Ne représente pas un achat — c'est juste la fiche produit.

### `Transaction`

Un achat réalisé, signé cryptographiquement par Apple (JWS — JSON Web Signature). Retourné après `product.purchase()` ou lors de la restauration. Contient :
- `productID` — identifiant du produit acheté
- `expirationDate` — date d'expiration de l'abonnement
- `revocationDate` — non nil si l'achat a été annulé/remboursé
- `jwsRepresentation` — le receipt à envoyer au backend

### `currentEntitlements`

AsyncSequence qui liste toutes les transactions actives et non expirées de l'utilisateur. Utilisé au démarrage pour vérifier si l'utilisateur est Pro sans passer par le backend.

```swift
for await result in Transaction.currentEntitlements {
    // Uniquement les achats actifs, auto-renouvelables non expirés
}
```

### `AppStore.sync()`

Déclenche la synchronisation avec l'App Store — refetch toutes les transactions non terminées. Utilisé pour le flux "Restaurer un achat".

```swift
try await AppStore.sync()
```

---

## Flux d'achat

```
PaywallScreen
      │
      ▼
useSubscription.loadProducts()
      │
      ▼
Product.products(for: [...])  ←  App Store Connect
      │
      ▼
      Utilisateur appuie sur CTA
      │
      ▼
product.purchase()
      │
      ▼
      Apple affiche la sheet native de confirmation
      │
      ▼
Transaction retournée
      │
 ┌────┴────┐
success   cancelled / failed
   │           │
   ▼           ▼
Vérifier :    Afficher erreur
 - revocationDate == nil
 - expirationDate > now
   │
   ▼
POST /api/v1/user/subscription/verify
{ "receipt": transaction.jwsRepresentation }
   │
   ▼
Backend valide + met à jour DB
   │
   ▼
transaction.finish()   ← OBLIGATOIRE
   │
   ▼
Mettre à jour l'état local (plan = "pro")
```

**`transaction.finish()` est obligatoire.** Sans cet appel, Apple considère la transaction comme non traitée et la représente à chaque lancement de l'app.

---

## Flux de restauration

Obligatoire selon les App Store Review Guidelines 3.1.1 — **rejet garanti sans ce bouton**.

```
Utilisateur appuie sur "Restaurer un achat"
      │
      ▼
AppStore.sync()
      │
      ▼
Transaction.currentEntitlements  (rejoue toutes les transactions actives)
      │
      ▼
Pour chaque transaction :
  - Vérifier revocationDate et expirationDate
  - POST /api/v1/user/subscription/verify
  - transaction.finish()
      │
      ▼
Mettre à jour l'état local
```

Même logique que l'achat — le code de vérification est mutualisé.

---

## Produits Cloudbreak

| Product ID | Période | Prix |
|---|---|---|
| `app.cloudbreak.pro.monthly` | Mensuel | 5 € |
| `app.cloudbreak.pro.annual` | Annuel | 45 € |

Les deux correspondent au plan `"pro"` en DB — même niveau d'accès, même colonne `subscriptions.plan`. La différence n'est que la durée et le prix.

---

## Validation backend

### Ce que reçoit le backend

```json
POST /api/v1/user/subscription/verify
{
  "receipt": "eyJhbGciOiJFUzI1NiIsIng1YyI6..."
}
```

Le receipt est un JWS (JSON Web Signature) signé par Apple avec un certificat ECC. Il contient le `productID`, l'`expirationDate`, et les infos de renouvellement.

### Ce que fait le backend

1. Vérifie la signature JWS avec les certificats Apple (chaîne de confiance Apple Root CA)
2. Extrait `product_id`, `expires_at`, `transaction_id`
3. Met à jour `subscriptions` en DB :

```sql
UPDATE subscriptions
SET plan = 'pro', status = 'active', expires_at = {expires_at}
WHERE user_id = {user_id}
```

### Ce qui ne se passe pas

- Pas de webhook Apple — l'app push le receipt, le backend ne poll pas
- Pas de Stripe, pas de clé Stripe côté backend
- Le renouvellement automatique est géré par Apple — l'app vérifie `currentEntitlements` au démarrage

---

## Points d'attention

**`transaction.finish()` oublié** → l'achat est re-présenté à chaque lancement, l'utilisateur voit la sheet d'achat en boucle.

**Tester avec des comptes Sandbox** → ne jamais utiliser un vrai compte Apple pour tester. Créer des Sandbox Testers dans App Store Connect → Users and Access → Sandbox Testers.

**`StoreKit Testing` dans Xcode** → alternative à App Store Connect pour les tests locaux. Créer un fichier `.storekit` dans le projet, configurer les produits, activer la configuration dans le scheme. Les transactions ne quittent pas l'appareil.

**`currentEntitlements` ne retourne que les actifs** → un abonnement expiré n'apparaît pas. Pour l'historique complet, utiliser `Transaction.all`.

**Abonnements auto-renouvelables** → Apple gère le renouvellement. L'app doit vérifier `currentEntitlements` au démarrage pour détecter un renouvellement survenu hors ligne.

**Prix et devises** → `product.displayPrice` est automatiquement localisé par StoreKit selon la locale de l'App Store de l'utilisateur. Ne jamais hardcoder "5€".

---

## Debug

### Configurer StoreKit Testing (Xcode)

```
Xcode → Product → Scheme → Edit Scheme → Run → Options
→ StoreKit Configuration → sélectionner le fichier .storekit du projet
```

Le fichier `.storekit` définit les produits en local — pas besoin d'App Store Connect pour développer.

### Simulateur

Tous les achats sur simulateur sont en Sandbox — aucun vrai débit. Les transactions sont réinitialisables via :

```
Simulateur → Device → App Store → bouton "Clear Transactions"
```

### Inspecter les transactions en cours

```swift
// Dans la console Xcode — lister toutes les transactions actives
for await result in Transaction.currentEntitlements {
    switch result {
    case .verified(let transaction):
        print("[StoreKit] active:", transaction.productID, transaction.expirationDate ?? "no expiry")
    case .unverified(_, let error):
        print("[StoreKit] unverified:", error)
    }
}
```

### App Store Connect — Sandbox

```
App Store Connect → Users and Access → Sandbox → Testers
```

Créer un compte test avec une vraie adresse email. Utiliser ce compte dans les Settings iOS (pas dans les Settings de l'app) pour tester les flux d'achat réels en Sandbox.

### Logs debug (hook `useSubscription`)

```typescript
if (DEBUG) console.debug('[useSubscription] loadProducts', { count: products.length });
if (DEBUG) console.debug('[useSubscription] purchase result', { productId, status });
if (DEBUG) console.debug('[useSubscription] restore done', { entitlements });
```

---

## Résumé des appels API liés

| Action | Endpoint | Déclencheur |
|--------|----------|-------------|
| Vérifier un achat | `POST /api/v1/user/subscription/verify` | Après `product.purchase()` ou restauration |
| Lire le statut abonnement | `GET /api/v1/user/subscription` | Démarrage de l'app |
