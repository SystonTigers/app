import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


const OUR_TEAM = 'Syston Tigers';

export default function LeagueTableScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [modalVisible, setModalVisible] = useState(false);
  const [leagueTable, setLeagueTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadTable();
  }, []);

  const loadTable = async () => {
    try {
      setLoading(true);
      const response = await import('../services/api').then(m => m.fixturesApi.getLeagueTable());
      if (response && response.data) {
        // Map backend data to UI format
        const mapped = response.data.map((row: any) => ({
          position: row.position,
          team: row.team_name,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          gf: row.goals_for,
          ga: row.goals_against,
          gd: row.goals_for - row.goals_against,
          points: row.points,
        }));
        setLeagueTable(mapped);
      }
    } catch (error) {
      console.error('Failed to load league table:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCompactRow = (row: any) => {
    const isOurTeam = row.team === OUR_TEAM;
    const isTopTwo = row.position <= 2;

    return (
      <View
        key={row.position}
        style={[
          styles.tableRow,
          { borderBottomColor: colors.border },
          isOurTeam && { backgroundColor: colors.primary + '15' },
        ]}
      >
        {/* Position Badge */}
        <View style={styles.posCol}>
          <View
            style={[
              styles.posBadge,
              { backgroundColor: colors.backgroundSecondary },
              isTopTwo && { borderColor: colors.primary, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.posText, { color: isTopTwo ? colors.primary : colors.textSecondary }]}>
              {row.position}
            </Text>
          </View>
        </View>

        {/* Team Name */}
        <View style={styles.teamCol}>
          <Text
            style={[styles.teamText, { color: colors.text }, isOurTeam && { fontWeight: 'bold', color: colors.primary }]}
            numberOfLines={1}
          >
            {row.team.toUpperCase()}
          </Text>
        </View>

        {/* Stats */}
        <Text style={[styles.statCell, styles.statCol, { color: colors.textSecondary }]}>{row.played}</Text>
        <Text style={[styles.statCell, styles.statCol, { color: colors.textSecondary }]}>{row.won}</Text>
        <Text style={[styles.statCell, styles.statCol, { color: colors.textSecondary }]}>{row.drawn}</Text>
        <Text style={[styles.statCell, styles.statCol, { color: colors.textSecondary }]}>{row.lost}</Text>
        <Text style={[styles.ptsCell, styles.ptsCol, { color: colors.primary }]}>{row.points}</Text>
      </View>
    );
  };

  const renderFullRow = (row: any) => {
    const isOurTeam = row.team === OUR_TEAM;
    const isTopTwo = row.position <= 2;

    return (
      <View
        key={row.position}
        style={[
          styles.fullTableRow,
          { borderBottomColor: colors.border },
          isOurTeam && { backgroundColor: colors.primary + '15' },
        ]}
      >
        {/* Position */}
        <View style={styles.fullPosCol}>
          <View
            style={[
              styles.posBadge,
              { backgroundColor: colors.backgroundSecondary },
              isTopTwo && { borderColor: colors.primary, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.posText, { color: isTopTwo ? colors.primary : colors.textSecondary }]}>
              {row.position}
            </Text>
          </View>
        </View>

        {/* Team */}
        <View style={styles.fullTeamCol}>
          <Text
            style={[styles.teamText, { color: colors.text }, isOurTeam && { fontWeight: 'bold', color: colors.primary }]}
            numberOfLines={1}
          >
            {row.team.toUpperCase()}
          </Text>
        </View>

        {/* Full Stats */}
        <Text style={[styles.fullStatCell, { color: colors.textSecondary }]}>{row.played}</Text>
        <Text style={[styles.fullStatCell, { color: colors.textSecondary }]}>{row.won}</Text>
        <Text style={[styles.fullStatCell, { color: colors.textSecondary }]}>{row.drawn}</Text>
        <Text style={[styles.fullStatCell, { color: colors.textSecondary }]}>{row.lost}</Text>
        <Text style={[styles.fullStatCell, { color: colors.success || colors.primary }]}>{row.gf}</Text>
        <Text style={[styles.fullStatCell, { color: colors.error }]}>{row.ga}</Text>
        <Text style={[styles.fullStatCell, { color: row.gd >= 0 ? colors.primary : colors.error }]}>
          {row.gd > 0 ? `+${row.gd}` : row.gd}
        </Text>
        <Text style={[styles.fullPtsCell, { color: colors.primary }]}>{row.points}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>LEAGUE STANDINGS</Text>
      </View>

      {/* Compact Table Card */}
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerCell, styles.posCol, { color: colors.textSecondary }]}>POS</Text>
          <Text style={[styles.headerCell, styles.teamCol, { color: colors.textSecondary }]}>TEAM</Text>
          <Text style={[styles.headerCell, styles.statCol, { color: colors.textSecondary }]}>P</Text>
          <Text style={[styles.headerCell, styles.statCol, { color: colors.textSecondary }]}>W</Text>
          <Text style={[styles.headerCell, styles.statCol, { color: colors.textSecondary }]}>D</Text>
          <Text style={[styles.headerCell, styles.statCol, { color: colors.textSecondary }]}>L</Text>
          <Text style={[styles.headerCell, styles.ptsCol, { color: colors.primary }]}>PTS</Text>
        </View>

        {/* Table Rows */}
        <ScrollView style={styles.tableBody}>
          {leagueTable.map(renderCompactRow)}
        </ScrollView>

        {/* Full Standings Button */}
        <TouchableOpacity
          style={[styles.fullStandingsBtn, { borderColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.fullStandingsText, { color: colors.primary }]}>FULL STANDINGS</Text>
        </TouchableOpacity>
      </View>

      {/* Full Standings Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.primary + '60' }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>FULL STANDINGS</Text>
              <IconButton
                icon="close"
                iconColor={colors.textSecondary}
                size={24}
                onPress={() => setModalVisible(false)}
              />
            </View>

            {/* Full Table Header */}
            <View style={[styles.fullTableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.fullHeaderCell, styles.fullPosCol, { color: colors.textSecondary }]}>#</Text>
              <Text style={[styles.fullHeaderCell, styles.fullTeamCol, { color: colors.textSecondary }]}>TEAM</Text>
              <Text style={[styles.fullHeaderCell, { color: colors.textSecondary }]}>P</Text>
              <Text style={[styles.fullHeaderCell, { color: colors.textSecondary }]}>W</Text>
              <Text style={[styles.fullHeaderCell, { color: colors.textSecondary }]}>D</Text>
              <Text style={[styles.fullHeaderCell, { color: colors.textSecondary }]}>L</Text>
              <Text style={[styles.fullHeaderCell, { color: colors.success || colors.primary }]}>GF</Text>
              <Text style={[styles.fullHeaderCell, { color: colors.error }]}>GA</Text>
              <Text style={[styles.fullHeaderCell, { color: colors.textSecondary }]}>GD</Text>
              <Text style={[styles.fullHeaderCell, { color: colors.primary }]}>PTS</Text>
            </View>

            {/* Full Table Body */}
            <ScrollView style={styles.modalTableBody}>
              {leagueTable.map(renderFullRow)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tableCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  tableBody: {
    maxHeight: 350,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  posCol: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posBadge: {
    width: 26,
    height: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  teamCol: {
    flex: 1,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  teamText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  statCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCell: {
    fontSize: 12,
    textAlign: 'center',
    width: 28,
  },
  ptsCol: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptsCell: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    width: 36,
  },
  fullStandingsBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  fullStandingsText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: SCREEN_WIDTH - 32,
    maxHeight: '85%',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  fullTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  fullHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
    width: 28,
  },
  fullPosCol: {
    width: 32,
    alignItems: 'center',
  },
  fullTeamCol: {
    flex: 1,
    paddingLeft: 4,
  },
  modalTableBody: {
    maxHeight: 400,
  },
  fullTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  fullStatCell: {
    fontSize: 11,
    textAlign: 'center',
    width: 28,
  },
  fullPtsCell: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    width: 28,
  },
});
