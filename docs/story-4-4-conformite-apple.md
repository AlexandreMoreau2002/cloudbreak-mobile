# Story 4.4 — Conformité Apple App Store (partie mobile)

> Backend (AC1) : tentative initiale d'endpoints `/legal/privacy` et `/legal/cgu` revert — les pages légales sont
> désormais hébergées par un service séparé `cloudbreak-ops` (Next.js). AC6 côté backend (`security.md`) traité
> hors de ce document. Ce fichier couvre uniquement la partie mobile (T2 à T7).

## Ce qui a été fait

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/constants/legalUrls.ts` | Constante `LEGAL_URLS` (privacy, cgu, support) — base URL configurable via `EXPO_PUBLIC_LEGAL_BASE_URL`, adresse support configurable via `EXPO_PUBLIC_SUPPORT_EMAIL` |
| `src/constants/legalUrls.test.ts` | Tests du fallback env var (valeurs définies / valeurs par défaut) |
| `src/hooks/useLegalLinks.ts` | Hook `useLegalLinks()` — encapsule `Linking.openURL` + `try/catch` + `Alert` d'erreur |
| `src/hooks/useLegalLinks.test.ts` | Tests du hook (succès, échec `openURL`) |

### Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/app/(tabs)/profile.tsx` | Section "Légal" ajoutée **avant** la section "Compte" — 3 `SettingsRow` (Privacy, CGU, Support) branchés sur `useLegalLinks().openLegalLink` |
| `src/app/(tabs)/profile.test.tsx` | Tests vérifiant la présence des 3 `SettingsRow` légaux |
| `src/components/paywall/PaywallHeader.tsx` | Badge "Essai gratuit 7 jours" (`trialBadge`) au-dessus du titre |
| `src/components/paywall/PaywallCTA.tsx` | Bouton "Restaurer un achat" (`testID="paywall-restore-button"`) sous le CTA principal, câblé sur un stub `restorePurchases()` |
| `src/components/paywall/PaywallFooter.tsx` | Réorganisé : "Continuer sans abonnement" en premier, puis un liseré (`borderTopWidth`) avec "Politique de confidentialité · CGU · Sans engagement · résiliable à tout moment" |
| `src/components/paywall/types.ts` | `PaywallFooterProps.colors` étendu avec `border` (pour le liseré) |
| `src/components/paywall/PaywallScreen.tsx` / `.test.tsx` | Passage de `colors.border` à `PaywallFooter` ; tests mis à jour |
| `src/locales/fr.ts` / `src/locales/en.ts` | Clés `legal.sectionTitle`, `legal.privacy`, `legal.cgu`, `legal.support`, `legal.errorTitle`, `legal.errorMessage`, `paywall.trialBadge`, `paywall.restoreSuccess`, `paywall.noCommitment` ; `paywall.ctaStart` = `"Commencer l'essai gratuit"` / `"Start free trial"` |

## Comment ça fonctionne

### Le hook `useLegalLinks`

```ts
export function useLegalLinks() {
  async function openLegalLink(url: string) {
    try {
      await Linking.openURL(url);
      if (DEBUG) console.debug('[useLegalLinks] openURL success', { url });
    } catch (error) {
      if (DEBUG) console.debug('[useLegalLinks] openURL error', { url, error });
      Alert.alert(i18n.t('legal.errorTitle'), i18n.t('legal.errorMessage'));
    }
  }
  return { openLegalLink };
}
```

Conformément à la règle projet ("jamais de `try/catch` dans les composants"), toute la logique d'ouverture de lien
(succès, échec, log debug, fallback `Alert`) vit dans ce hook. `profile.tsx` et `PaywallFooter.tsx` n'ont qu'à
appeler `openLegalLink(LEGAL_URLS.xxx)` — aucun état d'erreur à gérer localement.

### Le pattern `EXPO_PUBLIC_LEGAL_BASE_URL` / `EXPO_PUBLIC_SUPPORT_EMAIL`

```ts
// src/constants/legalUrls.ts
const LEGAL_BASE_URL = process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://ops.cloudbreak.fr';
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@cloudbreak.app';

export const LEGAL_URLS = {
  privacy: `${LEGAL_BASE_URL}/fr/privacy`,
  cgu: `${LEGAL_BASE_URL}/fr/cgu`,
  support: `mailto:${SUPPORT_EMAIL}`,
} as const;
```

