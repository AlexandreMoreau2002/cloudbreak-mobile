import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from './OfflineBanner';

const mockTrack = jest.fn();
jest.mock('@/services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#F7F5F1',
      border: '#E9E4DA',
      textSecondary: '#5E5E5E',
    },
    typography: {
      fontFamily: { regular: 'JosefinSans_400Regular' },
      fontSize: { xs: 11 },
    },
    spacing: { sm: 8 },
  }),
}));

jest.mock('@/utils/i18n', () => ({
  t: (key: string, opts?: { time?: string }) => {
    if (key === 'home.offlineBanner') {
      return `Données de ${opts?.time} · connexion requise pour actualiser`;
    }
    return key;
  },
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockTrack.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('affiche l\'heure formatée du cache', () => {
    const cachedAt = new Date('2026-03-24T08:38:00Z').getTime();
    render(<OfflineBanner cachedAt={cachedAt} />);

    expect(screen.getByText(/connexion requise pour actualiser/)).toBeTruthy();
  });

  it('track offline_mode_shown au montage avec le nombre exact de minutes écoulées', () => {
    const cachedAt = new Date('2026-03-24T08:38:00Z').getTime();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T09:08:00Z'));

    render(<OfflineBanner cachedAt={cachedAt} />);

    expect(mockTrack).toHaveBeenCalledWith('offline_mode_shown', { cached_minutes_ago: 30 });
  });
});
