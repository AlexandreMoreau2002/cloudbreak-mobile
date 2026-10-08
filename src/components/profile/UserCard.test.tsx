import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { UserCard } from '@/components/profile/UserCard';
import type { AsyncState } from '@/services/mockData/types';

let mockLeaveProfile: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => (() => void)) => {
    const React = require('react');
    React.useEffect(() => {
      mockLeaveProfile = callback();
      return mockLeaveProfile;
    }, [callback]);
  },
}));

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string, params?: { count: number; max: number }) =>
    key === 'profile.displayName.count' ? `${params?.count}/${params?.max}` : key },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
    },
    typography: { fontFamily: { regular: 'regular', semiBold: 'semiBold' }, fontSize: { md: 16, sm: 14 } },
    spacing: { md: 16, sm: 8 },
  }),
}));

const confirmed: AsyncState<string | null> = { status: 'success', data: 'Alex' };
function setup(onSave = jest.fn().mockResolvedValue(true), displayName: string | null = 'Alex') {
  const screen = render(<UserCard email="alex@example.com" displayName={displayName} state={confirmed} onSave={onSave} />);
  const edit = () => fireEvent.press(screen.getByRole('button', { name: 'profile.displayName.edit' }));
  return { screen, onSave, edit };
}

describe('UserCard', () => {
  it('affiche les initiales depuis le nom choisi', () => {
    const { screen: { getByText } } = setup(undefined, 'Alex Moreau');
    expect(getByText('AM')).toBeTruthy();
  });

  it('affiche le nom fourni', () => {
    const { screen: { getByText } } = setup(undefined, 'Alex Moreau');
    expect(getByText('Alex Moreau')).toBeTruthy();
  });

  it('préserve une initiale astrale', () => {
    const { screen: { getByText } } = setup(undefined, '🌄ABCDEFGHIJKLMNOPQRSTUVW');
    expect(getByText('🌄')).toBeTruthy();
    expect(getByText('🌄ABCDEFGHIJKLMNOPQRSTUVW')).toBeTruthy();
  });

  it('affiche l\'email complet', () => {
    const { screen: { getByText } } = setup(undefined, null);
    expect(getByText('alex@example.com')).toBeTruthy();
  });

  it.each([null, ''])('shows the add placeholder and email initial for %s', (displayName) => {
    const { screen } = setup(undefined, displayName);
    expect(screen.getByText('profile.displayName.add')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('gère un email vide sans crash', () => {
    const { toJSON } = render(<UserCard email="" displayName={null} state={confirmed} onSave={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('opens a prefilled autofocus inline input from the whole card', () => {
    const { screen, edit } = setup();
    edit();
    expect(screen.getByTestId('display-name-input')).toHaveProp('autoFocus', true);
    expect(screen.getByTestId('display-name-input')).toHaveProp('value', 'Alex');
    expect(screen.getByText('profile.displayName.hint')).toBeTruthy();
    expect(screen.queryByText('profile.displayName.setting')).toBeNull();
  });

  it('trims the submitted name and closes only after save confirmation', async () => {
    let resolve!: (saved: boolean) => void;
    const { screen, edit, onSave } = setup(jest.fn().mockReturnValue(new Promise((r) => { resolve = r; })));
    edit();
    fireEvent.changeText(screen.getByTestId('display-name-input'), '  New name  ');
    fireEvent.press(screen.getByTestId('display-name-save'));
    expect(onSave).toHaveBeenCalledWith('New name');
    expect(screen.getByTestId('display-name-input')).toHaveProp('value', '  New name  ');
    await act(async () => { resolve(true); });
    expect(screen.queryByTestId('display-name-input')).toBeNull();
  });

  it('sends null when the draft is cleared', async () => {
    const { screen, edit, onSave } = setup();
    edit();
    fireEvent.changeText(screen.getByTestId('display-name-input'), '   ');
    fireEvent.press(screen.getByTestId('display-name-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
  });

  it('accepts exactly 24 Unicode characters on Return', async () => {
    const { screen, edit, onSave } = setup();
    edit();
    const value = '🌄ABCDEFGHIJKLMNOPQRSTUVW';
    fireEvent.changeText(screen.getByTestId('display-name-input'), value);
    expect(screen.getByText('24/24')).toBeTruthy();
    fireEvent(screen.getByTestId('display-name-input'), 'submitEditing');
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(value));
  });

  it('disables save and refuses Return or blur for 25 characters', () => {
    const { screen, edit, onSave } = setup();
    edit();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'ABCDEFGHIJKLMNOPQRSTUVWXY');
    expect(screen.getByText('25/24')).toBeTruthy();
    expect(screen.getByTestId('display-name-save')).toBeDisabled();
    fireEvent(screen.getByTestId('display-name-input'), 'submitEditing');
    fireEvent(screen.getByTestId('display-name-input'), 'blur');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits once when blur occurs before pressing the check', async () => {
    let resolve!: (saved: boolean) => void;
    const { screen, edit, onSave } = setup(jest.fn().mockReturnValue(new Promise((r) => { resolve = r; })));
    edit();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'New');
    fireEvent(screen.getByTestId('display-name-input'), 'blur');
    expect(onSave).toHaveBeenCalledWith('New');
    fireEvent.press(screen.getByTestId('display-name-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('New');
    await act(async () => { resolve(true); });
  });

  it('cancels on Escape and ignores the following blur', () => {
    const { screen, edit, onSave } = setup();
    edit();
    const input = screen.getByTestId('display-name-input');
    fireEvent.changeText(input, 'Discard');
    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Escape' } });
    fireEvent(input, 'blur');
    expect(screen.queryByTestId('display-name-input')).toBeNull();
    expect(screen.getByText('Alex')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cancels the draft when navigation leaves the profile', () => {
    const { screen, edit, onSave } = setup();
    edit();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'Discard');
    act(() => mockLeaveProfile?.());
    expect(screen.queryByTestId('display-name-input')).toBeNull();
    expect(screen.getByText('Alex')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('retains the failed draft, allows retry and restores the old name on Escape', async () => {
    const { screen, edit, onSave } = setup(jest.fn().mockResolvedValue(false));
    edit();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'Try again');
    fireEvent.press(screen.getByTestId('display-name-save'));
    await waitFor(() => expect(screen.getByText('profile.displayName.error')).toBeTruthy());
    expect(screen.getByTestId('display-name-input')).toHaveProp('value', 'Try again');
    fireEvent.press(screen.getByTestId('display-name-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    fireEvent(screen.getByTestId('display-name-input'), 'keyPress', { nativeEvent: { key: 'Escape' } });
    expect(screen.getByText('Alex')).toBeTruthy();
  });

  it('keeps the local draft during an unrelated successful GET', async () => {
    let resolve!: (saved: boolean) => void;
    const onSave = jest.fn().mockReturnValue(new Promise((r) => { resolve = r; }));
    const { screen, edit } = setup(onSave);
    edit();
    fireEvent.changeText(screen.getByTestId('display-name-input'), 'Pending');
    fireEvent.press(screen.getByTestId('display-name-save'));
    screen.rerender(<UserCard email="alex@example.com" displayName="Alex" state={confirmed} onSave={onSave} />);
    expect(screen.getByTestId('display-name-input')).toHaveProp('value', 'Pending');
    await act(async () => { resolve(false); });
    expect(screen.getByTestId('display-name-input')).toHaveProp('value', 'Pending');
  });
});