Les pages légales (`/fr/privacy`, `/fr/cgu`) ne sont **pas** servies par le backend FastAPI (tentative initiale
revert) mais par le service séparé `cloudbreak-ops` (Next.js 16 + next-intl, story 4.5). La variable d'environnement
`EXPO_PUBLIC_LEGAL_BASE_URL` permet de pointer :
- en dev : `http://localhost:3100` (le service `ops` lancé en local, `npm run dev -- --port 3100`)
- en prod : `https://ops.cloudbreak.fr` (valeur par défaut si la variable n'est pas définie)

**`EXPO_PUBLIC_SUPPORT_EMAIL`** existe parce que l'adresse support n'est pas encore définitive au moment de
l'écriture de cette story — `support@cloudbreak.app` n'est qu'un placeholder de fallback, jamais codé en dur
ailleurs que dans cette constante. Le jour où la vraie adresse est choisie, il suffit de définir la variable
d'environnement (`.env` local, secrets EAS en prod) sans toucher au code.

Ce découplage permet de tester les liens légaux sans dépendre du backend, et de faire évoluer le contenu légal
(mentions RGPD, CGU) indépendamment d'un déploiement mobile.

### Pourquoi le bouton Restore a été câblé sur l'existant plutôt que dupliqué

`PaywallCTA.tsx` contenait déjà un `TouchableOpacity` de bouton secondaire sous le CTA principal (structure de
style, `activeOpacity`, `testID` prêts). Plutôt que de créer un nouveau composant "RestoreButton" dans
`PaywallFooter.tsx` (qui gère déjà les liens légaux et le dismiss), le bouton "Restaurer un achat" a été branché
directement sur ce bloc existant dans `PaywallCTA.tsx` — même fichier que le CTA principal, cohérence visuelle et
évite la duplication de style `TouchableOpacity`/`Text`. `restorePurchases()` reste un stub (`if (DEBUG)
console.debug(...)` + `Alert.alert(i18n.t('paywall.restoreSuccess'))`) en attendant la story 4.3 (StoreKit 2 réel)
qui remplacera ce stub par le vrai appel IAP.

### ⚠️ Le badge "Essai gratuit 7 jours" — risque de conformité assumé, pas résolu

Une première itération de cette story avait retiré le badge et le CTA "essai gratuit" du paywall (AC5), car Apple
interdit de promettre un essai gratuit tant qu'il n'est pas réellement câblé à StoreKit 2 (`introductoryOffer`,
story 4.3, pas commencée). Sur demande explicite (alignement avec une maquette de référence), **le badge et le CTA
"Commencer l'essai gratuit" ont été réintégrés** dans `PaywallHeader.tsx` / `PaywallCTA.tsx`.

**Ce risque n'est pas résolu, seulement reporté** : avant toute vraie soumission App Store, il faut soit :
1. câbler un vrai essai gratuit via StoreKit 2 (story 4.3) pour que la promesse soit honorée, soit
2. retirer à nouveau le badge/CTA si la story 4.3 n'est pas prête à temps.

## URLs et variables à mettre à jour avant release

Avant la release 1.0.0 :

1. Réserver et déployer le domaine `ops.cloudbreak.fr` (voir `ops/docs/story-1-legal-pages.md` pour le détail du
   service `cloudbreak-ops`)
2. Vérifier que `https://ops.cloudbreak.fr/fr/privacy` et `https://ops.cloudbreak.fr/fr/cgu` répondent 200 en prod
3. Confirmer que `EXPO_PUBLIC_LEGAL_BASE_URL` en build de prod (EAS / App Store Connect) est soit absente (le
   fallback `https://ops.cloudbreak.fr` suffit), soit explicitement définie sur la même valeur
4. **Choisir l'adresse email support définitive** et définir `EXPO_PUBLIC_SUPPORT_EMAIL` en conséquence (secrets
   EAS) — `support@cloudbreak.app` n'est qu'un placeholder tant que l'adresse réelle n'est pas décidée
5. Vérifier que l'adresse support choisie est une boîte mail active et surveillée avant la review Apple
6. Trancher le point "essai gratuit" ci-dessus (StoreKit 2 câblé ou badge retiré) avant soumission

Cette section fait le lien avec la checklist `TODO.md` (section "Avant Release 1.0.0" du `CLAUDE.md` racine).

## Comment tester

### Tests automatiques

```bash
cd mobile
npm run validate     # tsc + lint + test --coverage + build:check
```

