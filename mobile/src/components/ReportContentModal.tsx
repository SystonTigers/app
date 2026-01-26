import React, { useState } from 'react';
import { Modal, Portal, Text, Button } from 'react-native-paper';
import { View, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../config';
import { Picker } from '@react-native-picker/picker';

interface ReportContentModalProps {
    visible: boolean;
    onDismiss: () => void;
    contentType: 'post' | 'comment';
    contentId: string;
    onReportSuccess: () => void;
}

const REPORT_REASONS = [
    { value: 'spam', label: 'Spam or Advertising' },
    { value: 'harassment', label: 'Harassment or Bullying' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'violence', label: 'Violence or Threats' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'misinformation', label: 'False Information' },
    { value: 'other', label: 'Other' },
];

export function ReportContentModal({
    visible,
    onDismiss,
    contentType,
    contentId,
    onReportSuccess,
}: ReportContentModalProps) {
    const [reason, setReason] = useState('spam');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);

        try {
            // Import dynamically to avoid circular deps
            const { reportContent } = await import('../services/api');
            await reportContent({
                contentType,
                contentId,
                reason,
            });

            Alert.alert(
                'Report Submitted',
                'Thank you for reporting. Our team will review this content.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            onDismiss();
                            onReportSuccess();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Report error:', error);
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'Failed to submit report. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleDismiss = () => {
        if (!submitting) {
            setReason('spam'); // Reset
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
                        <Text style={styles.icon}>🚩</Text>
                        <Text style={styles.title}>Report Content</Text>
                    </View>

                    {/* Description */}
                    <Text style={styles.description}>
                        Help us keep the community safe by reporting content that violates our guidelines.
                    </Text>

                    {/* Reason Picker */}
                    <View style={styles.pickerContainer}>
                        <Text style={styles.label}>Reason for report:</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={reason}
                                onValueChange={(value) => setReason(value)}
                                enabled={!submitting}
                                style={styles.picker}
                            >
                                {REPORT_REASONS.map((r) => (
                                    <Picker.Item key={r.value} label={r.label} value={r.value} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <Button
                            mode="outlined"
                            onPress={handleDismiss}
                            disabled={submitting}
                            style={styles.cancelButton}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSubmit}
                            loading={submitting}
                            disabled={submitting}
                            buttonColor={COLORS.error}
                            style={styles.submitButton}
                        >
                            {submitting ? 'Submitting...' : 'Submit Report'}
                        </Button>
                    </View>
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
        marginBottom: 16,
    },
    icon: {
        fontSize: 48,
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    description: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 24,
        textAlign: 'center',
    },
    pickerContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 8,
        color: COLORS.text,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: COLORS.textLight,
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
    },
    submitButton: {
        flex: 1,
    },
});
