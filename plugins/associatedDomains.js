const PRODUCTION_OPS_HOST = 'ops.cloudbreak-app.com';

// Associated Domains iOS derives de l'hote ops de l'environnement.
// Apple n'accepte que des hotes https reels : local (http, IP) => aucun domaine.
// Hors production, `?mode=developer` fait verifier l'AASA directement par l'iPhone
// (builds de dev uniquement).
function getAssociatedDomains(opsBaseUrl) {
  let url;
  try {
    url = new URL(opsBaseUrl);
  } catch {
    return [];
  }

  if (url.protocol !== 'https:') {
    return [];
  }

  return url.hostname === PRODUCTION_OPS_HOST
    ? [`applinks:${url.hostname}`]
    : [`applinks:${url.hostname}?mode=developer`];
}

module.exports = { getAssociatedDomains };
