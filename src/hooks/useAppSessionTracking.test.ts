import { AppState } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { track } from '@/services/analytics';
import { useAppSessionTracking } from '@/hooks/useAppSessionTracking';

jest.mock('@/services/analytics', () => ({
  track: jest.fn(),
}));

const mockTrack = track as jest.Mock;

function getListener(): (status: string) => void {
  const call = (AppState.addEventListener as jest.Mock).mock.calls.find(
    ([event]) => event === 'change',
  );
  if (!call) throw new Error('AppState listener not registered');
  return call[1];
}

describe('useAppSessionTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-21T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tracks app_foregrounded on mount', () => {
    renderHook(() => useAppSessionTracking());
    expect(mockTrack).toHaveBeenCalledWith('app_foregrounded');
  });

  it('tracks app_backgrounded with session_duration_ms on background transition', () => {
    renderHook(() => useAppSessionTracking());
    const listener = getListener();

    jest.setSystemTime(new Date('2026-07-21T10:05:00Z')); // +5min
    listener('background');

    expect(mockTrack).toHaveBeenCalledWith('app_backgrounded', { session_duration_ms: 300000 });
  });

  it('tracks a new app_foregrounded when returning from background', () => {
    renderHook(() => useAppSessionTracking());
    const listener = getListener();

    listener('background');
    mockTrack.mockClear();
    listener('active');

    expect(mockTrack).toHaveBeenCalledWith('app_foregrounded');
  });

  it('ignores transitions that are not active/background (e.g. inactive)', () => {
    renderHook(() => useAppSessionTracking());
    const listener = getListener();
    mockTrack.mockClear();

    listener('inactive');

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    const remove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValueOnce({ remove });
    const { unmount } = renderHook(() => useAppSessionTracking());
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
