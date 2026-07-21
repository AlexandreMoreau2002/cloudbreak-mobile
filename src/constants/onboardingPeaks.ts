/**
 * onboardingPeaks — 6 sommets emblématiques proposés en onboarding.
 * `slug` sert à résoudre le Peak complet via l'API publique ;
 * name/range/altitude servent de fallback d'affichage offline.
 */
export interface CuratedPeak {
  slug: string;
  name: string;
  range: string;
  altitude: number;
}

export const CURATED_PEAKS: CuratedPeak[] = [
  { slug: 'mont-aiguille', name: 'Mont Aiguille', range: 'Vercors', altitude: 2087 },
  { slug: 'grand-veymont', name: 'Grand Veymont', range: 'Vercors', altitude: 2341 },
  { slug: 'dent-de-crolles', name: 'Dent de Crolles', range: 'Chartreuse', altitude: 2062 },
  { slug: 'pic-du-midi-de-bigorre', name: 'Pic du Midi de Bigorre', range: 'Pyrénées', altitude: 2877 },
  { slug: 'puy-de-dome', name: 'Puy de Dôme', range: 'Auvergne', altitude: 1464 },
  { slug: 'chamechaude', name: 'Chamechaude', range: 'Chartreuse', altitude: 2082 },
];
