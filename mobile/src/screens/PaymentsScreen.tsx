import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { Card, Title, Paragraph, Button, List, Chip, ProgressBar, Divider } from 'react-native-paper';
import { COLORS } from '../config';

interface PaymentStatus {
  playerName: string;
  status: 'paid' | 'pending' | 'overdue';
  amount: number;
  dueDate: string;
  paidDate?: string;
}

interface Sponsor {
  id: string;
  name: string;
  logo: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  contribution: string;
  website?: string;
}

const mockPaymentStatus: PaymentStatus[] = [
  { playerName: 'James Mitchell', status: 'paid', amount: 150, dueDate: '2025-10-01', paidDate: '2025-09-25' },
  { playerName: 'Tom Davies', status: 'paid', amount: 150, dueDate: '2025-10-01', paidDate: '2025-09-28' },
  { playerName: 'Luke Harrison', status: 'pending', amount: 150, dueDate: '2025-10-01' },
  { playerName: 'Sam Roberts', status: 'paid', amount: 150, dueDate: '2025-10-01', paidDate: '2025-09-30' },
  { playerName: 'Ben Parker', status: 'paid', amount: 150, dueDate: '2025-10-01', paidDate: '2025-09-22' },
];

const mockSponsors: Sponsor[] = [
  { id: '1', name: 'Local Motors Ltd', logo: '🚗', tier: 'platinum', contribution: '£5,000/year', website: 'https://example.com' },
  { id: '2', name: 'Syston Pharmacy', logo: '💊', tier: 'gold', contribution: '£2,500/year', website: 'https://example.com' },
  { id: '3', name: 'Tigers Cafe', logo: '☕', tier: 'gold', contribution: '£2,500/year' },
  { id: '4', name: 'Smith & Co Solicitors', logo: '⚖️', tier: 'silver', contribution: '£1,000/year', website: 'https://example.com' },
  { id: '5', name: 'Green Garden Centre', logo: '🌱', tier: 'silver', contribution: '£1,000/year' },
  { id: '6', name: 'Jones Plumbing', logo: '🔧', tier: 'bronze', contribution: '£500/year' },
];

const PAYMENT_PLATFORM_URL = 'https://example.com/payments/syston-tigers';

