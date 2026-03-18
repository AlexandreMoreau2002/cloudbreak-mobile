# CLAUDE.md — Mobile

## Organisation des imports — règle STRICTE

**Chaque fichier doit respecter ces deux règles sans exception.**

### 1. Ordre en escalier : du plus court au plus long

Les imports sont triés par longueur de ligne croissante, séparés en deux blocs :
1. Librairies externes (react, react-native, expo-*, @supabase/*, etc.)
2. Imports internes (`@/`)

```ts
// ✅ Correct
import i18n from '@/utils/i18n';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

// ❌ Incorrect — ordre aléatoire
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import i18n from '@/utils/i18n';
import { Alert } from 'react-native';
```

### 2. Alias `@/` obligatoire — jamais de `../` ou `../../`

Le `tsconfig.json` définit `@/*` → `src/*`. Toujours utiliser cet alias pour les imports internes :

```ts
// ✅
import i18n from '@/utils/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// ❌
import { useTheme } from '../../contexts/ThemeContext';
import i18n from '../utils/i18n';
```

## Internationalisation (i18n)

**Aucun texte en dur dans les composants.** Toutes les strings visibles par l'utilisateur passent par `i18n.t()` :

```ts
// ✅
<Text>{i18n.t('profile.signOut')}</Text>

// ❌
<Text>Se déconnecter</Text>
```

Les clés sont définies dans `src/locales/fr.ts` et `src/locales/en.ts`. Ajouter la clé dans les deux fichiers avant de l'utiliser.

## Workflow de développement

**Toujours lancer `npm run validate` avant de commiter.** Cette commande valide tout d'un coup :

```bash
npm run validate
# enchaîne : tsc → lint → test --coverage → build:check
```

Ne jamais commiter si `npm run validate` échoue.

**Règles :**
- Le coverage doit rester à **100%** — tout nouveau fichier source a son fichier de test
- 0 erreur TypeScript, 0 warning lint avant de commiter
- Si `build:check` échoue, le bug est bloquant (le bundle ne compile pas en prod)
