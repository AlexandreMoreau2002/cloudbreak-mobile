import { render, fireEvent, configure } from '@testing-library/react-native';
import i18n from '@/utils/i18n';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useOnboardingPeaks } from '@/hooks/onboarding/useOnboardingPeaks';
import { SummitSlide } from '@/components/onboarding/summit-slide/SummitSlide';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/hooks/onboarding/useOnboardingPeaks');
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
jest.mock('@/contexts/SelectedPeakContext', () => ({
  useSelectedPeak: jest.fn(),
}));

// Le fil d'Ariane (MascotBreadcrumb) est masqué de l'accessibilité — inclure les
// éléments cachés pour pouvoir l'interroger.
configure({ defaultIncludeHiddenElements: true });

const mockUseOnboardingPeaks = useOnboardingPeaks as jest.Mock;
const mockUseSelectedPeak = useSelectedPeak as jest.Mock;

const PEAKS = [
  { id: '1', name: 'Mont Aiguille', slug: 'mont-aiguille', lat: 1, lng: 1, altitude: 2087, region: 'Vercors' },
  { id: '2', name: 'Grand Veymont', slug: 'grand-veymont', lat: 1, lng: 1, altitude: 2341, region: 'Vercors' },
  { id: '3', name: 'Dent de Crolles', slug: 'dent-de-crolles', lat: 1, lng: 1, altitude: 2062, region: 'Chartreuse' },
  { id: '4', name: 'Pic du Midi de Bigorre', slug: 'pic-du-midi-de-bigorre', lat: 1, lng: 1, altitude: 2877, region: 'Pyrénées' },
  { id: '5', name: 'Puy de Dôme', slug: 'puy-de-dome', lat: 1, lng: 1, altitude: 1464, region: 'Auvergne' },
  { id: '6', name: 'Chamechaude', slug: 'chamechaude', lat: 1, lng: 1, altitude: 2082, region: 'Chartreuse' },
];

const RESULTS = [
  { id: '7', name: 'Mont Blanc', slug: 'mont-blanc', lat: 1, lng: 1, altitude: 4808, region: 'Alpes' },
];

