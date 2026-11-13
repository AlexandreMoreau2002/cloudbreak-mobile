const { describe, it, expect } = require('@jest/globals');
const { getAssociatedDomains } = require('./associatedDomains');

describe('getAssociatedDomains', () => {
  it('declare le domaine ops de production sans mode developpeur', () => {
    expect(getAssociatedDomains('https://ops.cloudbreak-app.com')).toEqual([
      'applinks:ops.cloudbreak-app.com',
    ]);
  });

  it('ignore le slash final et le chemin', () => {
    expect(getAssociatedDomains('https://ops.cloudbreak-app.com/')).toEqual([
      'applinks:ops.cloudbreak-app.com',
    ]);
  });

  it('active le mode developpeur pour tout autre hote https', () => {
    expect(getAssociatedDomains('https://dev-ops.cloudbreak-app.com')).toEqual([
      'applinks:dev-ops.cloudbreak-app.com?mode=developer',
    ]);
  });

  it('retourne une liste vide pour http (local)', () => {
    expect(getAssociatedDomains('http://localhost:3100')).toEqual([]);
  });

  it('retourne une liste vide pour une URL invalide ou vide', () => {
    expect(getAssociatedDomains('pas une url')).toEqual([]);
    expect(getAssociatedDomains('')).toEqual([]);
    expect(getAssociatedDomains(undefined)).toEqual([]);
  });
});
