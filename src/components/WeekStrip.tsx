/**
 * WeekStrip — bandeau de selection journaliere de la Home.
 *
 * Ce composant affiche les jours a venir avec :
 * - le libelle jour (`Aujourd'hui` ou jour abrege selon la locale)
 * - la date courte
 * - le meilleur score disponible de la journee si `dayScores` est fourni
 *
 * Il permet la navigation :
 * - au tap sur une tuile jour
 * - au swipe horizontal gauche/droite
 *
 * Props :
 *   selectedDate  string           — date ISO actuellement selectionnee
 *   onSelectDate  (date) => void   — callback de changement de jour
 *   days          number?          — nombre de jours a afficher
 *   dayScores     WeekScores?      — meilleur score journalier par date
 */
import { useRef } from 'react';
import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import type { WeekScores } from '@/hooks/useWeekScores';
import { useLanguage } from '@/contexts/LanguageContext';
import { addDays, getDateParts, getTodayISO } from '@/utils/dateUtils';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WeekStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  days?: number;
  dayScores?: WeekScores;
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

function formatLabel(dateISO: string, offset: number): string {
  if (offset === 0) return i18n.t('home.today');
  const weekdayKey = WEEKDAY_KEYS[getDateParts(dateISO).weekdayIndex];
  return i18n.t(`home.calendar.weekdaysShort.${weekdayKey}`);
}

function formatSubLabel(dateISO: string): string {
  const { day, monthIndex } = getDateParts(dateISO);
  const monthKey = MONTH_KEYS[monthIndex];
  return `${day} ${i18n.t(`home.calendar.monthsShort.${monthKey}`)}`;
}

export function WeekStrip({ selectedDate, onSelectDate, days = 7, dayScores }: WeekStripProps) {
  useLanguage();
  const { colors, scheme } = useTheme();
  const gestureStartX = useRef<number | null>(null);
  const baseDate = getTodayISO();
  const items = Array.from({ length: days }, (_, offset) => {
    const iso = addDays(baseDate, offset);
    return {
      iso,
      label: formatLabel(iso, offset),
      subLabel: formatSubLabel(iso),
      active: iso === selectedDate,
    };
  });
  const activeIndex = Math.max(0, items.findIndex((item) => item.active));
  const activeBg = scheme === 'dark' ? colors.accentSecondary : colors.accent;
  const activeText = scheme === 'dark' ? Colors.dark.background : Colors.light.surface;
  const idleBg = colors.surface;
  const idleBorder = colors.border;
  const idleText = colors.textPrimary;
  const idleSubText = colors.textSecondary;
  function handleSwipe(direction: 'next' | 'previous') {
    const targetIndex = direction === 'next' ? activeIndex + 1 : activeIndex - 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    onSelectDate(items[targetIndex].iso);
  }

  return (
    <View
      style={styles.wrapper}
      testID="week-strip"
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        gestureStartX.current = event.nativeEvent.pageX;
      }}
      onResponderRelease={(event) => {
        if (gestureStartX.current == null) return;
        const deltaX = event.nativeEvent.pageX - gestureStartX.current;
        gestureStartX.current = null;
        if (Math.abs(deltaX) < 24) return;
        handleSwipe(deltaX < 0 ? 'next' : 'previous');
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => {
          const dayScore = dayScores?.[item.iso];
          return (
            <TouchableOpacity
              key={item.iso}
              style={[
                styles.dayPill,
                item.active
                  ? [styles.dayPillActive, { backgroundColor: activeBg, borderColor: activeBg }]
                  : [styles.dayPillIdle, { backgroundColor: idleBg, borderColor: idleBorder }],
              ]}
              onPress={() => onSelectDate(item.iso)}
              activeOpacity={0.85}
            >
              <Text style={[styles.dayLabel, { color: item.active ? activeText : idleText }]}>
                {item.label}
              </Text>
              <Text style={[styles.subLabel, { color: item.active ? activeText : idleSubText }]}>
                {item.subLabel}
              </Text>
              {dayScore ? (
                <Text
                  testID={`day-score-${item.iso}`}
                  style={[styles.dayScore, { color: item.active ? activeText : Colors.score[dayScore.verdict as keyof typeof Colors.score] ?? Colors.score.none }]}
                >
                  {`${dayScore.score}%`}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  dayPill: {
    minWidth: 62,
    borderRadius: Radius.md,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 1,
  },
  dayPillIdle: {
    borderWidth: 1,
  },
  dayPillActive: {
    borderWidth: 1,
  },
  dayLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
  },
  dayScore: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
  },
  subLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    textTransform: 'capitalize',
  },
});
