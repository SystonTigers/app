// src/screens/PaymentsScreen.tsx - Premium redesign
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';

import { COLORS } from '../config';
import { duesApi } from '../services/api';

const PAYMENT_PORTAL_URL = 'https://example.com/payments/syston-tigers';

export default function PaymentsScreen() {
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const result = await duesApi.listRequests();
      const requests = result?.data || [];
      // Aggregate from the first active request (or all)
      if (requests.length > 0) {
        const req = requests[0]; // Most recent payment request
        const people = (req.members || req.people || []).map((m: any) => ({
          name: m.name || m.playerName || 'Unknown',
          amount: m.amount || req.amount || 0,
          status: m.paid ? 'paid' as const : 'due' as const,
        }));
        const paid = people.filter((p: any) => p.status === 'paid');
        setPaymentData({
          collected: paid.reduce((s: number, p: any) => s + p.amount, 0),
          expected: people.reduce((s: number, p: any) => s + p.amount, 0),
          playersPaid: paid.length,
          totalPlayers: people.length,
          people,
        });
      } else {
        setPaymentData({ collected: 0, expected: 0, playersPaid: 0, totalPlayers: 0, people: [] });
      }
    } catch (err) {
      console.error('Error loading payments:', err);
      setPaymentData({ collected: 0, expected: 0, playersPaid: 0, totalPlayers: 0, people: [] });
    } finally {
      setLoading(false);
    }
  };

  const pct = paymentData ? Math.min(1, paymentData.expected > 0 ? paymentData.collected / paymentData.expected : 0) : 0;

  const openPaymentPortal = () => {
    Linking.openURL(PAYMENT_PORTAL_URL);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <Text style={styles.header}>Payments</Text>
        <Text style={styles.subtitle}>Season fees & sponsors</Text>

        {/* Summary Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Season Fees 2024/25</Text>
            <View style={styles.metricsRow}>
              <Metric label="Collected" value={`£${paymentData?.collected || 0}`} tone="good" />
              <Metric label="Expected" value={`£${paymentData?.expected || 0}`} />
              <Metric label="Players Paid" value={`${paymentData?.playersPaid || 0}/${paymentData?.totalPlayers || 0}`} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(pct * 100)}% complete</Text>

            <TouchableOpacity style={styles.button} onPress={openPaymentPortal}>
              <Text style={styles.buttonText}>Pay Season Fees</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Individual Status */}
        <View style={{ height: 20 }} />
        <Text style={styles.sectionHeader}>Individual Status</Text>
        <Text style={styles.sectionSubtitle}>Read-only · Contact treasurer to update</Text>
        <Card style={styles.card}>
          <Card.Content>
            <FlatList
              data={paymentData?.people || []}
              keyExtractor={(x) => x.name}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => <PersonRow {...item} />}
              scrollEnabled={false}
            />
          </Card.Content>
        </Card>

        {/* Payment Info */}
        <View style={{ height: 20 }} />
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.infoTitle}>Payment Information</Text>
            <Text style={styles.infoText}>
              • Season fees: £150 per player{'\n'}
              • Payment deadline: 1st October 2025{'\n'}
              • Late payments subject to £10 admin fee{'\n'}
              • Financial assistance available
            </Text>
          </Card.Content>
        </Card>

        {/* Sponsors Section (Placeholder) */}
        <View style={{ height: 20 }} />
        <Text style={styles.sectionHeader}>Sponsors</Text>
        <Text style={styles.sectionSubtitle}>Supporting our team</Text>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.placeholderText}>
              No sponsors yet — coming soon
            </Text>
          </Card.Content>
        </Card>

        {/* Bottom spacing */}
        <View style={{ height: 30 }} />
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
      ? COLORS.success
      : tone === 'warn'
        ? COLORS.warning
        : COLORS.text;

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
  const chipColor = status === 'paid' ? COLORS.success : COLORS.warning;
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
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  container: { padding: 16 },

  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },

  card: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },

  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  metric: { flex: 1 },
  metricValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  metricLabel: { color: COLORS.textLight, marginTop: 2, fontSize: 11 },

  progressTrack: {
    height: 10,
    backgroundColor: '#252931',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: COLORS.textLight,
    marginTop: 8,
    fontSize: 12,
    marginBottom: 16,
  },

  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },

  separator: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  personName: { color: COLORS.text, fontWeight: '700' },
  personSub: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  amount: {
    color: COLORS.text,
    fontWeight: '700',
    marginRight: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontWeight: '700',
    fontSize: 11,
  },

  infoTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: COLORS.textLight,
    fontSize: 14,
    lineHeight: 20,
  },

  placeholderText: {
    color: COLORS.textLight,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
