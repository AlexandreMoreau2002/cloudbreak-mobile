import { Alert } from 'react-native';
import { useAuthForm } from '@/hooks/useAuthForm';
import { renderHook, act } from '@testing-library/react-native';

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn, signUp: mockSignUp }),
}));

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

describe('useAuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
