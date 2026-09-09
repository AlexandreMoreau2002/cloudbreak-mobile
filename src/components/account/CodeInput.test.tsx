import { render, fireEvent } from '@testing-library/react-native';
import { CodeInput } from '@/components/account/CodeInput';
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { textPrimary: '#111', surface: '#fff', accent: '#b28c6e', border: '#ddd' }, typography: { fontFamily: { semiBold: 'System' } } }) }));

describe('CodeInput', () => {
  it('fills six digits and truncates pasted codes after the sixth slot', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<CodeInput value="" onChange={onChange} />);
    fireEvent.changeText(getByTestId('code-input-0'), '1234567');
    expect(onChange).toHaveBeenLastCalledWith('123456');
    expect(getByTestId('code-input-5').props.value).toBe('6');
    expect(getByTestId('code-input-0').props.maxLength).toBe(6);
    expect(() => getByTestId('code-input-6')).toThrow();
  });

  it('keeps a hole when backspace clears a filled cell', () => {
    const onChange = jest.fn();
    const { getByTestId, rerender } = render(<CodeInput value="123456" onChange={onChange} />);

    fireEvent.changeText(getByTestId('code-input-2'), '');
    expect(onChange).toHaveBeenLastCalledWith('12456');
    rerender(<CodeInput value="12456" onChange={onChange} />);
    fireEvent.changeText(getByTestId('code-input-2'), '9');

    expect(onChange).toHaveBeenLastCalledWith('129456');
  });

  it('handles native arrow keys and moves back on an empty cell', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<CodeInput value="123" onChange={onChange} />);

    fireEvent(getByTestId('code-input-2'), 'keyPress', { nativeEvent: { key: 'ArrowLeft' } });
    fireEvent(getByTestId('code-input-1'), 'keyPress', { nativeEvent: { key: 'ArrowRight' } });
    fireEvent(getByTestId('code-input-3'), 'keyPress', { nativeEvent: { key: 'Backspace' } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
