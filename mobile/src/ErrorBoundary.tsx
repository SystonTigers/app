import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from './config';
import { reportError } from './services/crashReporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Top-level error boundary. Reports the crash (when crash reporting is on)
 * and shows a friendly retry screen. Technical details are dev-only.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    reportError(error, { componentStack: errorInfo.componentStack });
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            Sorry about that. Tap below to try again. If it keeps happening, close and reopen the app.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
              {this.state.errorInfo && (
                <Text style={styles.stackTrace}>{this.state.errorInfo.componentStack}</Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorBox: {
    marginTop: 32,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: 11,
    color: COLORS.textLight,
    fontFamily: 'monospace',
  },
});
