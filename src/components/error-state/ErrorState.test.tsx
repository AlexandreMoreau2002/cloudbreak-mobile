import { render, fireEvent } from '@testing-library/react-native';
import { ErrorState } from './ErrorState';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
      accent: '#B28C6E',
      surface: '#F7F5F1',
    },
    typography: {
      fontFamily: { semiBold: 'JosefinSans_600SemiBold', regular: 'JosefinSans_400Regular' },
      fontSize: { sm: 13, md: 16 },
    },
    spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
  }),
}));

describe('ErrorState', () => {
  it('affiche le titre', () => {
    const { getByText } = render(<ErrorState title="Erreur réseau" />);
    expect(getByText('Erreur réseau')).toBeTruthy();
  });

  it('affiche le message si fourni', () => {
    const { getByText } = render(
      <ErrorState title="Erreur" message="Vérifie ta connexion et réessaie." />,
    );
    expect(getByText('Vérifie ta connexion et réessaie.')).toBeTruthy();
  });

  it("n'affiche pas de message si absent", () => {
    const { queryByText } = render(<ErrorState title="Erreur" />);
    expect(queryByText('Vérifie ta connexion et réessaie.')).toBeNull();
  });

  it('affiche le bouton action si fourni', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ErrorState title="Erreur" action={{ label: 'Réessayer', onPress }} />,
    );
    expect(getByText('Réessayer')).toBeTruthy();
  });

  it('appelle onPress quand le bouton est pressé', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ErrorState title="Erreur" action={{ label: 'Réessayer', onPress }} />,
    );
    fireEvent.press(getByText('Réessayer'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas de bouton si action absente", () => {
    const { queryByText } = render(<ErrorState title="Erreur" />);
    expect(queryByText('Réessayer')).toBeNull();
  });

  it('affiche le lien secondaryAction si fourni', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ErrorState title="Erreur" secondaryAction={{ label: 'Pas maintenant', onPress }} />,
    );
    expect(getByText('Pas maintenant')).toBeTruthy();
  });

  it('appelle onPress du secondaryAction au clic', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ErrorState title="Erreur" secondaryAction={{ label: 'Pas maintenant', onPress }} />,
    );
    fireEvent.press(getByText('Pas maintenant'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas de secondaryAction si absent", () => {
    const { queryByText } = render(<ErrorState title="Erreur" />);
    expect(queryByText('Pas maintenant')).toBeNull();
  });

  it('applique actionTestID sur le bouton principal', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ErrorState title="Erreur" action={{ label: 'Réessayer', onPress }} actionTestID="my-action-btn" />,
    );
    expect(getByTestId('my-action-btn')).toBeTruthy();
  });

  it('applique marginBottom spacing.md quand message + action sont présents', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ErrorState title="Erreur" message="Description." action={{ label: 'Réessayer', onPress }} />,
    );
    expect(getByText('Description.')).toBeTruthy();
    expect(getByText('Réessayer')).toBeTruthy();
  });
});
