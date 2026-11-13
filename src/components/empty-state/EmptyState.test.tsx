import { EmptyState } from './EmptyState';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#1A1A1A',
      textDisabled: '#A0A0A0',
      accent: '#B28C6E',
      surface: '#F7F5F1',
    },
    typography: {
      fontFamily: { regular: 'JosefinSans_400Regular', semiBold: 'JosefinSans_600SemiBold' },
      fontSize: { sm: 14, md: 18 },
    },
    spacing: { sm: 8, md: 16, lg: 24 },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('EmptyState', () => {
  it('affiche le titre', () => {
    const { getByText } = render(
      <EmptyState icon="heart-outline" title="Aucun favori" />,
    );
    expect(getByText('Aucun favori')).toBeTruthy();
  });

  it('affiche le sous-titre si fourni', () => {
    const { getByText } = render(
      <EmptyState icon="heart-outline" title="Aucun favori" subtitle="Ajoutez des sommets depuis la recherche." />,
    );
    expect(getByText('Ajoutez des sommets depuis la recherche.')).toBeTruthy();
  });

  it("n'affiche pas de sous-titre si absent", () => {
    const { queryByText } = render(
      <EmptyState icon="heart-outline" title="Aucun favori" />,
    );
    expect(queryByText('Ajoutez des sommets depuis la recherche.')).toBeNull();
  });

  it('affiche le bouton CTA si ctaLabel et onCta fournis', () => {
    const onCta = jest.fn();
    const { getByText } = render(
      <EmptyState icon="search-outline" title="Aucun resultat" ctaLabel="Retour" onCta={onCta} />,
    );
    expect(getByText('Retour')).toBeTruthy();
  });

  it('appelle onCta quand le bouton est presse', () => {
    const onCta = jest.fn();
    const { getByText } = render(
      <EmptyState icon="search-outline" title="Aucun resultat" ctaLabel="Retour" onCta={onCta} />,
    );
    fireEvent.press(getByText('Retour'));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas le bouton CTA si ctaLabel absent", () => {
    const onCta = jest.fn();
    const { queryByText } = render(
      <EmptyState icon="search-outline" title="Aucun resultat" onCta={onCta} />,
    );
    expect(queryByText('Retour')).toBeNull();
  });

  it("n'affiche pas le bouton CTA si onCta absent", () => {
    const { queryByText } = render(
      <EmptyState icon="search-outline" title="Aucun resultat" ctaLabel="Retour" />,
    );
    expect(queryByText('Retour')).toBeNull();
  });
});
