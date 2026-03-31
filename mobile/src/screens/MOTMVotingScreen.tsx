import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, ProgressBar, Divider, Avatar, RadioButton } from 'react-native-paper';
import { COLORS } from '../config';
import { motmApi } from '../services/api';

interface Nominee {
  candidateId: string;
  name: string;
  votes: number;
}

interface MOTMVote {
  id: string;
  matchId: string;
  opponent: string;
  date: string;
  status: 'active' | 'closed';
  nominees: Nominee[];
  votingWindow: {
    start: string;
    end: string;
  };
  totalVotes: number;
  hasVoted: boolean; // Whether current user has voted
  userVote?: string; // Which candidate user voted for
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
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  voteCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  voteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  voteInfo: {
    flex: 1,
  },
  voteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  voteDate: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  activeChip: {
    backgroundColor: '#4CAF50',
    height: 28,
  },
  activeChipText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  closedChip: {
    backgroundColor: COLORS.textLight,
    height: 28,
  },
  closedChipText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  timeRemainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeRemaining: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalVotes: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: COLORS.background,
  },
  votedContainer: {
    marginTop: 8,
  },
  votedChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    marginBottom: 12,
  },
  votedChipText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  votedText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  standingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  standingRow: {
    marginBottom: 16,
  },
  standingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  standingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  standingRank: {
    fontSize: 16,
    marginRight: 8,
    width: 28,
  },
  standingName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  userVoteName: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  standingPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  votingContainer: {
    marginTop: 8,
  },
  votingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  nomineeCard: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nomineeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  nomineeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nomineeAvatar: {
    backgroundColor: COLORS.primary,
    marginRight: 12,
  },
  nomineeInfo: {
    flex: 1,
  },
  nomineeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  voteButton: {
    marginTop: 16,
  },
  winnerBanner: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  winnerLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  winnerAvatar: {
    backgroundColor: COLORS.primary,
    marginBottom: 12,
  },
  winnerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  winnerVotes: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  fullResultsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  resultRow: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultRank: {
    fontSize: 16,
    marginRight: 8,
    width: 28,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  resultVotes: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  totalVotesText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
