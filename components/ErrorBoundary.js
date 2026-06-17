import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error('App error:', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app hit an error. Try reloading. If it keeps happening, clear app data in Expo Go
            and log in again.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry}>
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: '#e94560',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
