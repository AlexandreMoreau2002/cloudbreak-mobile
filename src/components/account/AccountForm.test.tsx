import { render, fireEvent } from '@testing-library/react-native';
import { AccountForm } from '@/components/account/AccountForm';
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { textPrimary: '#111', textSecondary: '#555', surface: '#fff', border: '#ddd', accent: '#b28c6e', textDisabled: '#aaa' }, typography: { fontFamily: { regular: 'System', semiBold: 'System' } }, radius: { sm: 8 }, spacing: { sm: 8 } }) }));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('AccountForm', () => {
  it('switches mode and submits the selected mode', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<AccountForm mode="creation" loading={false} onSubmit={onSubmit} onApple={jest.fn()} onModeChange={jest.fn()} />);
    fireEvent.changeText(getByTestId('account-email'), 'a@b.com');
    fireEvent.changeText(getByTestId('account-password'), 'Password1!');
    fireEvent.press(getByTestId('account-submit'));
    expect(onSubmit).toHaveBeenCalledWith('a@b.com', 'Password1!');
  });
});
