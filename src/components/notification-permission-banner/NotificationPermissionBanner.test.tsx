import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: object) =>
    require('react').createElement(require('react-native').View, { ...props, testID: 'banner-icon' }),
}));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      background: '#EFE8DC',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
    },
    typography: {
      fontFamily: { regular: 'JosefinSans_400Regular', bold: 'JosefinSans_700Bold' },
      fontSize: { xs: 11, sm: 14 },
      lineHeight: { normal: 1.5 },
    },
    spacing: { sm: 8 },
  }),
}));

describe('NotificationPermissionBanner', () => {
  it('affiche le titre, le message et le bouton', () => {
    render(<NotificationPermissionBanner onOpenSettings={jest.fn()} />);
    expect(screen.getByText('notifications.permissionDeniedTitle')).toBeTruthy();
    expect(screen.getByText('notifications.permissionDeniedMessage')).toBeTruthy();
    expect(screen.getByText('notifications.openSettings')).toBeTruthy();
  });

  it('expose un bouton accessible qui appelle onOpenSettings', () => {
    const onOpenSettings = jest.fn();
    render(<NotificationPermissionBanner onOpenSettings={onOpenSettings} />);
    const button = screen.getByTestId('notification-permission-banner-button');
    expect(button.props.accessibilityRole).toBe('button');
    fireEvent.press(button);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('marque le titre comme en-tête pour les lecteurs d’écran', () => {
    render(<NotificationPermissionBanner onOpenSettings={jest.fn()} />);
    expect(screen.getByText('notifications.permissionDeniedTitle').props.accessibilityRole).toBe('header');
  });

  it('masque l’icône décorative aux lecteurs d’écran', () => {
    render(<NotificationPermissionBanner onOpenSettings={jest.fn()} />);
    const icon = screen.getByTestId('banner-icon', { includeHiddenElements: true });
    expect(icon.props.accessibilityElementsHidden).toBe(true);
    expect(icon.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
