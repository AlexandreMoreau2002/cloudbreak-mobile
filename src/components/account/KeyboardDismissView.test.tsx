import { Keyboard, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { KeyboardDismissView } from '@/components/account/KeyboardDismissView';

describe('KeyboardDismissView', () => {
  it('affiche son contenu et ferme le clavier au toucher', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    const { getByText, getByTestId } = render(<KeyboardDismissView testID="screen"><Text>contenu</Text></KeyboardDismissView>);
    expect(getByText('contenu')).toBeTruthy();
    fireEvent.press(getByTestId('screen-dismiss'));
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });
});
