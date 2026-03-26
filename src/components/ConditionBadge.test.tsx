import React from 'react';
import { ConditionBadge } from '@/components/ConditionBadge';
import { render, screen } from '@testing-library/react-native';

describe('ConditionBadge', () => {
  it('affiche le label et la valeur', () => {
    render(<ConditionBadge label="Vent" value="12 km/h" />);
    expect(screen.getByText('Vent')).toBeTruthy();
    expect(screen.getByText('12 km/h')).toBeTruthy();
  });
});
