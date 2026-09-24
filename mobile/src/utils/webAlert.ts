/**
 * React Native's Alert.alert does nothing in a browser, so in the web app
 * every "Saved", every error and every "Are you sure?" would silently vanish.
 * installWebAlert() maps Alert.alert onto the browser's own dialogs (rules in
 * webAlertLogic.ts). Native builds are untouched.
 */
import { Alert, Platform, type AlertButton } from 'react-native';
import { showWebAlert } from './webAlertLogic';

export function installWebAlert(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) =>
    showWebAlert({ alert: (m) => window.alert(m), confirm: (m) => window.confirm(m) }, title, message, buttons);
}
