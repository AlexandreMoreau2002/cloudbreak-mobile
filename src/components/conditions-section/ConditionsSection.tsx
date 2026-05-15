import i18n from '@/utils/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { ScoreResponse } from '@/services/mockData/types';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ConditionsSectionProps {
  score: ScoreResponse;
}

export function ConditionsSection({ score }: ConditionsSectionProps) {
  const { colors, typography } = useTheme();

  const conditions = score.conditions;
  if (!conditions) return null;

  const humidityVal = conditions.humidity != null
    ? `${Math.round(conditions.humidity)}%`
    : (conditions.humidity_pct != null ? `${Math.round(conditions.humidity_pct)}%` : 'N/A');

  const windVal = conditions.wind_speed != null
    ? `${Math.round(conditions.wind_speed)} km/h`
    : (conditions.wind_speed_kmh != null ? `${Math.round(conditions.wind_speed_kmh)} km/h` : 'N/A');

  const inversionPresent = conditions.inversion_present ?? conditions.inversion_detected ?? null;
  const inversionVal = inversionPresent === true ? 'Oui' : inversionPresent === false ? 'Non' : 'N/A';

  const alertLabel = i18n.t('home.alertCtaTitle');
  const alertSubtitle = i18n.t('home.alertCtaSubtitle');
  const showAlertCta = score.verdict === 'high' || score.verdict === 'medium';

  return (
    <View style={styles.conditionsSection}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
        {i18n.t('home.conditionsTitle').toUpperCase()}
      </Text>

      <View style={styles.widgetsRow}>
        <View style={[styles.widget, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.widgetLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
            {i18n.t('home.humidity').toUpperCase()}
          </Text>
          <Text style={[styles.widgetValue, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
            {humidityVal}
          </Text>
        </View>
        <View style={[styles.widget, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.widgetLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
            {i18n.t('home.wind').toUpperCase()}
          </Text>
          <Text style={[styles.widgetValue, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
            {windVal}
          </Text>
        </View>
        <View style={[styles.widget, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.widgetLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
            {i18n.t('home.inversion').toUpperCase()}
          </Text>
          <Text style={[styles.widgetValue, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
            {inversionVal}
          </Text>
        </View>
      </View>

      {showAlertCta ? (
        <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.alertCopy}>
            <View style={styles.alertTitleRow}>
              <Ionicons name="notifications-outline" size={18} color={colors.accent} />
              <Text style={[styles.alertTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
                {alertLabel}
              </Text>
            </View>
            <Text style={[styles.alertSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }]}>
              {alertSubtitle}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.alertButton, { backgroundColor: colors.accent }]}
            activeOpacity={0.82}
            onPress={() => Alert.alert(alertLabel, alertSubtitle)}
          >
            <Text style={[styles.alertButtonText, { color: colors.surface, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
              {i18n.t('home.alertCtaButton').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  conditionsSection: {
    gap: 12,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  widgetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  widget: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 6,
    alignItems: 'center',
  },
  widgetLabel: {
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  widgetValue: {
    textAlign: 'center',
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {},
  alertSubtitle: {
    lineHeight: 16,
  },
  alertButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  alertButtonText: {
    letterSpacing: 1,
  },
});
