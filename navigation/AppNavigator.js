import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Text,
  TouchableOpacity,
  AppState,
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  Platform,
} from 'react-native';

import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useLayoutInsets,
  TAB_BAR_CONTENT_HEIGHT,
} from '../hooks/useLayoutInsets';

import { Ionicons } from '@expo/vector-icons';

import InventoryScreen from '../screens/InventoryScreen';
import BillingScreen from '../screens/BillingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LoginScreen from '../screens/LoginScreen';

import ShopSettingsModal from '../components/ShopSettingsModal';
import TableManagementModal from '../components/TableManagementModal';
import TableBookerModal from '../components/TableBookerModal';
import DeviceSyncModal from '../components/DeviceSyncModal';
import OfflineBanner from '../components/OfflineBanner';

import useStore from '../store/store';

import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import {
  APP_DISPLAY_NAME,
  APP_LOGO,
} from '../utils/appBrand';
import { useUI } from '../utils/uiTheme';
import { showAlert } from '../utils/alert';

const Tab = createBottomTabNavigator();

const navigationRef = createNavigationContainerRef();

const TAB_ICONS = {
  Inventory: {
    outline: 'layers-outline',
    filled: 'layers',
  },
  Billing: {
    outline: 'storefront-outline',
    filled: 'storefront',
  },
  History: {
    outline: 'receipt-outline',
    filled: 'receipt',
  },
};

/* =========================================================
   APP HEADER
========================================================= */