### Tests manuels

**Section Légal — Profil**
1. Ouvrir l'onglet Profil — la section "Légal" apparaît **avant** la section "Compte"
2. Vérifier la présence des 3 lignes : "Politique de confidentialité", "Conditions d'utilisation", "Support"
3. Taper "Politique de confidentialité" → le navigateur système s'ouvre sur `{LEGAL_BASE_URL}/fr/privacy`
4. Taper "Conditions d'utilisation" → ouvre `{LEGAL_BASE_URL}/fr/cgu`
5. Taper "Support" → ouvre l'app Mail avec destinataire `{SUPPORT_EMAIL}` pré-rempli (valeur de
   `EXPO_PUBLIC_SUPPORT_EMAIL`, ou `support@cloudbreak.app` par défaut)
6. Cas limite : couper le réseau ou simuler `Linking.openURL` en échec → une `Alert` "Impossible d'ouvrir le lien"
   doit s'afficher (clés `legal.errorTitle`/`legal.errorMessage`)

**Paywall — badge et CTA**
1. Ouvrir le paywall (via quota atteint ou action premium)
2. Vérifier la présence du badge "Essai gratuit 7 jours" au-dessus du titre
3. Vérifier que le CTA principal affiche "Commencer l'essai gratuit"

**Bouton Restore**
1. Sur le paywall, vérifier la présence du bouton "Restaurer un achat" sous le CTA principal
   (`testID="paywall-restore-button"`)
2. Taper le bouton → une `Alert` "Achats restaurés" s'affiche (stub, aucun vrai achat vérifié tant que StoreKit 2
   n'est pas câblé — story 4.3)
3. En mode `DEBUG`, vérifier le log `[Paywall] restorePurchases stub` dans la console Metro

**Footer légal — Paywall**
1. Sous "Continuer sans abonnement", vérifier la présence d'un liseré séparateur
2. Vérifier la ligne "Confidentialité · Conditions · Sans engagement · résiliable à tout moment"
3. Taper "Confidentialité" / "Conditions" → ouvre la page correspondante (`testID="paywall-privacy-link"`,
   `testID="paywall-cgu-link"`)

### Checklist finale

- [ ] `npm run validate` passe (tsc + lint + tests + build:check)
- [ ] Section Légal visible et fonctionnelle sur Profil (3 liens), positionnée avant "Compte"
- [ ] Liens légaux + mention "Sans engagement" visibles et fonctionnels en bas du Paywall
- [ ] Bouton Restore visible, stub fonctionnel avec feedback utilisateur
- [ ] `EXPO_PUBLIC_LEGAL_BASE_URL` et `EXPO_PUBLIC_SUPPORT_EMAIL` documentés comme "à mettre à jour avant release"
      (ce fichier + `TODO.md`)
- [ ] Décision "essai gratuit" (StoreKit 2 câblé ou badge retiré) tranchée avant soumission App Store

## Acceptance Criteria vérifiés

- **AC1** — hors scope mobile : pages légales servies par le service `cloudbreak-ops` (Next.js), pas par le backend
  FastAPI ni par le mobile. Voir story 4.5.
- [x] **AC2** — Section Légal du Profil (avant "Compte") avec 3 entrées (Privacy, CGU, Support), chacune ouvrant le
  lien via `Linking.openURL()` (encapsulé dans `useLegalLinks`), lien support en `mailto:{EXPO_PUBLIC_SUPPORT_EMAIL}`
- [x] **AC3** — Liens légaux + mention "Sans engagement · résiliable à tout moment" visibles en bas du paywall,
  cliquables, ouvrant les pages correspondantes
- [x] **AC4** — Bouton "Restaurer les achats" visible sur le paywall, stub appelant `restorePurchases()` qui logue
  en `DEBUG` et affiche un feedback utilisateur ("Achats restaurés")
- [x] **AC5** — Prix et durée lisibles (`priceMonthly`/`priceAnnual` déjà explicites) ; ⚠️ badge "Essai gratuit
  7 jours" et CTA "Commencer l'essai gratuit" présents dans l'UI actuelle sans mécanisme StoreKit 2 réel — voir la
  section "Risque de conformité assumé" ci-dessus, décision à trancher avant soumission
- [x] **AC6** (partie mobile) — ce fichier documente les URLs et variables légales à mettre à jour avant release ;
  la partie `backend/docs/security.md` (checklist App Privacy Apple) est traitée séparément côté backend
