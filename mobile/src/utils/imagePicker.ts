import * as ImagePicker from 'expo-image-picker';

/**
 * Image picker utilities for profile pictures
 */

export const imagePicker = {
    /**
     * Request camera permissions
     */
    requestCameraPermission: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Request media library permissions
     */
    requestMediaLibraryPermission: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Pick image from library
     */
    pickImage: async () => {
        const hasPermission = await imagePicker.requestMediaLibraryPermission();
        if (!hasPermission) {
            return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            return result.assets[0].uri;
        }

        return null;
    },

    /**
     * Take photo with camera
     */
    takePhoto: async () => {
        const hasPermission = await imagePicker.requestCameraPermission();
        if (!hasPermission) {
            return null;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            return result.assets[0].uri;
        }

        return null;
    },
};