export default function PaymentsScreen() {
  const [selectedTab, setSelectedTab] = useState<'status' | 'sponsors'>('status');

  const getTierColor = (tier: Sponsor['tier']) => {
    switch (tier) {
      case 'platinum': return '#E5E4E2';
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      default: return COLORS.primary;
    }
  };

  const getStatusColor = (status: PaymentStatus['status']) => {
    switch (status) {
      case 'paid': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'overdue': return '#F44336';
      default: return COLORS.textLight;
    }
  };

  const getStatusIcon = (status: PaymentStatus['status']) => {
    switch (status) {
      case 'paid': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'overdue': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const totalPlayers = mockPaymentStatus.length;
  const paidPlayers = mockPaymentStatus.filter(p => p.status === 'paid').length;
  const paymentProgress = paidPlayers / totalPlayers;
  const totalCollected = mockPaymentStatus
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = mockPaymentStatus.reduce((sum, p) => sum + p.amount, 0);

  const openPaymentPlatform = () => {
    Linking.openURL(PAYMENT_PLATFORM_URL);
  };

  const openSponsorWebsite = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Payments</Title>
        <Paragraph style={styles.headerSubtitle}>Status & Sponsors</Paragraph>
      </View>

      {/* Tab selector */}
      <View style={styles.tabContainer}>
        <Button
          mode={selectedTab === 'status' ? 'contained' : 'outlined'}
          onPress={() => setSelectedTab('status')}
          style={styles.tabButton}
          buttonColor={selectedTab === 'status' ? COLORS.primary : 'transparent'}
          textColor={selectedTab === 'status' ? COLORS.secondary : COLORS.primary}
        >
          Payment Status
        </Button>
        <Button
          mode={selectedTab === 'sponsors' ? 'contained' : 'outlined'}
          onPress={() => setSelectedTab('sponsors')}
          style={styles.tabButton}
          buttonColor={selectedTab === 'sponsors' ? COLORS.primary : 'transparent'}
          textColor={selectedTab === 'sponsors' ? COLORS.secondary : COLORS.primary}
        >
          Our Sponsors
        </Button>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Payment Status Tab */}
        {selectedTab === 'status' && (
          <>
            {/* Summary Card */}
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Title style={styles.summaryTitle}>Season Fees 2024/25</Title>
                <View style={styles.summaryStats}>
                  <View style={styles.statBox}>
                    <Paragraph style={styles.statValue}>£{totalCollected}</Paragraph>
                    <Paragraph style={styles.statLabel}>Collected</Paragraph>
                  </View>
                  <View style={styles.statBox}>
                    <Paragraph style={styles.statValue}>£{totalExpected}</Paragraph>
                    <Paragraph style={styles.statLabel}>Expected</Paragraph>
                  </View>
                  <View style={styles.statBox}>
                    <Paragraph style={styles.statValue}>{paidPlayers}/{totalPlayers}</Paragraph>
                    <Paragraph style={styles.statLabel}>Players Paid</Paragraph>
                  </View>
                </View>
                <ProgressBar
                  progress={paymentProgress}
                  color={COLORS.primary}
                  style={styles.progressBar}
                />
                <Paragraph style={styles.progressText}>
                  {Math.round(paymentProgress * 100)}% complete
                </Paragraph>
              </Card.Content>
            </Card>

            {/* Payment Platform Link */}
            <Card style={styles.platformCard}>
              <Card.Content>
                <Title style={styles.platformTitle}>💳 Make a Payment</Title>
                <Paragraph style={styles.platformDescription}>
                  Pay your season fees securely through our payment platform
                </Paragraph>
                <Button
                  mode="contained"
                  icon="open-in-new"
                  onPress={openPaymentPlatform}
                  style={styles.platformButton}
                  buttonColor={COLORS.primary}
                  textColor={COLORS.secondary}
                >
                  Go to Payment Portal
                </Button>
              </Card.Content>
            </Card>

            {/* Payment Status List */}
            <Card style={styles.statusCard}>
              <Card.Content>
                <Title style={styles.statusTitle}>Individual Status</Title>
                <Paragraph style={styles.statusSubtitle}>
                  Read-only view • Contact treasurer to update
                </Paragraph>
              </Card.Content>
              <List.Section>
                {mockPaymentStatus.map((payment, index) => (
                  <React.Fragment key={index}>
                    <List.Item
                      title={payment.playerName}
                      description={
                        payment.status === 'paid'
                          ? `Paid on ${new Date(payment.paidDate!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
                          : `Due: ${new Date(payment.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
                      }
                      left={props => (
                        <List.Icon
                          {...props}
                          icon={getStatusIcon(payment.status)}
                          color={getStatusColor(payment.status)}
                        />
                      )}
                      right={() => (
                        <View style={styles.paymentRight}>
                          <Paragraph style={styles.paymentAmount}>£{payment.amount}</Paragraph>
                          <Chip
                            style={[styles.statusChip, { backgroundColor: getStatusColor(payment.status) }]}
                            textStyle={styles.statusChipText}
                          >
                            {payment.status}
                          </Chip>
                        </View>
                      )}
                    />
                    {index < mockPaymentStatus.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List.Section>
            </Card>

            {/* Info Card */}
            <Card style={styles.infoCard}>
              <Card.Content>
                <Title style={styles.infoTitle}>ℹ️ Payment Information</Title>
                <Paragraph style={styles.infoText}>
                  • Season fees: £150 per player{'\n'}
                  • Payment deadline: 1st October 2025{'\n'}
                  • Late payments subject to £10 admin fee{'\n'}
                  • Financial assistance available - contact treasurer{'\n'}
                  • All payments processed securely via our payment platform
                </Paragraph>
              </Card.Content>
            </Card>
          </>
        )}

        {/* Sponsors Tab */}
        {selectedTab === 'sponsors' && (
          <>
            <Card style={styles.sponsorIntroCard}>
              <Card.Content>
                <Title style={styles.sponsorIntroTitle}>🙏 Thank You to Our Sponsors</Title>
                <Paragraph style={styles.sponsorIntroText}>
                  Our sponsors make it possible for Syston Tigers to provide quality football for our community. We're grateful for their continued support!
                </Paragraph>
              </Card.Content>
            </Card>

            {/* Platinum Sponsors */}
            {mockSponsors.filter(s => s.tier === 'platinum').length > 0 && (
              <>
                <View style={styles.tierHeader}>
                  <Chip
                    style={[styles.tierChip, { backgroundColor: getTierColor('platinum') }]}
                    textStyle={styles.tierChipText}
                  >
                    💎 Platinum Sponsors
                  </Chip>
                </View>
                {mockSponsors
                  .filter(s => s.tier === 'platinum')
                  .map(sponsor => (
                    <Card key={sponsor.id} style={styles.sponsorCard}>
                      <Card.Content>
                        <View style={styles.sponsorHeader}>
                          <Paragraph style={styles.sponsorLogo}>{sponsor.logo}</Paragraph>
                          <View style={styles.sponsorInfo}>
                            <Title style={styles.sponsorName}>{sponsor.name}</Title>
                            <Paragraph style={styles.sponsorContribution}>
                              {sponsor.contribution}
                            </Paragraph>
                          </View>
                        </View>
                        {sponsor.website && (
                          <Button
                            mode="outlined"
                            icon="web"
                            onPress={() => openSponsorWebsite(sponsor.website!)}
                            style={styles.sponsorButton}
                          >
                            Visit Website
                          </Button>
                        )}
                      </Card.Content>
                    </Card>
                  ))}
              </>
            )}

            {/* Gold Sponsors */}
            {mockSponsors.filter(s => s.tier === 'gold').length > 0 && (
              <>
                <View style={styles.tierHeader}>
                  <Chip
                    style={[styles.tierChip, { backgroundColor: getTierColor('gold') }]}
                    textStyle={styles.tierChipText}
                  >
                    🥇 Gold Sponsors
                  </Chip>
                </View>
                {mockSponsors
                  .filter(s => s.tier === 'gold')
                  .map(sponsor => (
                    <Card key={sponsor.id} style={styles.sponsorCard}>
                      <Card.Content>
                        <View style={styles.sponsorHeader}>
                          <Paragraph style={styles.sponsorLogo}>{sponsor.logo}</Paragraph>
                          <View style={styles.sponsorInfo}>
                            <Title style={styles.sponsorName}>{sponsor.name}</Title>
                            <Paragraph style={styles.sponsorContribution}>
                              {sponsor.contribution}
                            </Paragraph>
                          </View>
                        </View>
                        {sponsor.website && (
                          <Button
                            mode="outlined"
                            icon="web"
                            onPress={() => openSponsorWebsite(sponsor.website!)}
                            style={styles.sponsorButton}
                          >
                            Visit Website
                          </Button>
                        )}
                      </Card.Content>
                    </Card>
                  ))}
              </>
            )}

            {/* Silver Sponsors */}
            {mockSponsors.filter(s => s.tier === 'silver').length > 0 && (
              <>
                <View style={styles.tierHeader}>
                  <Chip
                    style={[styles.tierChip, { backgroundColor: getTierColor('silver') }]}
                    textStyle={styles.tierChipText}
                  >
                    🥈 Silver Sponsors
                  </Chip>
                </View>
                {mockSponsors
                  .filter(s => s.tier === 'silver')
                  .map(sponsor => (
                    <Card key={sponsor.id} style={styles.sponsorCard}>
                      <Card.Content>
                        <View style={styles.sponsorHeader}>
                          <Paragraph style={styles.sponsorLogo}>{sponsor.logo}</Paragraph>
                          <View style={styles.sponsorInfo}>
                            <Title style={styles.sponsorName}>{sponsor.name}</Title>
                            <Paragraph style={styles.sponsorContribution}>
                              {sponsor.contribution}
                            </Paragraph>
                          </View>
                        </View>
                        {sponsor.website && (
                          <Button
                            mode="outlined"
                            icon="web"
                            onPress={() => openSponsorWebsite(sponsor.website!)}
                            style={styles.sponsorButton}
                          >
                            Visit Website
                          </Button>
                        )}
                      </Card.Content>
                    </Card>
                  ))}
              </>
            )}

            {/* Bronze Sponsors */}
            {mockSponsors.filter(s => s.tier === 'bronze').length > 0 && (
              <>
                <View style={styles.tierHeader}>
                  <Chip
                    style={[styles.tierChip, { backgroundColor: getTierColor('bronze') }]}
                    textStyle={styles.tierChipText}
                  >
                    🥉 Bronze Sponsors
                  </Chip>
                </View>
                {mockSponsors
                  .filter(s => s.tier === 'bronze')
                  .map(sponsor => (
                    <Card key={sponsor.id} style={styles.sponsorCard}>
                      <Card.Content>
                        <View style={styles.sponsorHeader}>
                          <Paragraph style={styles.sponsorLogo}>{sponsor.logo}</Paragraph>
                          <View style={styles.sponsorInfo}>
                            <Title style={styles.sponsorName}>{sponsor.name}</Title>
                            <Paragraph style={styles.sponsorContribution}>
                              {sponsor.contribution}
                            </Paragraph>
                          </View>
                        </View>
                        {sponsor.website && (
                          <Button
                            mode="outlined"
                            icon="web"
                            onPress={() => openSponsorWebsite(sponsor.website!)}
                            style={styles.sponsorButton}
                          >
                            Visit Website
                          </Button>
                        )}
                      </Card.Content>
                    </Card>
                  ))}
              </>
            )}

            {/* Become a Sponsor */}
            <Card style={styles.becomeCard}>
              <Card.Content>
                <Title style={styles.becomeTitle}>🤝 Become a Sponsor</Title>
                <Paragraph style={styles.becomeText}>
                  Interested in supporting Syston Tigers? We offer various sponsorship packages to suit all budgets.
                </Paragraph>
                <Button
                  mode="contained"
                  icon="email"
                  onPress={() => Linking.openURL('mailto:sponsors@systontigers.com')}
                  style={styles.becomeButton}
                  buttonColor={COLORS.primary}
                  textColor={COLORS.secondary}
                >
                  Contact Us
                </Button>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  // Payment Status styles
  summaryCard: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  platformCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  platformTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  platformDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  platformButton: {
    marginTop: 8,
  },
  statusCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusChip: {
    height: 24,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  // Sponsors styles
  sponsorIntroCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sponsorIntroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sponsorIntroText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  tierHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  tierChip: {
    alignSelf: 'flex-start',
  },
  tierChipText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  sponsorCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  sponsorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sponsorLogo: {
    fontSize: 40,
    marginRight: 16,
  },
  sponsorInfo: {
    flex: 1,
  },
  sponsorName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sponsorContribution: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  sponsorButton: {
    marginTop: 4,
  },
  becomeCard: {
    margin: 16,
    marginTop: 24,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  becomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  becomeText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  becomeButton: {
    marginTop: 8,
  },
});
