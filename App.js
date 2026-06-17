import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="light" />
        <AppNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