function setup({
  curated = { status: 'success', data: PEAKS },
  results = { status: 'idle' },
  query = '',
}: {
  curated?: unknown;
  results?: unknown;
  query?: string;
} = {}) {
  const setQuery = jest.fn();
  const retry = jest.fn();
  mockUseOnboardingPeaks.mockReturnValue({ curated, results, query, setQuery, retry });
  const setSelectedPeak = jest.fn();
  mockUseSelectedPeak.mockReturnValue({ setSelectedPeak });
  return { setQuery, setSelectedPeak, retry };
}

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SummitSlide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the 6 curated peaks on success', () => {
    setup();
    const { getByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    PEAKS.forEach((peak) => {
      expect(getByTestId(`summit-row-${peak.slug}`)).toBeTruthy();
    });
  });

  it('selects a peak on tap then commits it via CTA', () => {
    const { setSelectedPeak } = setup();
    const onContinue = jest.fn();
    const { getByTestId } = renderWithTheme(<SummitSlide onContinue={onContinue} />);

    fireEvent.press(getByTestId('summit-row-grand-veymont'));
    fireEvent.press(getByTestId('summit-continue'));

    expect(setSelectedPeak).toHaveBeenCalledWith(PEAKS[1]);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('tracks onboarding_step_viewed with step 2 on mount', () => {
    const { track } = jest.requireMock('@/services/analytics');
    setup();
    renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(track).toHaveBeenCalledWith('onboarding_step_viewed', { step: 2 });
  });

  it('tracks peak_selected with source onboarding when committing a selection', () => {
    const { track } = jest.requireMock('@/services/analytics');
    setup();
    const { getByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);

    fireEvent.press(getByTestId('summit-row-grand-veymont'));
    fireEvent.press(getByTestId('summit-continue'));

    expect(track).toHaveBeenCalledWith('peak_selected', { peak_id: PEAKS[1].id, source: 'onboarding' });
  });

  it.each(['', 'bl'])('shows a retry instead of deceptive rows on error (%s)', (query) => {
    const { retry, setSelectedPeak } = setup({ query, curated: { status: 'error', error: 'offline' }, results: { status: 'error', error: 'offline' } });
    const onContinue = jest.fn();
    const { getByTestId, queryByTestId } = renderWithTheme(<SummitSlide onContinue={onContinue} />);
    expect(queryByTestId('summit-row-mont-aiguille')).toBeNull();
    fireEvent.press(getByTestId('summit-retry'));
    expect(retry).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('summit-continue'));
    expect(setSelectedPeak).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('does not present curated peaks when an active search fails', () => {
    setup({ query: 'bl', results: { status: 'error', error: 'offline' } });
    const { getByTestId, queryByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(queryByTestId('summit-row-mont-aiguille')).toBeNull();
    expect(getByTestId('summit-retry')).toBeTruthy();
  });

  it('shows an empty state for a search with no matches', () => {
    setup({ query: 'zz', results: { status: 'success', data: [] } });
    const { getByText } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(getByText(i18n.t('onboarding.peaksEmpty'))).toBeTruthy();
  });

  it('lets a result receive the first tap with the keyboard open', () => {
    setup();
    const { getByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(getByTestId('summit-list-scroll').props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('shows search results instead of curated when query has 2+ chars', () => {
    setup({ query: 'bl', results: { status: 'success', data: RESULTS } });
    const { getByTestId, queryByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);

    expect(getByTestId('summit-row-mont-blanc')).toBeTruthy();
    expect(queryByTestId('summit-row-mont-aiguille')).toBeNull();
  });

  it('shows skeletons while curated is loading', () => {
    setup({ curated: { status: 'loading' } });
    const { getAllByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(getAllByTestId('summit-skeleton-row').length).toBeGreaterThan(0);
  });

  it('continues without selecting any peak', () => {
    const { setSelectedPeak } = setup();
    const onContinue = jest.fn();
    const { getByTestId } = renderWithTheme(<SummitSlide onContinue={onContinue} />);

    fireEvent.press(getByTestId('summit-continue'));

    expect(setSelectedPeak).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('shows skeletons while a search request is in flight, not the stale curated list', () => {
    setup({ query: 'mo', results: { status: 'loading' } });
    const { getAllByTestId, queryByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(getAllByTestId('summit-skeleton-row').length).toBeGreaterThan(0);
    expect(queryByTestId('summit-row-mont-aiguille')).toBeNull();
  });

  it('discards the search selection when the query is cleared back to curated', () => {
    const setSelectedPeak = jest.fn();
    mockUseSelectedPeak.mockReturnValue({ setSelectedPeak });
    const setQuery = jest.fn();
    mockUseOnboardingPeaks.mockReturnValue({
      curated: { status: 'success', data: PEAKS },
      results: { status: 'success', data: RESULTS },
      query: 'bl',
      setQuery,
    });
    const onContinue = jest.fn();
    const { getByTestId, queryByTestId, rerender } = renderWithTheme(<SummitSlide onContinue={onContinue} />);

    fireEvent.press(getByTestId('summit-row-mont-blanc'));
    expect(getByTestId('summit-row-mont-blanc-selected')).toBeTruthy();

    // Query cleared back to curated (< 2 chars) — the previously selected search
    // result no longer belongs to the displayed list, so no row should read as selected.
    mockUseOnboardingPeaks.mockReturnValue({
      curated: { status: 'success', data: PEAKS },
      results: { status: 'idle' },
      query: '',
      setQuery,
    });
    rerender(
      <ThemeProvider>
        <SummitSlide onContinue={onContinue} />
      </ThemeProvider>,
    );

    expect(queryByTestId('summit-row-mont-aiguille-selected')).toBeNull();

    fireEvent.press(getByTestId('summit-continue'));
    expect(setSelectedPeak).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders no rows when curated has no usable state (idle, not searching)', () => {
    setup({ curated: { status: 'idle' } });
    const { queryByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(queryByTestId('summit-static-list')).toBeNull();
    expect(queryByTestId('summit-skeleton-row')).toBeNull();
    PEAKS.forEach((peak) => {
      expect(queryByTestId(`summit-row-${peak.slug}`)).toBeNull();
    });
  });

  it('falls back to CURATED_PEAKS.range when the API peak has no region', () => {
    const peakWithoutRegion = { ...PEAKS[0], region: undefined };
    setup({ curated: { status: 'success', data: [peakWithoutRegion] } });
    const { getByText } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(getByText('Vercors · 2087 m')).toBeTruthy();
  });

  it('uses an empty range label when a non-curated API peak has no region', () => {
    const peakWithoutRegion = { ...PEAKS[0], slug: 'outside-curated-list', region: undefined };
    setup({ curated: { status: 'success', data: [peakWithoutRegion] } });
    const { getByText } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(getByText(' · 2087 m')).toBeTruthy();
  });

  it('renders the localized title', () => {
    setup();
    const { getByText } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    expect(getByText(i18n.t('onboarding.step2Title'))).toBeTruthy();
  });

  it('hides the scroll fade when the list content fits without scrolling', () => {
    setup();
    const { getByTestId, queryByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    fireEvent(getByTestId('summit-list-area'), 'layout', {
      nativeEvent: { layout: { height: 600 } },
    });
    fireEvent(getByTestId('summit-list-scroll'), 'contentSizeChange', 400, 400);
    expect(queryByTestId('summit-list-fade')).toBeNull();
  });

  it('shows the scroll fade when the list content overflows the visible area', () => {
    setup();
    const { getByTestId, queryByTestId } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
    fireEvent(getByTestId('summit-list-area'), 'layout', {
      nativeEvent: { layout: { height: 300 } },
    });
    fireEvent(getByTestId('summit-list-scroll'), 'contentSizeChange', 400, 500);
    expect(queryByTestId('summit-list-fade')).toBeTruthy();
  });
});

 it.each([true, false])('renders the eyebrow only in development (%s)', (dev) => {
   const previous = __DEV__;
   Object.defineProperty(globalThis, '__DEV__', { value: dev, configurable: true, writable: true });
   try {
     setup();
     const { queryByText } = renderWithTheme(<SummitSlide onContinue={() => {}} />);
     expect(Boolean(queryByText(i18n.t('onboarding.step2Eyebrow')))).toBe(dev);
   } finally {
     Object.defineProperty(globalThis, '__DEV__', { value: previous, configurable: true, writable: true });
   }
 });
