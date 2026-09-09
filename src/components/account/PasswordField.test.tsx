import { fireEvent, render } from '@testing-library/react-native';
import { PasswordField, passwordStrength } from '@/components/account/PasswordField';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { textSecondary: '#555', textDisabled: '#aaa', accent: '#b28c6e', border: '#ddd' },
    typography: { fontFamily: { regular: 'System' } },
  }),
}));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }));

describe('passwordStrength', () => {
  it('retourne 0 pour une chaîne vide et 4 pour un mot de passe fort', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('Abcdef1!longpass')).toBe(4);
  });
});

describe('PasswordField', () => {
  it('propage la saisie et bascule la visibilité', () => {
    const onChangeText = jest.fn();
    const { getByTestId, getByLabelText } = render(
      <PasswordField value="" onChangeText={onChangeText} testID="pf" />,
    );
    fireEvent.changeText(getByTestId('pf'), 'secret');
    expect(onChangeText).toHaveBeenCalledWith('secret');
    expect(getByTestId('pf').props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('account.show'));
    expect(getByTestId('pf').props.secureTextEntry).toBe(false);
  });

  it("n'affiche la jauge de force que si showStrength et value non vide", () => {
    const { queryByLabelText, rerender } = render(
      <PasswordField value="Abcdef1!" onChangeText={jest.fn()} testID="pf" />,
    );
    expect(queryByLabelText(/account\.strength/)).toBeNull();
    rerender(<PasswordField value="Abcdef1!" onChangeText={jest.fn()} showStrength testID="pf" />);
    expect(queryByLabelText(/account\.strength/)).not.toBeNull();
  });
});
