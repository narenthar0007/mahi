import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, AppState, View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useLayoutInsets, TAB_BAR_CONTENT_HEIGHT } from '../hooks/useLayoutInsets';
import { Ionicons } from '@expo/vector-icons';
import InventoryScreen from '../screens/InventoryScreen';
import BillingScreen from '../screens/BillingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LoginScreen from '../screens/LoginScreen';
import ShopSettingsModal from '../components/ShopSettingsModal';
import OfflineBanner from '../components/OfflineBanner';
import useStore from '../store/store';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { APP_DISPLAY_NAME, APP_LOGO } from '../utils/appBrand';
import { UI } from '../utils/uiTheme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Inventory: { outline: 'layers-outline', filled: 'layers' },
  Billing: { outline: 'storefront-outline', filled: 'storefront' },
  History: { outline: 'receipt-outline', filled: 'receipt' },
};

function HeaderTitle({ children }) {
  return (
    <View style={navStyles.headerTitleWrap}>
      <Image source={APP_LOGO} style={navStyles.headerLogo} resizeMode="contain" accessibilityLabel={APP_DISPLAY_NAME} />
      <Text style={navStyles.headerTitleText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

function MainTabs() {
  const shopName = useStore((s) => s.shopName);
  const logout = useStore((s) => s.logout);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useLayoutInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <View style={navStyles.root}>
      <OfflineBanner />
      <View style={navStyles.tabs}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: theme.headerColor,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: '#fff',
          headerTitle: (props) => <HeaderTitle>{props.children}</HeaderTitle>,
          headerTitleStyle: { fontWeight: '700', fontSize: 17, letterSpacing: -0.2 },
          tabBarActiveTintColor: theme.buttonColor,
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: UI.surface,
            borderTopWidth: 1,
            borderTopColor: UI.borderLight,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 10,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2, letterSpacing: 0.1 },
          tabBarIcon: ({ color, focused }) => {
            const icons = TAB_ICONS[route.name] || TAB_ICONS.Billing;
            return (
              <View style={navStyles.tabIconWrap}>
                <Ionicons
                  name={focused ? icons.filled : icons.outline}
                  size={24}
                  color={color}
                  style={focused ? navStyles.tabIconActive : navStyles.tabIconInactive}
                />
              </View>
            );
          },
          headerRight: () => (
            <View style={navStyles.headerActions}>
              <TouchableOpacity style={navStyles.headerLink} onPress={() => setSettingsVisible(true)}>
                <Text style={navStyles.headerLinkText}>{t('settings')}</Text>
              </TouchableOpacity>
              <Text style={navStyles.headerDivider}>|</Text>
              <TouchableOpacity style={navStyles.headerLink} onPress={logout}>
                <Text style={navStyles.headerLinkTextMuted}>{t('logout')}</Text>
              </TouchableOpacity>
            </View>
          ),
        })}
      >
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: t('addItems') }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          title: shopName || APP_DISPLAY_NAME,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: t('orderHistory') }}
      />
    </Tab.Navigator>
      </View>
      <ShopSettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
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

const navStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabs: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 10,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '72%',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  headerTitleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  headerLink: {
    paddingVertical: 4,
  },
  headerLinkText: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    fontSize: 13,
  },
  headerLinkTextMuted: {
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    fontSize: 13,
  },
  headerDivider: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
  },
  tabIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconInactive: {
    opacity: 0.85,
  },
  tabIconActive: {
    transform: [{ scale: 1.05 }],
  },
});
