// Hôte du service cloudbreak-ops (Next.js) de l'environnement courant :
// pages légales, lien de partage des sommets et Associated Domains iOS.
// Local : http://localhost:3100 · dev : https://dev-ops.cloudbreak-app.com · prod : https://ops.cloudbreak-app.com
// La variable garde son nom historique EXPO_PUBLIC_LEGAL_BASE_URL.
const RAW_OPS_BASE_URL = process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://ops.cloudbreak-app.com';

export const OPS_BASE_URL = RAW_OPS_BASE_URL.replace(/\/+$/, '');
