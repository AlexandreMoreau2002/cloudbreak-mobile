import type { Peak } from '@/services/mockData/types';

export const MOCK_PEAKS: Peak[] = [
  {
    id: 'peak-mont-blanc',
    name: 'Mont Blanc',
    slug: 'mont-blanc',
    lat: 45.8326,
    lng: 6.8652,
    altitude: 4808,
    region: 'Massif du Mont-Blanc',
  },
  {
    id: 'peak-croix-de-chamrousse',
    name: 'Croix de Chamrousse',
    slug: 'croix-de-chamrousse',
    lat: 45.1194,
    lng: 5.8883,
    altitude: 2257,
    region: 'Massif de Belledonne',
  },
  {
    id: 'peak-grand-veymont',
    name: 'Grand Veymont',
    slug: 'grand-veymont',
    lat: 44.8631,
    lng: 5.5267,
    altitude: 2341,
    region: 'Massif du Vercors',
  },
  {
    id: 'peak-belledonne-sept-laux',
    name: 'Sept Laux',
    slug: 'sept-laux',
    lat: 45.2667,
    lng: 6.0333,
    altitude: 2183,
    region: 'Massif de Belledonne',
  },
  {
    id: 'peak-moucherotte',
    name: 'Moucherotte',
    slug: 'moucherotte',
    lat: 45.1317,
    lng: 5.6258,
    altitude: 1901,
    region: 'Massif du Vercors',
  },
];
