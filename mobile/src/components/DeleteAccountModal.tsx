import React, { useState } from 'react';
import { Modal, Portal, Text, Button, TextInput } from 'react-native-paper';
import { View, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../config';

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
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText.trim().toUpperCase() !== 'DELETE') {
            Alert.alert(
                'Confirmation Required',
                'Please type DELETE to confirm account deletion'
            );
            return;
        }

        Alert.alert(
            'Final Confirmation',
            'Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            // Import the delete function dynamically to avoid circular deps
                            const { deleteAccount } = await import('../services/api');
                            await deleteAccount();

                            Alert.alert(
                                'Account Deleted',
                                'Your account has been permanently deleted. You will now be logged out.',
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
                                'Error',
                                error instanceof Error
                                    ? error.message
                                    : 'Failed to delete account. Please try again or contact support.'
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
                        <Text style={styles.icon}>⚠️</Text>
                        <Text style={styles.title}>Delete Account</Text>
                    </View>

                    {/* Warning Message */}
                    <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>This action is permanent!</Text>
                        <Text style={styles.warningText}>
                            Deleting your account will:
                        </Text>
                        <Text style={styles.bulletPoint}>• Remove all your personal information</Text>
                        <Text style={styles.bulletPoint}>• Delete all your posts and comments</Text>
                        <Text style={styles.bulletPoint}>• Remove you from team rosters</Text>
                        <Text style={styles.bulletPoint}>• Delete your match statistics</Text>
                        <Text style={styles.bulletPoint}>• Cancel any active subscriptions</Text>
                        <Text style={[styles.warningText, { marginTop: 12, fontWeight: '600' }]}>
                            This cannot be undone.
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
                            style={styles.deleteButton}
                        >
                            {deleting ? 'Deleting...' : 'Delete Forever'}
                        </Button>
                    </View>

                    {/* Support Link */}
                    <Text style={styles.supportText}>
                        Need help? Contact support@systontigers.co.uk
                    </Text>
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modal: {
        padding: 20,
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
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
        fontSize: 48,
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.error,
    },
    warningBox: {
        backgroundColor: '#fff3cd',
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 8,
    },
    warningText: {
        fontSize: 14,
        color: '#856404',
        marginBottom: 4,
    },
    bulletPoint: {
        fontSize: 14,
        color: '#856404',
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
        backgroundColor: 'white',
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
});
