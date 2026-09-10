import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AccountForm } from '@/components/account/AccountForm';
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { textPrimary: '#f7f3ed', textSecondary: '#555', surface: '#fff', border: '#ddd', accent: '#b28c6e', textDisabled: '#aaa' }, typography: { fontFamily: { regular: 'System', semiBold: 'System' } }, radius: { sm: 8 }, spacing: { sm: 8 } }) }));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('AccountForm', () => {
  it('switches mode and submits the selected mode', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<AccountForm mode="creation" loading={false} onSubmit={onSubmit} onApple={jest.fn()} onModeChange={jest.fn()} onForgotPassword={jest.fn()} />);
    fireEvent.changeText(getByTestId('account-email'), 'a@b.com');
    fireEvent.changeText(getByTestId('account-password'), 'Password1!');
    fireEvent.press(getByTestId('account-submit'));
    expect(onSubmit).toHaveBeenCalledWith('a@b.com', 'Password1!');
  });

  it('ne soumet pas un mot de passe de création qui ne satisfait pas la politique partagée', () => {
    const onSubmit = jest.fn();
    const { getByTestId, UNSAFE_getAllByType } = render(
      <AccountForm
        mode="creation"
        loading={false}
        onSubmit={onSubmit}
        onApple={jest.fn()}
        onModeChange={jest.fn()}
        onForgotPassword={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId('account-email'), 'a@b.com');
    fireEvent.changeText(getByTestId('account-password'), 'abcdefgh');
    expect(getByTestId('account-submit').props.accessibilityState).toEqual({ disabled: true });
    const submit = UNSAFE_getAllByType(TouchableOpacity)
      .find((element) => element.props.testID === 'account-submit');
    expect(submit).toBeTruthy();
    submit!.props.onPress();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('laisse la connexion soumettre un mot de passe existant hors politique client', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(
      <AccountForm
        mode="connexion"
        loading={false}
        onSubmit={onSubmit}
        onApple={jest.fn()}
        onModeChange={jest.fn()}
        onForgotPassword={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId('account-email'), 'a@b.com');
    fireEvent.changeText(getByTestId('account-password'), 'abcdefgh');
    fireEvent.press(getByTestId('account-submit'));

    expect(onSubmit).toHaveBeenCalledWith('a@b.com', 'abcdefgh');
  });

  it('uses the same surfaced field treatment and keeps the translated password toggle', () => {
    const { getByTestId } = render(
      <AccountForm
        mode="creation"
        loading={false}
        onSubmit={jest.fn()}
        onApple={jest.fn()}
        onModeChange={jest.fn()}
        onForgotPassword={jest.fn()}
      />,
    );
    const emailStyle = StyleSheet.flatten(getByTestId('account-email').props.style);
    const passwordStyle = StyleSheet.flatten(getByTestId('account-password-container').props.style);

    expect(passwordStyle).toMatchObject({
      backgroundColor: '#fff',
      borderWidth: emailStyle.borderWidth,
      borderRadius: emailStyle.borderRadius,
    });
    expect(emailStyle.backgroundColor).toBe('#fff');
    expect(getByTestId('account-password-toggle').props.accessibilityLabel).toBe('account.show');

    fireEvent(getByTestId('account-email'), 'focus');
    expect(StyleSheet.flatten(getByTestId('account-email').props.style).borderColor).toBe('#b28c6e');
    fireEvent(getByTestId('account-password'), 'focus');
    expect(StyleSheet.flatten(getByTestId('account-password-container').props.style).borderColor).toBe('#b28c6e');
  });

  it('renders a visible white spinner while submitting', () => {
    const { UNSAFE_getByType } = render(
      <AccountForm
        mode="creation"
        loading
        onSubmit={jest.fn()}
        onApple={jest.fn()}
        onModeChange={jest.fn()}
        onForgotPassword={jest.fn()}
      />,
    );

    expect(UNSAFE_getByType(ActivityIndicator).props.color).toBe('#fff');
  });

  it('keeps entered text readable on white fields in dark theme', () => {
    const { getByTestId } = render(
      <AccountForm
        mode="creation"
        loading={false}
        onSubmit={jest.fn()}
        onApple={jest.fn()}
        onModeChange={jest.fn()}
        onForgotPassword={jest.fn()}
      />,
    );

    expect(getByTestId('account-email').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#1a1a1a' })]),
    );
    expect(getByTestId('account-password').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#1a1a1a' })]),
    );
  });

  it('appelle onForgotPassword au tap sur le bouton mot de passe oublié (mode connexion)', () => {
    const onForgotPassword = jest.fn();
    const { getByTestId } = render(
      <AccountForm
        mode="connexion"
        loading={false}
        onSubmit={jest.fn()}
        onApple={jest.fn()}
        onModeChange={jest.fn()}
        onForgotPassword={onForgotPassword}
      />,
    );
    fireEvent.press(getByTestId('account-forgot'));
    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas le bouton mot de passe oublié en mode création", () => {
    const { queryByTestId } = render(
      <AccountForm
        mode="creation"
        loading={false}
        onSubmit={jest.fn()}
        onApple={jest.fn()}
        onModeChange={jest.fn()}
        onForgotPassword={jest.fn()}
      />,
    );
    expect(queryByTestId('account-forgot')).toBeNull();
  });
});