function AppHeader({
  title,
  backgroundColor,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  tableMenuItems = [],
  baseMenuItems = [],
}) {
  const safeInsets = useSafeAreaInsets();
  const ui = useUI();

  const enableTables = useStore(
    (s) => s.enableTables !== false
  );

  const menuItems = useMemo(
    () => [
      ...(enableTables ? tableMenuItems : []),
      ...baseMenuItems,
    ],
    [enableTables, tableMenuItems, baseMenuItems]
  );

  return (
    <View
      style={[
        navStyles.headerRoot,
        {
          backgroundColor,
          paddingTop: safeInsets.top,
        },
      ]}
    >
      {/* HEADER */}
      <View style={navStyles.headerInner}>
        <View style={navStyles.headerBrand}>
          {APP_LOGO ? (
            <Image
              source={APP_LOGO}
              style={navStyles.headerLogo}
              resizeMode="contain"
            />
          ) : null}

          <Text
            style={navStyles.headerTitleText}
            numberOfLines={1}
          >
            {title || APP_DISPLAY_NAME}
          </Text>
        </View>

        <TouchableOpacity
          style={navStyles.menuBtn}
          onPress={onOpenMenu}
          activeOpacity={0.75}
        >
          <Ionicons
            name="menu"
            size={25}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* MENU */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={onCloseMenu}
      >
        <View
          style={[
            navStyles.menuOverlay,
            {
              backgroundColor: ui.overlay,
            },
          ]}
        >
          {/* CLOSE WHEN PRESSING OUTSIDE */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onCloseMenu}
          />

          {/* MENU SHEET */}
          <View
            style={[
              navStyles.menuSheet,
              {
                top: safeInsets.top + 48,
                backgroundColor: ui.menuSheet,
                borderColor: ui.border,
              },
            ]}
          >
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  navStyles.menuItem,
                  {
                    borderBottomColor: ui.borderLight,
                  },
                  index === menuItems.length - 1 &&
                    navStyles.menuItemLast,
                ]}
                onPress={() => {
                  onCloseMenu();

                  setTimeout(() => {
                    item.onPress?.();
                  }, 0);
                }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={
                    item.danger
                      ? '#dc2626'
                      : ui.textPrimary
                  }
                />

                <Text
                  style={[
                    navStyles.menuItemText,
                    {
                      color: ui.textPrimary,
                    },
                    item.danger &&
                      navStyles.menuItemTextDanger,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   MAIN TABS
========================================================= */

function MainTabs() {
  const logout = useStore(
    (s) => s.logout
  );

  const enableTables = useStore(
    (s) => s.enableTables !== false
  );

  const clearActiveTable = useStore(
    (s) => s.clearActiveTable
  );

  const theme = useAppTheme();
  const ui = useUI();
  const { t } = useTranslation();

  const insets = useLayoutInsets();

  const tabBarHeight =
    TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  const [
    settingsVisible,
    setSettingsVisible,
  ] = useState(false);

  const [
    tablesVisible,
    setTablesVisible,
  ] = useState(false);

  const [
    tableBookerVisible,
    setTableBookerVisible,
  ] = useState(false);

  const [
    syncVisible,
    setSyncVisible,
  ] = useState(false);

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  /* =======================================================
     TABLE FEATURE DISABLED
  ======================================================= */

  useEffect(() => {
    if (enableTables) {
      return;
    }

    setTablesVisible(false);
    setTableBookerVisible(false);
    setSyncVisible(false);

    clearActiveTable();
  }, [
    enableTables,
    clearActiveTable,
  ]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigateTab = useCallback((routeName) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(routeName);
    }
  }, []);

  /* =======================================================
     SCREEN TITLES
  ======================================================= */

  const screenTitles = useMemo(
    () => ({
      Inventory: t('itemInventory'),
      Billing: t('pos'),
      History: t('orderHistory'),
    }),
    [t]
  );

  /* =======================================================
     TABLE MENU
  ======================================================= */

  const handleOpenMenu = useCallback(() => setMenuOpen(true), []);
  const handleCloseMenu = useCallback(() => setMenuOpen(false), []);

  const tableMenuItems = useMemo(
    () => [
      {
        key: 'tableBooker',
        label: t('tableBooker'),
        icon: 'people-outline',
        onPress: () => {
          setTableBookerVisible(true);
        },
      },

      {
        key: 'tables',
        label: t('tables'),
        icon: 'grid-outline',
        onPress: () => {
          setTablesVisible(true);
        },
      },

      {
        key: 'sync',
        label: t('sync'),
        icon: 'sync-outline',
        onPress: () => {
          setSyncVisible(true);
        },
      },
    ],
    [t]
  );

  /* =======================================================
     BASE MENU
  ======================================================= */

  const baseMenuItems = useMemo(
    () => [
      {
        key: 'settings',
        label: t('settings'),
        icon: 'settings-outline',
        onPress: () => {
          setSettingsVisible(true);
        },
      },

      {
        key: 'logout',
        label: t('logout'),
        icon: 'log-out-outline',
        onPress: logout,
        danger: true,
      },
    ],
    [t, logout]
  );

  const renderHeader = useCallback(
    ({ route }) => {
      const title =
        screenTitles[route.name] ||
        route.name;

      return (
        <AppHeader
          title={title}
          backgroundColor={
            theme.headerColor
          }
          menuOpen={menuOpen}
          onOpenMenu={handleOpenMenu}
          onCloseMenu={handleCloseMenu}
          tableMenuItems={
            tableMenuItems
          }
          baseMenuItems={
            baseMenuItems
          }
        />
      );
    },
    [screenTitles, theme.headerColor, menuOpen, handleOpenMenu, handleCloseMenu, tableMenuItems, baseMenuItems]
  );

  /* =======================================================
     TABS
  ======================================================= */

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          header: () => renderHeader({ route }),

          tabBarActiveTintColor:
            theme.buttonColor,

          tabBarInactiveTintColor:
            ui.textMuted,

          tabBarStyle: {
            backgroundColor:
              ui.surface,

            borderTopWidth: 1,

            borderTopColor:
              ui.borderLight,

            height: tabBarHeight,

            paddingBottom:
              insets.bottom,

            paddingTop: 10,

            elevation: 0,

            shadowOpacity: 0,
          },

          tabBarItemStyle: {
            paddingVertical: 2,
          },

          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginBottom: 2,
            letterSpacing: 0.1,
          },

          tabBarIcon: ({
            color,
            focused,
          }) => {
            const icons =
              TAB_ICONS[route.name] ||
              TAB_ICONS.Billing;

            return (
              <Ionicons
                name={
                  focused
                    ? icons.filled
                    : icons.outline
                }
                size={24}
                color={color}
                style={
                  focused
                    ? navStyles.tabIconActive
                    : navStyles.tabIconInactive
                }
              />
            );
          },
        })}
      >
        {/* INVENTORY */}
        <Tab.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{
            tabBarLabel: t(
              'tabInventory'
            ),
          }}
        />

        {/* BILLING */}
        <Tab.Screen
          name="Billing"
          component={BillingScreen}
          options={{
            tabBarLabel: t('pos'),
          }}
        />

        {/* HISTORY */}
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarLabel: t(
              'tabHistory'
            ),
          }}
        />
      </Tab.Navigator>

      {/* ===================================================
          SETTINGS MODAL
      =================================================== */}

      <ShopSettingsModal
        visible={settingsVisible}
        onClose={() =>
          setSettingsVisible(false)
        }
      />

      {/* ===================================================
          TABLE MODALS
      =================================================== */}

      {enableTables ? (
        <>
          <TableBookerModal
            visible={
              tableBookerVisible
            }
            onClose={() =>
              setTableBookerVisible(
                false
              )
            }
            onStartOrder={(table) => {
              navigateTab('Billing');

              showAlert(
                t(
                  'tableSelectedTitle'
                ),
                t(
                  'tableSelectedMsg',
                  {
                    number:
                      table?.number ||
                      '',
                  }
                )
              );
            }}
          />

          <TableManagementModal
            visible={
              tablesVisible
            }
            onClose={() =>
              setTablesVisible(
                false
              )
            }
            onStartOrder={(table) => {
              navigateTab('Billing');

              showAlert(
                t(
                  'tableSelectedTitle'
                ),
                t(
                  'tableSelectedMsg',
                  {
                    number:
                      table?.number ||
                      '',
                  }
                )
              );
            }}
            onCheckoutOrder={(table) => {
              navigateTab('Billing');

              showAlert(
                t('checkoutOrderNowTitle'),
                t('checkoutOrderNowMsg', {
                  number: table?.number || '',
                })
              );
            }}
            onViewHistory={() => {
              navigateTab('History');
            }}
          />

          <DeviceSyncModal
            visible={syncVisible}
            onClose={() =>
              setSyncVisible(false)
            }
          />
        </>
      ) : null}
    </>
  );
}

