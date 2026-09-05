import { render, fireEvent } from '@testing-library/react-native';
import { CodeInput } from '@/components/account/CodeInput';
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { textPrimary: '#111', surface: '#fff', accent: '#b28c6e', border: '#ddd' }, typography: { fontFamily: { semiBold: 'System' } } }) }));

describe('CodeInput', () => {
  it('fills six digits and supports pasted codes', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<CodeInput value="" onChange={onChange} />);
    fireEvent.changeText(getByTestId('code-input-0'), '123456');
    expect(onChange).toHaveBeenLastCalledWith('123456');
  });
});
