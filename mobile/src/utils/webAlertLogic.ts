/**
 * How an Alert.alert call behaves in a browser (see webAlert.ts).
 * No react-native import so it can be tested in plain Node.
 */
export interface WebAlertButton {
  text?: string;
  style?: string;
  // Called with no value, like a native button tap
  onPress?: (() => void) | ((value?: never) => void);
}

export type BrowserDialogs = {
  alert: (message: string) => void;
  confirm: (message: string) => boolean;
};

/**
 * - no buttons or one button: alert, then that button's onPress
 * - two or more buttons: confirm; OK runs the first non-cancel button,
 *   Cancel runs the cancel button (if any)
 */
export function showWebAlert(dialogs: BrowserDialogs, title: string, message?: string, buttons?: WebAlertButton[]): void {
  const text = [title, message].filter(Boolean).join('\n\n');
  if (!buttons || buttons.length <= 1) {
    dialogs.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancel = buttons.find((b) => b.style === 'cancel');
  const action = buttons.find((b) => b.style !== 'cancel') ?? buttons[0];
  if (dialogs.confirm(text)) {
    action.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}
