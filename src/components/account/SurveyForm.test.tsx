import { render, fireEvent } from '@testing-library/react-native';
import { SurveyForm } from '@/components/account/SurveyForm';
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { textPrimary: '#111', textSecondary: '#555', surface: '#fff', border: '#ddd', accent: '#b28c6e' }, typography: { fontFamily: { bold: 'System' } } }) }));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('SurveyForm', () => {
  it('selects answers and submits newsletter opt-in', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<SurveyForm onSubmit={onSubmit} />);
    fireEvent.press(getByTestId('survey-acquisition-appstore'));
    fireEvent.press(getByTestId('survey-newsletter'));
    fireEvent.press(getByTestId('survey-submit'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ acquisitionSource: 'appstore', newsletterOptIn: true }));
  });
});
