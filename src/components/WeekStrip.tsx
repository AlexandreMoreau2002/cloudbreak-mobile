import { useRef } from 'react';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import type { WeekScores } from '@/hooks/useWeekScores';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WeekStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  days?: number;
  dayScores?: WeekScores;
}

const WEEKDAY_SHORT_FR = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'] as const;
const MONTH_SHORT_FR = ['Jan.', 'Fév.', 'Mar.', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sep.', 'Oct.', 'Nov.', 'Déc.'] as const;

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseISODate(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateISO: string, offset: number): string {
  const date = parseISODate(dateISO);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function getDateParts(dateISO: string): { weekdayIndex: number; day: number; monthIndex: number } {
  const date = parseISODate(dateISO);
  return {
    weekdayIndex: date.getUTCDay(),
    day: date.getUTCDate(),
    monthIndex: date.getUTCMonth(),
  };
}

function formatLabel(dateISO: string, offset: number): string {
  if (offset === 0) return "Aujourd'hui";
  return WEEKDAY_SHORT_FR[getDateParts(dateISO).weekdayIndex];
}

function formatSubLabel(dateISO: string): string {
  const { day, monthIndex } = getDateParts(dateISO);
  return `${day} ${MONTH_SHORT_FR[monthIndex]}`;
}

export function WeekStrip({ selectedDate, onSelectDate, days = 7, dayScores }: WeekStripProps) {
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
  const activeDot = scheme === 'dark' ? Colors.dark.background + '66' : Colors.light.surface + '99';

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
              {dayScore ? (
                <Text
                  testID={`day-score-${item.iso}`}
                  style={[styles.dayScore, { color: item.active ? activeText : Colors.score[dayScore.verdict as keyof typeof Colors.score] ?? Colors.score.none }]}
                >
                  {`${dayScore.score}%`}
                </Text>
              ) : null}
              {dayScore ? (
                <View
                  testID={`day-dot-${item.iso}`}
                  style={[styles.dot, { backgroundColor: item.active ? activeDot : Colors.score[dayScore.verdict as keyof typeof Colors.score] ?? Colors.score.none }]}
                />
              ) : null}
              <Text style={[styles.subLabel, { color: item.active ? activeText : idleSubText }]}>
                {item.subLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  dayPill: {
    minWidth: 74,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  dayPillIdle: {
    borderWidth: 1,
  },
  dayPillActive: {
    borderWidth: 1,
  },
  dayLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  dayScore: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  subLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    textTransform: 'capitalize',
  },
});
