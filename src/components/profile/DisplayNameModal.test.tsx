import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { DisplayNameModal } from '@/components/profile/DisplayNameModal';

jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { surface: '#fff', background: '#fff', accent: '#000', border: '#aaa', textPrimary: '#000', textSecondary: '#555' },
    typography: { fontFamily: { regular: 'regular', semiBold: 'semiBold' }, fontSize: { md: 16, sm: 14 } },
    spacing: { md: 16, sm: 8 },
  }),
}));

describe('DisplayNameModal', () => {
  const onSave = jest.fn();
  const onCancel = jest.fn();
  beforeEach(() => jest.clearAllMocks());
  const setup = () => render(<DisplayNameModal displayName="Alex" state={{ status: 'success', data: 'Alex' }} onSave={onSave} onCancel={onCancel} />);

  it('accepte 25 caractères et transmet le nom trimé', () => {
    const screen = setup();
    fireEvent.changeText(screen.getByTestId('display-name-input'), `  ${'a'.repeat(25)}  `);
    fireEvent.press(screen.getByTestId('display-name-save'));
    expect(onSave).toHaveBeenCalledWith('a'.repeat(25));
  });

  it('signale le 26e caractère et interdit la sauvegarde', () => {
    const screen = setup();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'a'.repeat(26));
    expect(screen.getByText('profile.displayName.validation')).toBeTruthy();
    fireEvent.press(screen.getByTestId('display-name-save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('interdit un nom constitué uniquement d’espaces', () => {
    const screen = setup();
    fireEvent.changeText(screen.getByTestId('display-name-input'), '   ');
    fireEvent.press(screen.getByTestId('display-name-save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('annuler ne sauvegarde rien', () => {
    const screen = setup();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'New');
    fireEvent.press(screen.getByTestId('display-name-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('effacer envoie null', () => {
    fireEvent.press(setup().getByTestId('display-name-erase'));
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('cache effacer quand aucun nom n’existe', () => {
    const screen = render(<DisplayNameModal displayName={null} state={{ status: 'success', data: null }} onSave={onSave} onCancel={onCancel} />);
    expect(screen.queryByTestId('display-name-erase')).toBeNull();
  });

  it('bloque les actions pendant la sauvegarde et utilise le spinner partagé', () => {
    const screen = render(<DisplayNameModal displayName="Alex" state={{ status: 'loading', data: 'Alex' }} onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    fireEvent.press(screen.getByTestId('display-name-save'));
    fireEvent.press(screen.getByTestId('display-name-erase'));
    fireEvent.press(screen.getByTestId('display-name-cancel'));
    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('affiche une erreur localisée et garde la saisie', () => {
    const screen = setup();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'New');
    screen.rerender(<DisplayNameModal displayName="Alex" state={{ status: 'error', data: 'Alex', error: 'raw server message' }} onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByText('profile.displayName.error')).toBeTruthy();
    expect(screen.queryByText('raw server message')).toBeNull();
    expect(screen.getByTestId('display-name-input').props.value).toBe('New');
  });
});
