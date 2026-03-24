# Test manuel — Story 3-4 : Écran principal ScoreCard

## But de la story

Connecter l'app au backend pour afficher la probabilité de mer de nuage sur l'écran d'accueil.

Avant cette story : l'onglet Accueil affichait "À venir".
Après : l'utilisateur cherche un sommet, revient sur Accueil, et voit le score en temps réel.

Flux complet :
```
Onglet Recherche → tape un sommet → appuie dessus
    → SelectedPeakContext mis à jour
    → Onglet Accueil : useScore fetche l'API (ou lit le cache)
    → ScoreCard s'affiche avec score %, verdict coloré, nom du sommet, date
```

---

## Prérequis

```bash
# Terminal 1 — backend
cd backend
source .venv/bin/activate
make dev          # lance api + db + redis sur localhost:8000

# Terminal 2 — mobile
cd mobile
npm start         # Metro (build déjà installé) ou npx expo run:ios si premier lancement
```

Avoir un compte Supabase de test créé (email + mdp quelconque).

Pour récupérer ton JWT (nécessaire pour les tests HTTP) :
- Lance l'app, connecte-toi, puis dans les logs Metro filtre `[apiFetch]` — le token apparaît dans les headers loggés en mode DEBUG.

---

## 1. Workflow complet — simulateur iOS

### 1.1 État initial (pas de sommet sélectionné)

- Ouvrir l'app et se connecter
- Aller sur l'onglet **Accueil**
- ✅ Attendu : message "Choisissez un sommet" + bouton "Rechercher un sommet"

### 1.2 Sélection d'un sommet depuis la Recherche

- Appuyer sur "Rechercher un sommet" ou aller sur l'onglet **Recherche**
- Taper "Puy de Dôme"
- Appuyer sur le résultat "Puy de Dôme"
- L'app revient sur l'onglet **Accueil**
- ✅ Attendu : skeleton loader animé (~500ms)
- ✅ Attendu : ScoreCard affiche — score en grand, verdict coloré, "Puy de Dôme", date du jour

### 1.2b Sélection d'un sommet depuis les Favoris

- Aller sur l'onglet **Favoris** (le sommet doit avoir été ajouté en favori au préalable)
- Appuyer sur un sommet favori dans la liste
- L'app revient sur l'onglet **Accueil**
- ✅ Attendu : skeleton loader animé (~500ms)
- ✅ Attendu : ScoreCard affiche — score en grand, verdict coloré, nom du sommet, date du jour

### 1.3 Vérification des couleurs de verdict

Tester avec des sommets de profils différents pour obtenir les 3 verdicts :

| Sommet | Altitude | Probabilité attendue |
|--------|----------|----------------------|
| Puy de Dôme | 1 464m | variable — souvent medium/high par temps couvert |
| Mont Ventoux | 1 910m | variable |
| Mont Blanc | 4 807m | souvent low ou none (trop haut) |
| La Bastille | 476m | souvent none (trop bas pour être au-dessus des nuages) |

- Score ≥ 70% → fond/texte vert `#4CAF50` + label "Lève-toi tôt ! 🟢"
- Score 40–69% → orange `#FF9800` + "Ça peut le faire 🟡"
- Score < 40% → rouge `#F44336` + "Pas ce coup-ci 🔴"
- Score 0% / verdict `none` → gris `#9E9E9E` + "Nuages au sol ⚫"

### 1.4 Cache offline

- Avec le score affiché, couper le réseau (mode avion)
- Fermer et rouvrir l'app (ou changer d'onglet puis revenir)
- ✅ Attendu : score s'affiche immédiatement depuis le cache AsyncStorage (sans appel réseau, TTL 2h)

### 1.5 État erreur

- Arrêter le backend (`make down` dans backend/) et couper le réseau
- Sélectionner un nouveau sommet depuis la Recherche
- ✅ Attendu : message "Impossible de charger la prévision" + bouton "Réessayer"

### 1.6 Mode MOCK (sans backend)

Dans `src/constants/devConfig.ts`, passer `MOCK_API: true` et relancer Metro :
- ✅ Puy de Dôme → score 84, verdict high (vert)
- ✅ Grand Veymont → score 54, verdict medium (orange)
- ✅ Mont Blanc (slug `peak-mont-blanc`) → score 22, verdict low (rouge)

---

