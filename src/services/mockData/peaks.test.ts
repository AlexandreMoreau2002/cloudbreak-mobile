import { MOCK_PEAKS } from '@/services/mockData/peaks';

describe('mockData/peaks', () => {
  it('expose plusieurs sommets avec région', () => {
    expect(MOCK_PEAKS.length).toBeGreaterThan(1);
    expect(MOCK_PEAKS[0]).toMatchObject({
      id: 'peak-mont-blanc',
      name: 'Mont Blanc',
      region: 'Massif du Mont-Blanc',
    });
  });
});
