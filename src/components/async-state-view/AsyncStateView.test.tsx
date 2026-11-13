import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AsyncStateView } from './AsyncStateView';

jest.mock('@/components/loading-spinner', () => ({
  LoadingSpinner: function MockLoadingSpinner() { return null; },
}));

const emptyComponent = <Text>Vide</Text>;
const errorComponent = <Text>Erreur</Text>;
const children = <Text>Contenu</Text>;

describe('AsyncStateView', () => {
  it('affiche loadingComponent par défaut quand isLoading=true (masque children)', () => {
    const { queryByText } = render(
      <AsyncStateView isLoading isEmpty={false} emptyComponent={emptyComponent}>
        {children}
      </AsyncStateView>,
    );
    expect(queryByText('Contenu')).toBeNull();
    expect(queryByText('Vide')).toBeNull();
  });

  it('affiche loadingComponent personnalisé quand fourni', () => {
    const custom = <Text>CustomSpinner</Text>;
    const { getByText } = render(
      <AsyncStateView isLoading isEmpty={false} loadingComponent={custom} emptyComponent={emptyComponent}>
        {children}
      </AsyncStateView>,
    );
    expect(getByText('CustomSpinner')).toBeTruthy();
  });

  it('affiche errorComponent quand error est défini', () => {
    const { getByText } = render(
      <AsyncStateView isLoading={false} isEmpty={false} error="réseau" errorComponent={errorComponent} emptyComponent={emptyComponent}>
        {children}
      </AsyncStateView>,
    );
    expect(getByText('Erreur')).toBeTruthy();
  });

  it('affiche emptyComponent quand isEmpty=true', () => {
    const { getByText } = render(
      <AsyncStateView isLoading={false} isEmpty emptyComponent={emptyComponent}>
        {children}
      </AsyncStateView>,
    );
    expect(getByText('Vide')).toBeTruthy();
  });

  it('affiche children quand tout est OK', () => {
    const { getByText } = render(
      <AsyncStateView isLoading={false} isEmpty={false} emptyComponent={emptyComponent}>
        {children}
      </AsyncStateView>,
    );
    expect(getByText('Contenu')).toBeTruthy();
  });

  it('isLoading prime sur error (masque errorComponent)', () => {
    const { queryByText } = render(
      <AsyncStateView isLoading isEmpty={false} error="réseau" errorComponent={errorComponent} emptyComponent={emptyComponent}>
        {children}
      </AsyncStateView>,
    );
    expect(queryByText('Erreur')).toBeNull();
    expect(queryByText('Contenu')).toBeNull();
  });

  it('error prime sur isEmpty', () => {
    const { getByText } = render(
      <AsyncStateView isLoading={false} isEmpty error="réseau" errorComponent={errorComponent} emptyComponent={emptyComponent}>
        {children}
      </AsyncStateView>,
    );
    expect(getByText('Erreur')).toBeTruthy();
  });

  it('retourne null quand error sans errorComponent', () => {
    const { queryByText } = render(
      <AsyncStateView isLoading={false} isEmpty={false} error="réseau" emptyComponent={emptyComponent}>
        {children}
      </AsyncStateView>,
    );
    expect(queryByText('Contenu')).toBeNull();
  });
});
