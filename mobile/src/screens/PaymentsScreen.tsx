// src/screens/PaymentsScreen.tsx - Premium redesign
import React from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radii, fonts } from '../theme';
import { Card, SectionHeader, CTA } from '../components/ui';

// Mock data - replace with real API calls
const MOCK = {
  collected: 600,
  expected: 750,
  playersPaid: 4,
  totalPlayers: 5,
  people: [
    { name: 'James Mitchell', amount: 150, status: 'paid' as const },
    { name: 'Luke Harrison', amount: 150, status: 'paid' as const },
    { name: 'Tom Davies', amount: 150, status: 'paid' as const },
    { name: 'Alex Turner', amount: 150, status: 'paid' as const },
    { name: 'Charlie Smith', amount: 150, status: 'due' as const },
  ],
};

const PAYMENT_PORTAL_URL = 'https://example.com/payments/syston-tigers';

export default function PaymentsScreen() {
  const pct = Math.min(1, MOCK.collected / MOCK.expected);

  const openPaymentPortal = () => {
    Linking.openURL(PAYMENT_PORTAL_URL);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <SectionHeader title="Payments" subtitle="Season fees & sponsors" />

        {/* Summary Card */}
        <Card inset>
          <SectionHeader title="Season Fees 2024/25" />
          <View style={styles.metricsRow}>
            <Metric label="Collected" value={`£${MOCK.collected}`} tone="good" />
            <Metric label="Expected" value={`£${MOCK.expected}`} />
            <Metric label="Players Paid" value={`${MOCK.playersPaid}/${MOCK.totalPlayers}`} />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(pct * 100)}% complete</Text>

          <CTA label="Pay Season Fees" onPress={openPaymentPortal} />
        </Card>

        {/* Individual Status */}
        <View style={{ height: spacing(2) }} />
        <SectionHeader
          title="Individual Status"
          subtitle="Read-only · Contact treasurer to update"
        />
        <Card inset>
          <FlatList
            data={MOCK.people}
            keyExtractor={(x) => x.name}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => <PersonRow {...item} />}
            scrollEnabled={false}
          />
        </Card>

        {/* Payment Info */}
        <View style={{ height: spacing(2) }} />
        <Card inset>
          <Text style={styles.infoTitle}>Payment Information</Text>
          <Text style={styles.infoText}>
            • Season fees: £150 per player{'\n'}
            • Payment deadline: 1st October 2025{'\n'}
            • Late payments subject to £10 admin fee{'\n'}
            • Financial assistance available
          </Text>
        </Card>

        {/* Sponsors Section (Placeholder) */}
        <View style={{ height: spacing(2) }} />
        <SectionHeader title="Sponsors" subtitle="Supporting our team" />
        <Card inset>
          <Text style={styles.placeholderText}>
            No sponsors yet — coming soon
          </Text>
        </Card>

        {/* Bottom spacing */}
        <View style={{ height: spacing(3) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ==== Sub-Components ==== */

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const color =
    tone === 'good'
      ? colors.brand.success
      : tone === 'warn'
      ? colors.brand.warning
      : colors.text;

  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PersonRow({
  name,
  amount,
  status,
}: {
  name: string;
  amount: number;
  status: 'paid' | 'due';
}) {
  const chipColor = status === 'paid' ? colors.brand.success : colors.brand.warning;
  const chipText = status === 'paid' ? 'Paid' : 'Due';

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.personName}>{name}</Text>
        <Text style={styles.personSub}>Season Fee</Text>
      </View>
      <Text style={styles.amount}>{`£${amount}`}</Text>
      <View style={[styles.chip, { backgroundColor: chipColor + '22', borderColor: chipColor }]}>
        <Text style={[styles.chipText, { color: chipColor }]}>{chipText}</Text>
      </View>
    </View>
  );
}

/* ==== Styles ==== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollView: { flex: 1 },
  container: { padding: spacing(2) },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  metric: { flex: 1 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { color: colors.textDim, marginTop: 2, fontSize: fonts.sizes.xs },

  progressTrack: {
    height: 10,
    backgroundColor: '#252931',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.yellow,
  },
  progressText: {
    color: colors.textDim,
    marginTop: spacing(1),
    fontSize: 12,
  },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing(1),
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1),
  },
  personName: { color: colors.text, fontWeight: '700' },
  personSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  amount: {
    color: colors.text,
    fontWeight: '700',
    marginRight: spacing(1),
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontWeight: '700',
    fontSize: fonts.sizes.xs,
  },

  infoTitle: {
    color: colors.text,
    fontSize: fonts.sizes.lg,
    fontWeight: '700',
    marginBottom: spacing(1),
  },
  infoText: {
    color: colors.textDim,
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
  },

  placeholderText: {
    color: colors.textDim,
    fontSize: fonts.sizes.md,
    textAlign: 'center',
    paddingVertical: spacing(2),
  },
});