/* =========================================================
   APP NAVIGATOR
========================================================= */

export default function AppNavigator() {
  const isAuthenticated =
    useStore(
      (s) => s.isAuthenticated
    );

  const checkLicense =
    useStore(
      (s) => s.checkLicense
    );

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  /* =======================================================
     STORE HYDRATION
  ======================================================= */

  useEffect(() => {
    const finishHydration = () => {
      setHydrated(true);

      try {
        checkLicense();
      } catch (error) {
        console.error(
          'License check failed:',
          error
        );
      }
    };

    const persistApi =
      useStore.persist;

    if (
      persistApi?.hasHydrated?.()
    ) {
      finishHydration();

      return undefined;
    }

    const unsubscribe =
      persistApi?.onFinishHydration?.(
        finishHydration
      );

    const timeout =
      setTimeout(
        finishHydration,
        2500
      );

    return () => {
      unsubscribe?.();
      clearTimeout(timeout);
    };
  }, [checkLicense]);

  /* =======================================================
     APP STATE / LICENSE
  ======================================================= */

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (state) => {
          if (state === 'active') {
            try {
              checkLicense();
            } catch (error) {
              console.error(
                'License check failed:',
                error
              );
            }
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [checkLicense]);

  /* =======================================================
     AUTO LICENSE CHECK
  ======================================================= */

  useEffect(() => {
    if (
      !hydrated ||
      !isAuthenticated
    ) {
      return undefined;
    }

    const interval =
      setInterval(() => {
        try {
          checkLicense();
        } catch (error) {
          console.error(
            'License check failed:',
            error
          );
        }
      }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [
    hydrated,
    isAuthenticated,
    checkLicense,
  ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (!hydrated) {
    return (
      <View
        style={
          navStyles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#ffffff"
        />

        <Text
          style={
            navStyles.loadingText
          }
        >
          Loading...
        </Text>
      </View>
    );
  }

  /* =======================================================
     MAIN NAVIGATION
  ======================================================= */

  return (
    <NavigationContainer
      ref={navigationRef}
    >
      {isAuthenticated ? (
        <>
          <MainTabs />
          <OfflineBanner />
        </>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}

/* =========================================================
   STYLES
========================================================= */

const navStyles = StyleSheet.create({
  root: {
    flex: 1,
  },

  tabs: {
    flex: 1,
  },

  /* HEADER */

  headerRoot: {
    width: '100%',
    borderBottomWidth: 0,
  },

  headerInner: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    gap: 12,
  },

  headerBrand: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,

    flexShrink: 1,

    minWidth: 0,
  },

  headerLogo: {
    width: 28,
    height: 28,

    borderRadius: 6,

    backgroundColor:
      'rgba(255,255,255,0.95)',

    flexShrink: 0,
  },

  headerTitleText: {
    color: '#fff',

    fontWeight: '700',

    fontSize: 17,

    letterSpacing: -0.2,

    flexShrink: 1,
  },

  menuBtn: {
    width: 40,
    height: 40,

    borderRadius: 10,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor:
      'rgba(255,255,255,0.12)',
  },

  /* MENU */

  menuOverlay: {
    flex: 1,
  },

  menuSheet: {
    position: 'absolute',

    right: 12,

    minWidth: 200,

    borderRadius: 14,

    paddingVertical: 6,

    borderWidth: 1,

    ...Platform.select({
      ios: {
        shadowColor: '#000',

        shadowOpacity: 0.18,

        shadowRadius: 12,

        shadowOffset: {
          width: 0,
          height: 6,
        },
      },

      android: {
        elevation: 8,
      },

      default: {},
    }),
  },

  menuItem: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

    paddingHorizontal: 16,

    paddingVertical: 13,

    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },

  menuItemLast: {
    borderBottomWidth: 0,
  },

  menuItemText: {
    fontSize: 15,

    fontWeight: '600',
  },

  menuItemTextDanger: {
    color: '#dc2626',
  },

  /* TAB ICON */

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
    transform: [
      {
        scale: 1.05,
      },
    ],
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: '#1a1a2e',
  },

  loadingText: {
    marginTop: 12,

    color: '#ffffff',

    fontSize: 14,

    fontWeight: '600',
  },
});