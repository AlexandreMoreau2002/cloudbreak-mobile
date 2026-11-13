import { Redirect, type Href } from 'expo-router';

const TABS_ROUTE = '/(tabs)' as Href;

export default function Index() {
  return <Redirect href={TABS_ROUTE} />;
}
