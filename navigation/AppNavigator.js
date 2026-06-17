import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, AppState, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InventoryScreen from '../screens/InventoryScreen';
import BillingScreen from '../screens/BillingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LoginScreen from '../screens/LoginScreen';
import useStore from '../store/store';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Inventory: '📦',
  Billing: '🧾',
  History: '📋',
};

function MainTabs() {
  const shopName = useStore((s) => s.shopName);
  const logout = useStore((s) => s.logout);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#8d99ae',
        tabBarStyle: {
          backgroundColor: '#16213e',
          borderTopColor: '#0f3460',
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ color }) => (
          <TabIcon label={TAB_ICONS[route.name]} color={color} />
        ),
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={{ marginRight: 14 }}>
            <Text style={{ color: '#e94560', fontWeight: '600', fontSize: 13 }}>Logout</Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: 'Add Items' }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          title: shopName || 'GEET app',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Order History' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const checkLicense = useStore((s) => s.checkLicense);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finishHydration = () => {
      setHydrated(true);
      try {
        checkLicense();
      } catch (error) {
        console.error('License check failed:', error);
      }
    };

    const persistApi = useStore.persist;
    if (persistApi?.hasHydrated?.()) {
      finishHydration();
      return undefined;
    }

    const unsub = persistApi?.onFinishHydration?.(finishHydration);
    const timeout = setTimeout(finishHydration, 2500);

    return () => {
      unsub?.();
      clearTimeout(timeout);
    };
  }, [checkLicense]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        try {
          checkLicense();
        } catch (error) {
          console.error('License check failed:', error);
        }
      }
    });
    return () => subscription.remove();
  }, [checkLicense]);

  // Auto-logout when the key expires while the app is open.
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return undefined;
    const id = setInterval(() => {
      try {
        checkLicense();
      } catch (error) {
        console.error('License check failed:', error);
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [hydrated, isAuthenticated, checkLicense]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

function TabIcon({ label, color }) {
  return <Text style={{ fontSize: 20, color, lineHeight: 24 }}>{label}</Text>;
}
