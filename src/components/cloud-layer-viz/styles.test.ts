import { styles } from '@/components/cloud-layer-viz/styles';

describe('cloud-layer-viz/styles', () => {
  it('expose les clés de style principales', () => {
    expect(styles.container).toBeTruthy();
    expect(styles.chart).toBeTruthy();
    expect(styles.cloudLayer).toBeTruthy();
    expect(styles.summitTag).toBeTruthy();
    expect(styles.sunCircle).toBeTruthy();
  });
});
