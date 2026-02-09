import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Text, Button, Card, Chip, IconButton, TextInput, List, Divider, ActivityIndicator, FAB, Portal, Modal } from 'react-native-paper';
import { COLORS, API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CarpoolOffer {
    id: string;
    fixture_id?: string;
    driver_user_id: string;
    driver_name: string;
    seats_available: number;
    seats_taken: number;
    seats_remaining?: number;
    departure_location: string;
    departure_postcode?: string;
    departure_time: string;
    return_offered: boolean;
    notes?: string;
    status: string;
    requests?: CarpoolRequest[];
}

interface CarpoolRequest {
    id: string;
    passenger_name: string;
    player_name?: string;
    seats_needed: number;
    pickup_notes?: string;
    status: string;
}

interface Props {
    route: {
        params: {
            fixtureId: string;
            opponent: string;
            fixtureDate: string;
        };
    };
    navigation: any;
}

type TabType = 'offers' | 'my-offers' | 'my-requests';

export default function CarpoolScreen({ route, navigation }: Props) {
    const { fixtureId, opponent, fixtureDate } = route.params;

    const [activeTab, setActiveTab] = useState<TabType>('offers');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [offers, setOffers] = useState<CarpoolOffer[]>([]);
    const [myOffers, setMyOffers] = useState<CarpoolOffer[]>([]);
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [userId, setUserId] = useState<string>('');

    // Modal states
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<CarpoolOffer | null>(null);

    // Form states
    const [offerForm, setOfferForm] = useState({
        seats_available: '3',
        departure_location: '',
        departure_time: '',
        return_offered: true,
        notes: '',
    });
    const [requestForm, setRequestForm] = useState({
        passenger_name: '',
        seats_needed: '1',
        pickup_notes: '',
    });

    const fetchData = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const storedUserId = await AsyncStorage.getItem('userId');
            if (storedUserId) setUserId(storedUserId);

            // Fetch offers for this fixture
            const offersRes = await fetch(
                `${API_BASE_URL}/api/v1/fixtures/${fixtureId}/carpool`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (offersRes.ok) {
                const result = await offersRes.json();
                if (result.success) setOffers(result.data || []);
            }

            // Fetch my offers
            const myOffersRes = await fetch(
                `${API_BASE_URL}/api/v1/carpool/my-offers`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (myOffersRes.ok) {
                const result = await myOffersRes.json();
                if (result.success) setMyOffers(result.data || []);
            }

            // Fetch my requests
            const myReqRes = await fetch(
                `${API_BASE_URL}/api/v1/carpool/my-requests`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (myReqRes.ok) {
                const result = await myReqRes.json();
                if (result.success) setMyRequests(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch carpool data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fixtureId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateOffer = async () => {
        if (!offerForm.departure_location) {
            Alert.alert('Required', 'Please enter a departure location');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await fetch(
                `${API_BASE_URL}/api/v1/fixtures/${fixtureId}/carpool`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        seats_available: parseInt(offerForm.seats_available) || 3,
                        departure_location: offerForm.departure_location,
                        departure_time: offerForm.departure_time || new Date().toISOString(),
                        return_offered: offerForm.return_offered,
                        notes: offerForm.notes,
                    }),
                }
            );

            if (response.ok) {
                Alert.alert('Success', 'Lift offer created!');
                setShowOfferModal(false);
                setOfferForm({ seats_available: '3', departure_location: '', departure_time: '', return_offered: true, notes: '' });
                fetchData();
            } else {
                throw new Error('Failed to create offer');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create lift offer');
        }
    };

    const handleRequestSeat = async () => {
        if (!selectedOffer || !requestForm.passenger_name) {
            Alert.alert('Required', 'Please enter your name');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await fetch(
                `${API_BASE_URL}/api/v1/carpool/${selectedOffer.id}/request`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        passenger_name: requestForm.passenger_name,
                        seats_needed: parseInt(requestForm.seats_needed) || 1,
                        pickup_notes: requestForm.pickup_notes,
                    }),
                }
            );

            if (response.ok) {
                Alert.alert('Success', 'Seat request submitted!');
                setShowRequestModal(false);
                setSelectedOffer(null);
                setRequestForm({ passenger_name: '', seats_needed: '1', pickup_notes: '' });
                fetchData();
            } else {
                const result = await response.json();
                Alert.alert('Error', result.error?.message || 'Failed to request seat');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to request seat');
        }
    };

    const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'declined') => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await fetch(
                `${API_BASE_URL}/api/v1/carpool/requests/${requestId}`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status }),
                }
            );

            if (response.ok) {
                Alert.alert('Success', `Request ${status}!`);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to respond to request');
        }
    };

    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return isoString;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return '#22c55e';
            case 'declined': return '#ef4444';
            case 'pending': return '#f59e0b';
            default: return COLORS.textLight;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading carpool options...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Carpool</Text>
                <Text style={styles.subtitle}>vs {opponent} • {fixtureDate}</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <Chip
                    selected={activeTab === 'offers'}
                    onPress={() => setActiveTab('offers')}
                    style={[styles.tab, activeTab === 'offers' && styles.tabActive]}
                >
                    Available Lifts
                </Chip>
                <Chip
                    selected={activeTab === 'my-offers'}
                    onPress={() => setActiveTab('my-offers')}
                    style={[styles.tab, activeTab === 'my-offers' && styles.tabActive]}
                >
                    My Offers
                </Chip>
                <Chip
                    selected={activeTab === 'my-requests'}
                    onPress={() => setActiveTab('my-requests')}
                    style={[styles.tab, activeTab === 'my-requests' && styles.tabActive]}
                >
                    My Requests
                </Chip>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
                }
            >
                {/* Available Offers Tab */}
                {activeTab === 'offers' && (
                    <>
                        {offers.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>🚗</Text>
                                <Text style={styles.emptyTitle}>No lifts available yet</Text>
                                <Text style={styles.emptySubtitle}>Be the first to offer a lift!</Text>
                            </View>
                        ) : (
                            offers.map(offer => (
                                <Card key={offer.id} style={styles.offerCard}>
                                    <Card.Content>
                                        <View style={styles.offerHeader}>
                                            <Text style={styles.driverName}>🚗 {offer.driver_name}'s Car</Text>
                                            <Chip mode="outlined" style={styles.seatsBadge}>
                                                {offer.seats_remaining || (offer.seats_available - offer.seats_taken)} seats left
                                            </Chip>
                                        </View>
                                        <View style={styles.offerDetails}>
                                            <Text style={styles.detailText}>📍 {offer.departure_location}</Text>
                                            <Text style={styles.detailText}>⏰ Departing: {formatTime(offer.departure_time)}</Text>
                                            {offer.return_offered && (
                                                <Text style={styles.returnBadge}>✅ Return trip included</Text>
                                            )}
                                            {offer.notes && (
                                                <Text style={styles.notesText}>{offer.notes}</Text>
                                            )}
                                        </View>
                                    </Card.Content>
                                    <Card.Actions>
                                        <Button
                                            mode="contained"
                                            onPress={() => {
                                                setSelectedOffer(offer);
                                                setShowRequestModal(true);
                                            }}
                                            disabled={(offer.seats_remaining || (offer.seats_available - offer.seats_taken)) <= 0}
                                        >
                                            Request Seat
                                        </Button>
                                    </Card.Actions>
                                </Card>
                            ))
                        )}
                    </>
                )}

                {/* My Offers Tab */}
                {activeTab === 'my-offers' && (
                    <>
                        {myOffers.filter(o => o.fixture_id === fixtureId).length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>🙋‍♂️</Text>
                                <Text style={styles.emptyTitle}>No offers yet</Text>
                                <Text style={styles.emptySubtitle}>Tap + to offer a lift</Text>
                            </View>
                        ) : (
                            myOffers.filter(o => o.fixture_id === fixtureId).map(offer => (
                                <Card key={offer.id} style={styles.offerCard}>
                                    <Card.Content>
                                        <Text style={styles.driverName}>Your Lift Offer</Text>
                                        <Text style={styles.detailText}>
                                            {offer.seats_available - offer.seats_taken} / {offer.seats_available} seats available
                                        </Text>

                                        {offer.requests && offer.requests.length > 0 && (
                                            <View style={styles.requestsList}>
                                                <Text style={styles.requestsTitle}>Pending Requests:</Text>
                                                {offer.requests.map(req => (
                                                    <View key={req.id} style={styles.requestItem}>
                                                        <View>
                                                            <Text style={styles.requestName}>{req.passenger_name}</Text>
                                                            <Text style={styles.requestSeats}>{req.seats_needed} seat(s) needed</Text>
                                                        </View>
                                                        {req.status === 'pending' ? (
                                                            <View style={styles.requestActions}>
                                                                <IconButton
                                                                    icon="check"
                                                                    iconColor="#22c55e"
                                                                    onPress={() => handleRespondToRequest(req.id, 'accepted')}
                                                                />
                                                                <IconButton
                                                                    icon="close"
                                                                    iconColor="#ef4444"
                                                                    onPress={() => handleRespondToRequest(req.id, 'declined')}
                                                                />
                                                            </View>
                                                        ) : (
                                                            <Chip style={{ backgroundColor: getStatusColor(req.status) }}>
                                                                {req.status}
                                                            </Chip>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </Card.Content>
                                </Card>
                            ))
                        )}
                    </>
                )}

                {/* My Requests Tab */}
                {activeTab === 'my-requests' && (
                    <>
                        {myRequests.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>📋</Text>
                                <Text style={styles.emptyTitle}>No requests yet</Text>
                                <Text style={styles.emptySubtitle}>Request a seat from available lifts</Text>
                            </View>
                        ) : (
                            myRequests.map(req => (
                                <Card key={req.id} style={styles.offerCard}>
                                    <Card.Content>
                                        <View style={styles.offerHeader}>
                                            <Text style={styles.driverName}>Lift with {req.driver_name}</Text>
                                            <Chip style={{ backgroundColor: getStatusColor(req.status) }}>
                                                {req.status}
                                            </Chip>
                                        </View>
                                        <Text style={styles.detailText}>📍 {req.departure_location}</Text>
                                        <Text style={styles.detailText}>⏰ {formatTime(req.departure_time)}</Text>
                                    </Card.Content>
                                </Card>
                            ))
                        )}
                    </>
                )}
            </ScrollView>

            {/* FAB to create offer */}
            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => setShowOfferModal(true)}
                label="Offer Lift"
            />

            {/* Create Offer Modal */}
            <Portal>
                <Modal
                    visible={showOfferModal}
                    onDismiss={() => setShowOfferModal(false)}
                    contentContainerStyle={styles.modal}
                >
                    <Text style={styles.modalTitle}>Offer a Lift</Text>

                    <TextInput
                        mode="outlined"
                        label="Departure Location"
                        value={offerForm.departure_location}
                        onChangeText={text => setOfferForm(f => ({ ...f, departure_location: text }))}
                        placeholder="e.g., Syston, LE7"
                        style={styles.input}
                    />

                    <TextInput
                        mode="outlined"
                        label="Seats Available"
                        value={offerForm.seats_available}
                        onChangeText={text => setOfferForm(f => ({ ...f, seats_available: text }))}
                        keyboardType="numeric"
                        style={styles.input}
                    />

                    <List.Item
                        title="Offer return journey"
                        right={() => (
                            <Chip
                                selected={offerForm.return_offered}
                                onPress={() => setOfferForm(f => ({ ...f, return_offered: !f.return_offered }))}
                            >
                                {offerForm.return_offered ? 'Yes' : 'No'}
                            </Chip>
                        )}
                    />

                    <TextInput
                        mode="outlined"
                        label="Notes (optional)"
                        value={offerForm.notes}
                        onChangeText={text => setOfferForm(f => ({ ...f, notes: text }))}
                        placeholder="e.g., Can pick up from Birstall area"
                        multiline
                        style={styles.input}
                    />

                    <View style={styles.modalActions}>
                        <Button mode="text" onPress={() => setShowOfferModal(false)}>Cancel</Button>
                        <Button mode="contained" onPress={handleCreateOffer}>Create Offer</Button>
                    </View>
                </Modal>
            </Portal>

            {/* Request Seat Modal */}
            <Portal>
                <Modal
                    visible={showRequestModal}
                    onDismiss={() => { setShowRequestModal(false); setSelectedOffer(null); }}
                    contentContainerStyle={styles.modal}
                >
                    <Text style={styles.modalTitle}>Request a Seat</Text>
                    {selectedOffer && (
                        <Text style={styles.modalSubtitle}>
                            Lift with {selectedOffer.driver_name} from {selectedOffer.departure_location}
                        </Text>
                    )}

                    <TextInput
                        mode="outlined"
                        label="Your Name"
                        value={requestForm.passenger_name}
                        onChangeText={text => setRequestForm(f => ({ ...f, passenger_name: text }))}
                        style={styles.input}
                    />

                    <TextInput
                        mode="outlined"
                        label="Seats Needed"
                        value={requestForm.seats_needed}
                        onChangeText={text => setRequestForm(f => ({ ...f, seats_needed: text }))}
                        keyboardType="numeric"
                        style={styles.input}
                    />

                    <TextInput
                        mode="outlined"
                        label="Pickup Notes (optional)"
                        value={requestForm.pickup_notes}
                        onChangeText={text => setRequestForm(f => ({ ...f, pickup_notes: text }))}
                        placeholder="e.g., Can meet at Tesco car park"
                        multiline
                        style={styles.input}
                    />

                    <View style={styles.modalActions}>
                        <Button mode="text" onPress={() => { setShowRequestModal(false); setSelectedOffer(null); }}>Cancel</Button>
                        <Button mode="contained" onPress={handleRequestSeat}>Request Seat</Button>
                    </View>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.textLight,
    },
    header: {
        padding: 16,
        paddingBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 4,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 8,
    },
    tab: {
        backgroundColor: COLORS.surface,
    },
    tabActive: {
        backgroundColor: COLORS.primary,
    },
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    offerCard: {
        marginBottom: 12,
        backgroundColor: COLORS.surface,
    },
    offerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    driverName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    seatsBadge: {
        backgroundColor: '#22c55e20',
    },
    offerDetails: {
        marginTop: 8,
    },
    detailText: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    returnBadge: {
        fontSize: 14,
        color: '#22c55e',
        marginTop: 4,
    },
    notesText: {
        fontSize: 14,
        color: COLORS.text,
        fontStyle: 'italic',
        marginTop: 8,
    },
    requestsList: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.surface,
    },
    requestsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    requestItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    requestName: {
        fontSize: 16,
        color: COLORS.text,
    },
    requestSeats: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    requestActions: {
        flexDirection: 'row',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        backgroundColor: COLORS.primary,
    },
    modal: {
        backgroundColor: COLORS.background,
        margin: 20,
        padding: 20,
        borderRadius: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 16,
    },
});
