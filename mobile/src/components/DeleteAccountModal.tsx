import React, { useState } from 'react';
import { Modal, Portal, Text, Button, TextInput } from 'react-native-paper';
import { View, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SUPPORT_EMAIL } from '../config';
import { useClubName } from '../context/ClubContext';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';

interface DeleteAccountModalProps {
    visible: boolean;
    onDismiss: () => void;
    onDeleteSuccess: () => void;
}

export function DeleteAccountModal({
    visible,
    onDismiss,
    onDeleteSuccess
}: DeleteAccountModalProps) {
    const COLORS = useBrandColors();
    const styles = useStyles();
    const clubName = useClubName();
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText.trim().toUpperCase() !== 'DELETE') {
            Alert.alert('Type DELETE first', 'Type DELETE in the box to confirm.');
            return;
        }

        Alert.alert(
            'Delete your account?',
            "This can't be undone. Your account and everything listed will be removed.",
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete my account',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            // Import the delete function dynamically to avoid circular deps
                            const { deleteAccount } = await import('../services/api');
                            await deleteAccount();

                            Alert.alert(
                                'Account deleted',
                                'Your account has been deleted. You will now be logged out.',
                                [
                                    {
                                        text: 'OK',
                                        onPress: onDeleteSuccess,
                                    },
                                ]
                            );
                        } catch (error) {
                            console.error('Delete account error:', error);
                            Alert.alert(
                                "That didn't work",
                                error instanceof Error && error.message
                                    ? error.message
                                    : 'Your account was not deleted. Please try again.'
                            );
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleDismiss = () => {
        if (!deleting) {
            setConfirmText('');
            onDismiss();
        }
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleDismiss}
                contentContainerStyle={styles.modal}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <MaterialCommunityIcons name="alert" size={48} color={COLORS.error} style={styles.icon} />
                        <Text style={styles.title}>Delete account</Text>
                    </View>

                    {/* Warning Message */}
                    <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>This is permanent</Text>
                        <Text style={styles.warningText}>
                            Deleting your account will:
                        </Text>
                        <Text style={styles.bulletPoint}>• Remove your account, name and email</Text>
                        <Text style={styles.bulletPoint}>• Unlink you from any players you&apos;re linked to</Text>
                        <Text style={styles.bulletPoint}>• Remove your votes, replies and predictions</Text>
                        <Text style={styles.bulletPoint}>• Remove your comments</Text>
                        <Text style={[styles.warningText, { marginTop: 12 }]}>
                            Players&apos; match stats belong to the club&apos;s squad and stay.
                        </Text>
                    </View>

                    {/* Confirmation Input */}
                    <View style={styles.confirmSection}>
                        <Text style={styles.confirmLabel}>
                            Type <Text style={styles.deleteText}>DELETE</Text> to confirm:
                        </Text>
                        <TextInput
                            mode="outlined"
                            value={confirmText}
                            onChangeText={setConfirmText}
                            placeholder="Type DELETE"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            style={styles.input}
                            disabled={deleting}
                            outlineColor={COLORS.error}
                            activeOutlineColor={COLORS.error}
                        />
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <Button
                            mode="outlined"
                            onPress={handleDismiss}
                            disabled={deleting}
                            style={styles.cancelButton}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleDelete}
                            loading={deleting}
                            disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                            buttonColor={COLORS.error}
                            textColor="#FFFFFF"
                            style={styles.deleteButton}
                            accessibilityLabel="Delete my account forever"
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </View>

                    {/* Support Link */}
                    <Text style={styles.supportText}>
                        {SUPPORT_EMAIL
                            ? `Need help? Email ${SUPPORT_EMAIL}.`
                            : `Need help? Ask ${clubName}'s manager.`}
                    </Text>
                </View>
            </Modal>
        </Portal>
    );
}

const useStyles = themedStyles((COLORS) => ({
    modal: {
        padding: 20,
    },
    container: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        padding: 24,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    icon: {
        marginBottom: 8,
    },
    title: {
        fontFamily: FONTS.display,
        fontSize: 28,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: COLORS.error,
    },
    warningBox: {
        backgroundColor: 'rgba(255,0,85,0.14)',
        borderLeftWidth: 4,
        borderLeftColor: COLORS.error,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    warningText: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 4,
    },
    bulletPoint: {
        fontSize: 14,
        color: COLORS.textLight,
        marginLeft: 8,
        marginBottom: 4,
    },
    confirmSection: {
        marginBottom: 24,
    },
    confirmLabel: {
        fontSize: 15,
        marginBottom: 8,
        color: COLORS.text,
    },
    deleteText: {
        fontWeight: 'bold',
        color: COLORS.error,
        fontFamily: 'monospace',
    },
    input: {
        backgroundColor: COLORS.surfaceRaised,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    cancelButton: {
        flex: 1,
    },
    deleteButton: {
        flex: 1,
    },
    supportText: {
        textAlign: 'center',
        fontSize: 12,
        color: COLORS.textLight,
    },
}));
