/**
 * BottomSheet — tests unitaires.
 */
import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { BottomSheet } from '@/components/bottom-sheet';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ scheme: mockScheme, colors: { surface: '#F7F5F1' } }),
}));

describe('BottomSheet', () => {
  beforeEach(() => {
    mockScheme = 'light';
  });

  it('affiche les enfants et les testIDs dérivés du préfixe', () => {
    const { getByTestId, getByText } = render(
      <BottomSheet visible onDismiss={jest.fn()} testIDPrefix="demo" modalTestID="demo-modal">
        <Text>contenu</Text>
      </BottomSheet>,
    );
    expect(getByText('contenu')).toBeTruthy();
    expect(getByTestId('demo-sheet')).toBeTruthy();
    expect(getByTestId('demo-overlay')).toBeTruthy();
    expect(getByTestId('demo-modal')).toBeTruthy();
  });

  it('utilise colors.surface par défaut et backgroundColor si fourni', () => {
    const { getByTestId, rerender } = render(
      <BottomSheet visible onDismiss={jest.fn()} testIDPrefix="demo"><Text>x</Text></BottomSheet>,
    );
    expect(JSON.stringify(getByTestId('demo-sheet').props.style)).toContain('#F7F5F1');
    rerender(
      <BottomSheet visible onDismiss={jest.fn()} testIDPrefix="demo" backgroundColor="#123456"><Text>x</Text></BottomSheet>,
    );
    expect(JSON.stringify(getByTestId('demo-sheet').props.style)).toContain('#123456');
  });

  it('ferme au tap sur le scrim et sur onRequestClose', () => {
    const onDismiss = jest.fn();
    const { getByTestId, UNSAFE_getByType } = render(
      <BottomSheet visible onDismiss={onDismiss} testIDPrefix="demo"><Text>x</Text></BottomSheet>,
    );
    fireEvent.press(getByTestId('demo-overlay'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    const { Modal } = require('react-native');
    UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('applique le scrim personnalisé', () => {
    const { toJSON } = render(
      <BottomSheet visible onDismiss={jest.fn()} testIDPrefix="demo" scrimColor="rgba(1,2,3,0.5)"><Text>x</Text></BottomSheet>,
    );
    expect(JSON.stringify(toJSON())).toContain('rgba(1,2,3,0.5)');
  });

  it('se masque, se réaffiche, et supporte le mode sombre / active', () => {
    mockScheme = 'dark';
    const { rerender, queryByTestId } = render(
      <BottomSheet visible onDismiss={jest.fn()} testIDPrefix="demo"><Text>x</Text></BottomSheet>,
    );
    rerender(<BottomSheet visible={false} onDismiss={jest.fn()} testIDPrefix="demo"><Text>x</Text></BottomSheet>);
    expect(queryByTestId('demo-sheet')).toBeNull();
    rerender(<BottomSheet visible active={false} onDismiss={jest.fn()} testIDPrefix="demo"><Text>x</Text></BottomSheet>);
    expect(queryByTestId('demo-sheet')).toBeTruthy();
  });
});