## 2. Tests HTTP — backend direct

Ouvrir `backend/http/score.http` dans VS Code (extension REST Client).

Configurer `.vscode/settings.json` :
```json
{
  "rest-client.environmentVariables": {
    "local": {
      "baseUrl": "http://localhost:8000",
      "jwt": "<TON_TOKEN_SUPABASE>"
    }
  }
}
```

### 2.1 Cas nominaux

```http
### Score Puy de Dôme — devrait retourner score + verdict + conditions
GET http://localhost:8000/api/v1/score?peak_id=42cd96c1-c2c0-5cd0-8534-3931e696790b&date=2026-03-23
Authorization: Bearer {{jwt}}

### Réponse attendue (200) :
# {
#   "score": 42,           ← varie selon la météo réelle
#   "verdict": "medium",   ← "none" | "high" | "medium" | "low"
#   "cloud_base": 1150,
#   "peak_name": "Puy de Dôme",
#   "peak_altitude": 1464,
#   "conditions": {
#     "cloud_base_score": 0.72,
#     "humidity_score": 0.60,
#     "wind_score": 0.55,
#     "inversion_score": 0.40
#   }
# }
```

```http
### Score Mont Blanc (haut sommet — souvent none/low)
GET http://localhost:8000/api/v1/score?peak_id=95b3d052-884a-59f4-8509-5e4869f0b468&date=2026-03-23
Authorization: Bearer {{jwt}}
```

```http
### Score avec heure personnalisée (8h au lieu de 6h par défaut)
GET http://localhost:8000/api/v1/score?peak_id=42cd96c1-c2c0-5cd0-8534-3931e696790b&date=2026-03-23&hour=8
Authorization: Bearer {{jwt}}
```

### 2.2 Cas d'erreur

```http
### Sans JWT → 403
GET http://localhost:8000/api/v1/score?peak_id=42cd96c1-c2c0-5cd0-8534-3931e696790b&date=2026-03-23

### Réponse attendue : 403 Forbidden
```

```http
### Peak inexistant → 404
GET http://localhost:8000/api/v1/score?peak_id=00000000-0000-0000-0000-000000000000&date=2026-03-23
Authorization: Bearer {{jwt}}

### Réponse attendue : 404 {"detail": "Peak not found", "code": "PEAK_NOT_FOUND"}
```

```http
### Date manquante → 422
GET http://localhost:8000/api/v1/score?peak_id=42cd96c1-c2c0-5cd0-8534-3931e696790b
Authorization: Bearer {{jwt}}

### Réponse attendue : 422 Unprocessable Entity
```

### 2.3 Récupérer un peak_id dynamiquement

Si tu veux tester un sommet non listé ci-dessus :

```http
### Chercher un sommet et copier son id
GET http://localhost:8000/api/v1/peaks/search?q=ventoux
Authorization: Bearer {{jwt}}

### Réponse → tableau de peaks avec leurs UUIDs
```

---

## 3. Vérification des logs debug

Activer les logs DEBUG dans Metro pour observer le flux :

Dans `src/constants/devConfig.ts` :
```typescript
export const DEBUG = __DEV__ && true;  // déjà true en dev
```

Logs à observer dans la console Metro :
```
[useScore] idle — token or peakId missing     ← avant sélection
[useScore] fetching { peakId, date, hour }    ← au lancement du fetch
[useScore] cache miss/expired                 ← premier appel (pas de cache)
[useScore] success { score, verdict }         ← réponse API reçue
[useScore] cache hit { ageMs: 1234 }          ← appels suivants (< 2h)
[apiFetch] request { url, method }            ← appel HTTP envoyé
```

---

## 4. Checklist finale avant merge

- [ ] Onglet Accueil sans sommet → invite affichée
- [ ] Sélection depuis Recherche → score chargé et affiché
- [ ] Couleurs correctes pour les 3 verdicts (tester avec MOCK_API)
- [ ] Skeleton visible pendant le loading
- [ ] Message d'erreur affiché si backend down
- [ ] Cache fonctionnel (score affiché en mode avion après premier load)
- [ ] API backend répond 200 avec la bonne structure JSON
- [ ] API backend répond 403 sans token
- [ ] API backend répond 404 sur peak inconnu
- [ ] `npm test` → 87 tests passent
- [ ] `npx tsc --noEmit` → 0 erreur
