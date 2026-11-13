import { Colors } from '@/constants/colors';

describe('colors', () => {
  it('expose light et dark avec les tokens attendus', () => {
    expect(Colors.light.background).toBe('#EFE8DC');
    expect(Colors.dark.textPrimary).toBe('#F7F5F1');
    expect(Colors.light.accentSecondary).toBeTruthy();
  });

  it('expose les couleurs de score pour chaque verdict', () => {
    expect(Colors.score).toMatchObject({
      none: '#9E9E9E',
      high: '#4CAF50',
      medium: '#FF9800',
      low: '#F44336',
    });
  });

  it('expose les couleurs de statut des facteurs', () => {
    expect(Colors.factorStatus).toEqual({
      high: '#5C9E6E',
      medium: '#D4904A',
      low: '#C25C4A',
      unknown: '#9E9E9E',
    });
  });
});
