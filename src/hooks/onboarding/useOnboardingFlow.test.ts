import { track } from '@/services/analytics';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { act, renderHook } from '@testing-library/react-native';
import { useOnboardingFlow } from '@/hooks/onboarding/useOnboardingFlow';

jest.mock('@/constants/devConfig', () => ({
  DEBUG: false,
}));

jest.mock('@/services/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: jest.fn(),
}));

const mockTrack = track as jest.Mock;
const mockUseOnboarding = useOnboarding as jest.Mock;

describe('useOnboardingFlow', () => {
  const completeOnboarding = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    completeOnboarding.mockResolvedValue(undefined);
    mockUseOnboarding.mockReturnValue({ completed: false, hydrated: true, completeOnboarding });
  });

  it('starts on splash with the curtain hidden', () => {
    const { result } = renderHook(() => useOnboardingFlow());
    expect(result.current.step).toBe('splash');
    expect(result.current.curtainVisible).toBe(false);
  });

  it('startCurtain shows the curtain without leaving splash', () => {
    const { result } = renderHook(() => useOnboardingFlow());
    act(() => {
      result.current.startCurtain();
    });
    expect(result.current.curtainVisible).toBe(true);
    expect(result.current.step).toBe('splash');
  });

  it('onCurtainSwap moves the step to onb1', () => {
    const { result } = renderHook(() => useOnboardingFlow());
    act(() => {
      result.current.startCurtain();
    });
    act(() => {
      result.current.onCurtainSwap();
    });
    expect(result.current.step).toBe('onb1');
  });

  it('onCurtainDone hides the curtain', () => {
    const { result } = renderHook(() => useOnboardingFlow());
    act(() => {
      result.current.startCurtain();
    });
    act(() => {
      result.current.onCurtainDone();
    });
    expect(result.current.curtainVisible).toBe(false);
  });

  it('goToSummit moves the step to onb2', () => {
    const { result } = renderHook(() => useOnboardingFlow());
    act(() => {
      result.current.goToSummit();
    });
    expect(result.current.step).toBe('onb2');
  });

  it('goToNotifications moves the step to onb3', () => {
    const { result } = renderHook(() => useOnboardingFlow());
    act(() => {
      result.current.goToNotifications();
    });
    expect(result.current.step).toBe('onb3');
  });

  it('goToLocation moves the step to onb4', () => {
    const { result } = renderHook(() => useOnboardingFlow());
    act(() => {
      result.current.goToLocation();
    });
    expect(result.current.step).toBe('onb4');
  });

  it('finish tracks the completion event and calls completeOnboarding', async () => {
    const { result } = renderHook(() => useOnboardingFlow());
    await act(async () => {
      await result.current.finish();
    });
    expect(mockTrack).toHaveBeenCalledWith('onboarding_complete');
    expect(completeOnboarding).toHaveBeenCalledTimes(1);
  });
});
