import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { themedStyles } from '../../theme/brand';
import { resultsApi, type SeasonOption } from '../../services/api';

/**
 * Chips to look back season by season ("2025/26", "2024/25" … "All time").
 * Starts on the current season and tells the parent which one is chosen.
 */
export default function SeasonPicker({ value, onChange, allowAll = true, refreshKey = 0 }: {
  value: string | null;
  onChange: (seasonId: string, option: SeasonOption | null) => void;
  allowAll?: boolean;
  /** Change it to reload the list (e.g. after adding a result from a new season) */
  refreshKey?: number;
}) {
  const styles = useStyles();
  const [options, setOptions] = useState<SeasonOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    resultsApi.seasons()
      .then((res) => {
        if (cancelled) return;
        setOptions(res.data);
        if (!value) {
          const current = res.data.find((o) => o.current) ?? res.data[0];
          if (current) onChange(current.id, current);
          else if (allowAll) onChange('all', null);
        }
      })
      .catch(() => {
        if (!cancelled && !value && allowAll) onChange('all', null);
      });
    return () => { cancelled = true; };
    // Reload only when asked; the parent owns the chosen value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (!options.length) return null;
  const chips: Array<{ id: string; label: string; option: SeasonOption | null }> = [
    ...options.map((o) => ({ id: o.id, label: o.current ? `${o.label} (now)` : o.label, option: o })),
    ...(allowAll ? [{ id: 'all', label: 'All time', option: null }] : []),
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {chips.map((c) => {
        const on = value === c.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id, c.option)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Season ${c.label}`}
            style={[styles.chip, on ? styles.chipOn : null]}
          >
            <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { color: c.text, fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: c.onPrimary },
}));
