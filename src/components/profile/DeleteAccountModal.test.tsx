import React from 'react';
import { DeleteAccountModal } from './DeleteAccountModal';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#F7F5F1',
      border: '#E9E4DA',
      background: '#EFE8DC',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
      textDisabled: '#A0A0A0',
    },
  }),
}));

const USER_EMAIL = 'alex@test.com';

describe('DeleteAccountModal', () => {
  it('bouton confirm désactivé si email ne correspond pas', () => {
    const onConfirm = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <DeleteAccountModal
        visible
        userEmail={USER_EMAIL}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    const input = getByPlaceholderText('profile.deleteAccountModal.emailPlaceholder');
    fireEvent.changeText(input, 'wrong@email.com');
    fireEvent.press(getByText('profile.deleteAccountModal.confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('affiche un message d\'erreur si email ne correspond pas', () => {
    const { getByText, getByPlaceholderText } = render(
      <DeleteAccountModal
        visible
        userEmail={USER_EMAIL}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    const input = getByPlaceholderText('profile.deleteAccountModal.emailPlaceholder');
    fireEvent.changeText(input, 'wrong@email.com');
    fireEvent.press(getByText('profile.deleteAccountModal.confirm'));
    expect(getByText('profile.deleteAccountModal.errorMismatch')).toBeTruthy();
  });

  it('bouton confirm activé si email correspond', () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText } = render(
      <DeleteAccountModal
        visible
        userEmail={USER_EMAIL}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    const input = getByPlaceholderText('profile.deleteAccountModal.emailPlaceholder');
    fireEvent.changeText(input, USER_EMAIL);
    fireEvent.press(getByText('profile.deleteAccountModal.confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('appelle onConfirm si email correct', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText } = render(
      <DeleteAccountModal
        visible
        userEmail={USER_EMAIL}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    const input = getByPlaceholderText('profile.deleteAccountModal.emailPlaceholder');
    fireEvent.changeText(input, USER_EMAIL);
    fireEvent.press(getByText('profile.deleteAccountModal.confirm'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('appelle onCancel au tap Annuler', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <DeleteAccountModal
        visible
        userEmail={USER_EMAIL}
        onCancel={onCancel}
        onConfirm={jest.fn()}
      />,
    );
    fireEvent.press(getByText('profile.deleteAccountModal.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('affiche l\'erreur générique si onConfirm rejette', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('Server error'));
    const { getByText, getByPlaceholderText } = render(
      <DeleteAccountModal
        visible
        userEmail={USER_EMAIL}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    const input = getByPlaceholderText('profile.deleteAccountModal.emailPlaceholder');
    fireEvent.changeText(input, USER_EMAIL);
    fireEvent.press(getByText('profile.deleteAccountModal.confirm'));
    await waitFor(() =>
      expect(getByText('profile.deleteAccountModal.errorGeneric')).toBeTruthy(),
    );
  });

  it('remet les champs à zéro après annulation', () => {
    const onCancel = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <DeleteAccountModal
        visible
        userEmail={USER_EMAIL}
        onCancel={onCancel}
        onConfirm={jest.fn()}
      />,
    );
    const input = getByPlaceholderText('profile.deleteAccountModal.emailPlaceholder');
    fireEvent.changeText(input, 'something@email.com');
    fireEvent.press(getByText('profile.deleteAccountModal.cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
