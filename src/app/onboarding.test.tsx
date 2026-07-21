import OnboardingScreen from './onboarding';
import { useTheme } from '@/contexts/ThemeContext';
import { render } from '@testing-library/react-native';
import { useOnboardingFlow } from '@/hooks/onboarding/useOnboardingFlow';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@/hooks/onboarding/useOnboardingFlow', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('@/components/onboarding/splash-view', () => {
  const { Text } = require('react-native');
  return { SplashView: () => <Text>splash-view</Text> };
});

jest.mock('@/components/onboarding/cloud-curtain', () => {
  const { Text } = require('react-native');
  return { CloudCurtain: () => <Text>cloud-curtain</Text> };
});

jest.mock('@/components/onboarding/summit-slide', () => {
  const { Text } = require('react-native');
  return { SummitSlide: () => <Text>summit-slide</Text> };
});

jest.mock('@/components/onboarding/welcome-slide', () => {
  const { Text } = require('react-native');
  return { WelcomeSlide: () => <Text>welcome-slide</Text> };
});

jest.mock('@/components/onboarding/notifications-slide', () => {
  const { Text } = require('react-native');
  return { NotificationsSlide: () => <Text>notifications-slide</Text> };
});

const mockUseTheme = useTheme as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;

function baseFlow(overrides: Partial<ReturnType<typeof useOnboardingFlow>> = {}) {
  return {
    step: 'splash' as const,
    curtainVisible: false,
    startCurtain: jest.fn(),
    onCurtainSwap: jest.fn(),
    onCurtainDone: jest.fn(),
    goToSummit: jest.fn(),
    goToNotifications: jest.fn(),
    finish: jest.fn(),
    ...overrides,
  };
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({ colors: { background: '#EFE8DC' } });
  });

  it('renders SplashView on step splash', () => {
    mockUseOnboardingFlow.mockReturnValue(baseFlow({ step: 'splash' }));
    const { getByText, queryByText } = render(<OnboardingScreen />);
    expect(getByText('splash-view')).toBeTruthy();
    expect(queryByText('welcome-slide')).toBeNull();
  });

  it('renders WelcomeSlide on step onb1', () => {
    mockUseOnboardingFlow.mockReturnValue(baseFlow({ step: 'onb1' }));
    const { getByText, queryByText } = render(<OnboardingScreen />);
    expect(getByText('welcome-slide')).toBeTruthy();
    expect(queryByText('splash-view')).toBeNull();
  });

  it('renders SummitSlide on step onb2', () => {
    mockUseOnboardingFlow.mockReturnValue(baseFlow({ step: 'onb2' }));
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('summit-slide')).toBeTruthy();
  });

  it('renders NotificationsSlide on step onb3', () => {
    mockUseOnboardingFlow.mockReturnValue(baseFlow({ step: 'onb3' }));
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('notifications-slide')).toBeTruthy();
  });

  it('mounts CloudCurtain on top when curtainVisible is true', () => {
    mockUseOnboardingFlow.mockReturnValue(baseFlow({ step: 'splash', curtainVisible: true }));
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('splash-view')).toBeTruthy();
    expect(getByText('cloud-curtain')).toBeTruthy();
  });

  it('does not mount CloudCurtain when curtainVisible is false', () => {
    mockUseOnboardingFlow.mockReturnValue(baseFlow({ step: 'splash', curtainVisible: false }));
    const { queryByText } = render(<OnboardingScreen />);
    expect(queryByText('cloud-curtain')).toBeNull();
  });
});
