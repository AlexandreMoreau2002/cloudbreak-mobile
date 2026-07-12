import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { useAuthForm } from '@/hooks/useAuthForm';

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockDevConfigState = { SIMULATE_DELAY_MS: 0 };

jest.mock('@/constants/devConfig', () => ({
  get SIMULATE_DELAY_MS() { return mockDevConfigState.SIMULATE_DELAY_MS; },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn, signUp: mockSignUp }),
}));

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'fr', toggleLocale: jest.fn() }),
}));

describe('useAuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevConfigState.SIMULATE_DELAY_MS = 0;
  });

  it('démarre en mode login', () => {
    const { result } = renderHook(() => useAuthForm());
    expect(result.current.mode).toBe('login');
    expect(result.current.loading).toBe(false);
  });

  it('toggleMode bascule entre login et signup', () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('signup');
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('login');
  });

  it('handleSubmit avec champs vides affiche une alerte', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { result } = renderHook(() => useAuthForm());

    await act(async () => { await result.current.handleSubmit(); });

    expect(alertSpy).toHaveBeenCalledWith('auth.error', 'auth.emptyFields');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('handleSubmit appelle signIn en mode login', async () => {
    mockSignIn.mockResolvedValue(null);
    const { result } = renderHook(() => useAuthForm());

    act(() => { result.current.setEmail('test@test.com'); });
    act(() => { result.current.setPassword('password123'); });
    await act(async () => { await result.current.handleSubmit(); });

    expect(mockSignIn).toHaveBeenCalledWith('test@test.com', 'password123');
  });

  it('handleSubmit appelle signUp en mode signup', async () => {
    mockSignUp.mockResolvedValue(null);
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.toggleMode();
      result.current.setEmail('test@test.com');
      result.current.setPassword('password123');
    });
    await act(async () => { await result.current.handleSubmit(); });

    expect(mockSignUp).toHaveBeenCalledWith('test@test.com', 'password123');
  });

  it('handleSubmit affiche l\'erreur retournée par signIn', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockSignIn.mockResolvedValue({ message: 'Invalid credentials' });
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('test@test.com');
      result.current.setPassword('password123');
    });
    await act(async () => { await result.current.handleSubmit(); });

    expect(alertSpy).toHaveBeenCalledWith('auth.error', 'Invalid credentials');
  });

  it('handleSubmit attend SIMULATE_DELAY_MS avant de couper le loading', async () => {
    jest.useFakeTimers();
    mockDevConfigState.SIMULATE_DELAY_MS = 2000;
    mockSignIn.mockResolvedValue(null);
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('test@test.com');
      result.current.setPassword('password123');
    });

    let submitPromise!: Promise<void>;
    act(() => { submitPromise = result.current.handleSubmit(); });

    expect(result.current.loading).toBe(true);
    await act(async () => { await jest.runAllTimersAsync(); });
    await act(async () => { await submitPromise; });

    expect(result.current.loading).toBe(false);
    jest.useRealTimers();
  });
});
