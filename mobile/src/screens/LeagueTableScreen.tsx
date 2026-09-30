import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useClub } from '../context/ClubContext';
import { isOurTeam } from '../utils/clubMatch';
import { getTenantId } from '../services/club';
import FaFullTimeView from '../components/faFullTime/FaFullTimeView';
import { fetchFaSnippets, type FaSnippets } from '../components/faFullTime/frame';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LeagueTableScreen() {
  const { theme } = useTheme();
  const c = useBrandColors();
  const styles = useStyles();
  const { club } = useClub();
  const [modalVisible, setModalVisible] = useState(false);
  const [leagueTable, setLeagueTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [faSnippets, setFaSnippets] = useState<FaSnippets | null>(null);

  React.useEffect(() => {
    loadTable();
  }, []);

  // A club that added its FA Full-Time snippet sees the FA's own table
  const clubKey = club?.slug || getTenantId();
  React.useEffect(() => {
    let live = true;
    fetchFaSnippets(clubKey).then((s) => live && setFaSnippets(s));
    return () => {
      live = false;
    };
  }, [clubKey]);
  const palette = React.useMemo(() => ({
    text: c.text,
    muted: c.textLight,
    line: c.border,
    head: c.surfaceRaised,
    brand: c.primary,
  }), [c]);

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
          gd: row.goal_difference ?? row.goals_for - row.goals_against,
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
    const isUs = isOurTeam(row.team, club);
    const isTopTwo = row.position <= 2;

    return (
      <View
        key={row.position}
        style={[
          styles.tableRow,
          { borderBottomColor: c.border },
          isUs && { backgroundColor: c.primarySoft },
        ]}
      >
        {/* Position Badge */}
        <View style={styles.posCol}>
          <View
            style={[
              styles.posBadge,
              { backgroundColor: c.surfaceRaised },
              isTopTwo && { borderColor: c.primary, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.posText, { color: isTopTwo ? c.primary : c.textLight }]}>
              {row.position}
            </Text>
          </View>
        </View>

        {/* Team Name */}
        <View style={styles.teamCol}>
          <Text
            style={[styles.teamText, { color: c.text }, isUs && { fontWeight: 'bold', color: c.primary }]}
            numberOfLines={1}
          >
            {row.team.toUpperCase()}
          </Text>
        </View>

        {/* Stats */}
        <Text style={[styles.statCell, styles.statCol, { color: c.textLight }]}>{row.played}</Text>
        <Text style={[styles.statCell, styles.statCol, { color: c.textLight }]}>{row.won}</Text>
        <Text style={[styles.statCell, styles.statCol, { color: c.textLight }]}>{row.drawn}</Text>
        <Text style={[styles.statCell, styles.statCol, { color: c.textLight }]}>{row.lost}</Text>
        <Text style={[styles.ptsCell, styles.ptsCol, { color: c.primary }]}>{row.points}</Text>
      </View>
    );
  };

  const renderFullRow = (row: any) => {
    const isUs = isOurTeam(row.team, club);
    const isTopTwo = row.position <= 2;

    return (
      <View
        key={row.position}
        style={[
          styles.fullTableRow,
          { borderBottomColor: c.border },
          isUs && { backgroundColor: c.primarySoft },
        ]}
      >
        {/* Position */}
        <View style={styles.fullPosCol}>
          <View
            style={[
              styles.posBadge,
              { backgroundColor: c.surfaceRaised },
              isTopTwo && { borderColor: c.primary, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.posText, { color: isTopTwo ? c.primary : c.textLight }]}>
              {row.position}
            </Text>
          </View>
        </View>

        {/* Team */}
        <View style={styles.fullTeamCol}>
          <Text
            style={[styles.teamText, { color: c.text }, isUs && { fontWeight: 'bold', color: c.primary }]}
            numberOfLines={1}
          >
            {row.team.toUpperCase()}
          </Text>
        </View>

        {/* Full Stats */}
        <Text style={[styles.fullStatCell, { color: c.textLight }]}>{row.played}</Text>
        <Text style={[styles.fullStatCell, { color: c.textLight }]}>{row.won}</Text>
        <Text style={[styles.fullStatCell, { color: c.textLight }]}>{row.drawn}</Text>
        <Text style={[styles.fullStatCell, { color: c.textLight }]}>{row.lost}</Text>
        <Text style={[styles.fullStatCell, { color: c.success }]}>{row.gf}</Text>
        <Text style={[styles.fullStatCell, { color: c.error }]}>{row.ga}</Text>
        <Text style={[styles.fullStatCell, { color: row.gd >= 0 ? c.primary : c.error }]}>
          {row.gd > 0 ? `+${row.gd}` : row.gd}
        </Text>
        <Text style={[styles.fullPtsCell, { color: c.primary }]}>{row.points}</Text>
      </View>
    );
  };

  // Our own table (sorted by goal difference) comes first; the FA's is the fallback
  if (faSnippets?.table && !loading && leagueTable.length === 0) {
    return (
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.container}>
        <Text style={styles.sourceLine}>From FA Full-Time</Text>
        <View style={[styles.tableCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <FaFullTimeView code={faSnippets.table} palette={palette} highlight={(club?.name || '').split(' ')[0]} />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Compact Table Card */}
      <View style={[styles.tableCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { borderBottomColor: c.border }]}>
          <Text style={[styles.headerCell, styles.posCol, { color: c.textLight }]}>POS</Text>
          <Text style={[styles.headerCell, styles.teamCol, { color: c.textLight }]}>TEAM</Text>
          <Text style={[styles.headerCell, styles.statCol, { color: c.textLight }]}>P</Text>
          <Text style={[styles.headerCell, styles.statCol, { color: c.textLight }]}>W</Text>
          <Text style={[styles.headerCell, styles.statCol, { color: c.textLight }]}>D</Text>
          <Text style={[styles.headerCell, styles.statCol, { color: c.textLight }]}>L</Text>
          <Text style={[styles.headerCell, styles.ptsCol, { color: c.primary }]}>PTS</Text>
        </View>

        {/* Table Rows */}
        <ScrollView style={styles.tableBody}>
          {leagueTable.map(renderCompactRow)}
        </ScrollView>

        {/* Full Standings Button */}
        <TouchableOpacity
          style={[styles.fullStandingsBtn, { borderColor: c.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.fullStandingsText, { color: c.primary }]}>FULL STANDINGS</Text>
        </TouchableOpacity>
      </View>

      {/* Full Standings Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>FULL STANDINGS</Text>
              <IconButton
                icon="close"
                iconColor={c.textLight}
                size={24}
                onPress={() => setModalVisible(false)}
              />
            </View>

            {/* Full Table Header */}
            <View style={[styles.fullTableHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.fullHeaderCell, styles.fullPosCol, { color: c.textLight }]}>#</Text>
              <Text style={[styles.fullHeaderCell, styles.fullTeamCol, { color: c.textLight }]}>TEAM</Text>
              <Text style={[styles.fullHeaderCell, { color: c.textLight }]}>P</Text>
              <Text style={[styles.fullHeaderCell, { color: c.textLight }]}>W</Text>
              <Text style={[styles.fullHeaderCell, { color: c.textLight }]}>D</Text>
              <Text style={[styles.fullHeaderCell, { color: c.textLight }]}>L</Text>
              <Text style={[styles.fullHeaderCell, { color: c.success }]}>GF</Text>
              <Text style={[styles.fullHeaderCell, { color: c.error }]}>GA</Text>
              <Text style={[styles.fullHeaderCell, { color: c.textLight }]}>GD</Text>
              <Text style={[styles.fullHeaderCell, { color: c.primary }]}>PTS</Text>
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

const useStyles = themedStyles((COLORS) => ({
  container: {
    flex: 1,
    padding: 16,
  },
  sourceLine: {
    color: COLORS.textLight,
    marginBottom: 12,
  },
  tableCard: {
    borderRadius: 18,
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
    borderRadius: 18,
    borderWidth: 1,
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
    fontFamily: FONTS.display,
    fontSize: 20,
    letterSpacing: 1,
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
}));
