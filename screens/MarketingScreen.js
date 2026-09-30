import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import useStore from '../store/store';
import { formatCurrency } from '../utils/currency';
import { sendViaWhatsApp } from '../utils/billShare';
import { showAlert } from '../utils/alert';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { cardStyle, inputStyle, useThemedStyles } from '../utils/uiTheme';
import { useResponsiveLayout } from '../utils/responsive';
import AppEmptyState from '../components/ui/AppEmptyState';
import AppChip from '../components/ui/AppChip';
import {
  MARKETING_TEMPLATE_IDS,
  MARKETING_TEMPLATES_WITH_ITEMS,
  buildMarketingMessage,
  extractMarketingCustomers,
} from '../utils/marketingMessages';

const MAX_FEATURED_ITEMS = 3;

export function MarketingPanel({ embedded = false, bottomPad: bottomPadProp }) {
  const { ui, styles } = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { horizontalPad } = useResponsiveLayout();
  const tabBarHeight = useBottomTabBarHeight();
  const scrollBottomPad = bottomPadProp ?? (embedded ? 24 : tabBarHeight + 32);

  const history = useStore((s) => s.history);
  const inventory = useStore((s) => s.inventory);
  const shopName = useStore((s) => s.shopName);
  const shopOffer = useStore((s) => s.shopOffer);
  const shopWebsite = useStore((s) => s.shopWebsite);
  const menuWebsite = useStore((s) => s.menuWebsite);

  const [templateId, setTemplateId] = useState(MARKETING_TEMPLATE_IDS[0]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [selectedPhones, setSelectedPhones] = useState({});
  const [queueIndex, setQueueIndex] = useState(0);

  const customers = useMemo(
    () => extractMarketingCustomers(history),
    [history]
  );

  const enabledItems = useMemo(
    () => (inventory || []).filter((item) => item && item.enabled !== false),
    [inventory]
  );

  const selectedItems = useMemo(
    () =>
      selectedItemIds
        .map((id) => enabledItems.find((item) => item.id === id))
        .filter(Boolean),
    [selectedItemIds, enabledItems]
  );

  const builtMessage = useMemo(
    () =>
      buildMarketingMessage(templateId, {
        shopName,
        shopOffer,
        formatCurrency,
        selectedItems,
        shopWebsite,
        menuWebsite,
      }),
    [templateId, shopName, shopOffer, selectedItems, shopWebsite, menuWebsite]
  );

  useEffect(() => {
    setIsManuallyEdited(false);
    setDraftMessage(builtMessage);
  }, [templateId]);

  useEffect(() => {
    if (!isManuallyEdited) {
      setDraftMessage(builtMessage);
    }
  }, [builtMessage, isManuallyEdited]);

  const isDraftEdited = isManuallyEdited && draftMessage !== builtMessage;

  const templateLabel = useCallback(
    (id) => {
      const key = `marketingTemplate_${id}`;
      const label = t(key);
      return label === key ? id : label;
    },
    [t]
  );

  const selectedCustomerList = useMemo(
    () => customers.filter((c) => selectedPhones[c.phone]),
    [customers, selectedPhones]
  );

  const queueCustomer = selectedCustomerList[queueIndex] || null;

  const toggleItem = (id) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_FEATURED_ITEMS) {
        showAlert(t('marketingMaxItems'), t('marketingMaxItemsMsg', { count: MAX_FEATURED_ITEMS }));
        return prev;
      }
      return [...prev, id];
    });
  };

  const toggleCustomer = (phone) => {
    setSelectedPhones((prev) => ({
      ...prev,
      [phone]: !prev[phone],
    }));
  };

  const selectAllCustomers = () => {
    const next = {};
    customers.forEach((c) => {
      next[c.phone] = true;
    });
    setSelectedPhones(next);
  };

  const clearCustomerSelection = () => {
    setSelectedPhones({});
    setQueueIndex(0);
  };

  const resetDraft = () => {
    setIsManuallyEdited(false);
    setDraftMessage(builtMessage);
  };

  const handleSendOne = async (customer) => {
    if (!draftMessage.trim()) {
      showAlert(t('marketingEmptyMessage'), t('marketingEmptyMessageMsg'));
      return;
    }
    await sendViaWhatsApp(draftMessage.trim(), customer.phone);
  };

  const handleSendSelected = async () => {
    if (!selectedCustomerList.length) {
      showAlert(t('marketingNoCustomers'), t('marketingNoCustomersSelectedMsg'));
      return;
    }
    setQueueIndex(0);
    await handleSendOne(selectedCustomerList[0]);
  };

  const handleSendNextInQueue = async () => {
    const nextIndex = queueIndex + 1;
    if (nextIndex >= selectedCustomerList.length) {
      showAlert(t('marketingQueueDone'), t('marketingQueueDoneMsg'));
      setQueueIndex(0);
      return;
    }
    setQueueIndex(nextIndex);
    await handleSendOne(selectedCustomerList[nextIndex]);
  };

  const showItemPicker = MARKETING_TEMPLATES_WITH_ITEMS.has(templateId);

  const scroll = (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPad,
            paddingBottom: scrollBottomPad,
            paddingTop: embedded ? 8 : 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!embedded ? (
          <>
            <Text style={[styles.heading, { color: ui.textPrimary }]}>
              {t('marketingTitle')}
            </Text>
            <Text style={styles.subheading}>{t('marketingSubtitle')}</Text>
          </>
        ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('marketingTemplates')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateRow}
            >
              {MARKETING_TEMPLATE_IDS.map((id) => (
                <AppChip
                  key={id}
                  label={templateLabel(id)}
                  selected={templateId === id}
                  onPress={() => {
                    setTemplateId(id);
                  }}
                  color={theme.buttonColor}
                  style={styles.templateChip}
                />
              ))}
            </ScrollView>
          </View>

          {showItemPicker ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('marketingFeaturedItems')}</Text>
              <Text style={styles.hint}>{t('marketingFeaturedItemsHint')}</Text>
              <View style={styles.itemChipRow}>
                {enabledItems.slice(0, 24).map((item) => (
                  <AppChip
                    key={item.id}
                    label={item.name}
                    selected={selectedItemIds.includes(item.id)}
                    onPress={() => toggleItem(item.id)}
                    color={theme.filterSortColor}
                    style={styles.itemChip}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.messageHeader}>
              <Text style={styles.sectionTitle}>{t('marketingMessage')}</Text>
              {isManuallyEdited ? (
                <TouchableOpacity onPress={resetDraft} activeOpacity={0.85}>
                  <Text style={[styles.resetLink, { color: theme.buttonColor }]}>
                    {t('marketingResetTemplate')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {isManuallyEdited ? (
              <Text style={styles.editedHint}>{t('marketingEditedHint')}</Text>
            ) : null}
            <TextInput
              style={styles.messageInput}
              value={draftMessage}
              onChangeText={(text) => {
                setDraftMessage(text);
                setIsManuallyEdited(true);
              }}
              placeholder={t('marketingMessagePlaceholder')}
              placeholderTextColor={ui.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.customerHeader}>
              <Text style={styles.sectionTitle}>
                {t('marketingCustomers', { count: customers.length })}
              </Text>
              <View style={styles.customerActions}>
                <TouchableOpacity onPress={selectAllCustomers} activeOpacity={0.85}>
                  <Text style={[styles.linkBtn, { color: theme.buttonColor }]}>
                    {t('marketingSelectAll')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearCustomerSelection} activeOpacity={0.85}>
                  <Text style={[styles.linkBtn, { color: ui.textMuted }]}>
                    {t('marketingClearSelection')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {customers.length === 0 ? (
              <AppEmptyState
                icon="people-outline"
                title={t('marketingNoCustomers')}
                subtitle={t('marketingNoCustomersSub')}
              />
            ) : (
              customers.map((customer) => {
                const selected = Boolean(selectedPhones[customer.phone]);
                return (
                  <TouchableOpacity
                    key={customer.phone}
                    style={[
                      styles.customerRow,
                      selected && {
                        borderColor: theme.buttonColor,
                        backgroundColor: `${theme.buttonColor}10`,
                      },
                    ]}
                    onPress={() => toggleCustomer(customer.phone)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerPhone}>{customer.displayPhone}</Text>
                      <Text style={styles.customerMeta}>
                        {t('marketingCustomerMeta', {
                          count: customer.orderCount,
                          date: customer.lastOrderAt
                            ? new Date(customer.lastOrderAt).toLocaleDateString()
                            : '—',
                        })}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.checkMark,
                        { color: selected ? theme.buttonColor : ui.textMuted },
                      ]}
                    >
                      {selected ? '✓' : '○'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.actionCard}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.buttonColor }]}
              onPress={handleSendSelected}
              activeOpacity={0.85}
              disabled={!selectedCustomerList.length}
            >
              <Text style={styles.primaryBtnText}>
                {t('marketingSendWhatsApp', { count: selectedCustomerList.length })}
              </Text>
            </TouchableOpacity>

            {selectedCustomerList.length > 1 && queueCustomer ? (
              <View style={styles.queueBox}>
                <Text style={styles.queueText}>
                  {t('marketingQueueProgress', {
                    current: queueIndex + 1,
                    total: selectedCustomerList.length,
                    phone: queueCustomer.displayPhone,
                  })}
                </Text>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: theme.buttonColor }]}
                  onPress={handleSendNextInQueue}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.secondaryBtnText, { color: theme.buttonColor }]}>
                    {t('marketingSendNext')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.note}>{t('marketingSendNote')}</Text>
        </View>
      </ScrollView>
  );

  const body = embedded ? (
    <View style={styles.flex}>{scroll}</View>
  ) : (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll}
    </KeyboardAvoidingView>
  );

  if (embedded) {
    return body;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      {body}
    </SafeAreaView>
  );
}

export default MarketingPanel;

function createStyles(ui) {
  return {
    safe: { flex: 1, backgroundColor: ui.bg },
    flex: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 16 },
    heading: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    subheading: {
      fontSize: 13,
      color: ui.textMuted,
      lineHeight: 19,
      marginBottom: 16,
    },
    card: {
      ...cardStyle(ui),
      padding: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: ui.textPrimary,
      marginBottom: 10,
    },
    hint: {
      fontSize: 12,
      color: ui.textMuted,
      marginBottom: 10,
      lineHeight: 17,
    },
    templateRow: {
      gap: 8,
      paddingRight: 4,
    },
    templateChip: {
      marginRight: 0,
    },
    itemChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    itemChip: {
      marginBottom: 0,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 4,
    },
    resetLink: {
      fontSize: 13,
      fontWeight: '700',
    },
    editedHint: {
      fontSize: 11,
      color: ui.warning,
      marginBottom: 8,
      fontWeight: '600',
    },
    messageInput: {
      ...inputStyle(ui, {
        minHeight: 160,
        paddingTop: 12,
        textAlignVertical: 'top',
      }),
    },
    customerHeader: {
      marginBottom: 8,
    },
    customerActions: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 4,
      marginBottom: 8,
    },
    linkBtn: {
      fontSize: 13,
      fontWeight: '700',
    },
    customerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: ui.radiusMd,
      borderWidth: 1,
      borderColor: ui.borderLight,
      marginBottom: 8,
      backgroundColor: ui.surfaceMuted,
    },
    customerInfo: { flex: 1, paddingRight: 8 },
    customerPhone: {
      fontSize: 15,
      fontWeight: '700',
      color: ui.textPrimary,
    },
    customerMeta: {
      fontSize: 12,
      color: ui.textMuted,
      marginTop: 2,
    },
    checkMark: {
      fontSize: 18,
      fontWeight: '700',
    },
    actionCard: {
      ...cardStyle(ui),
      padding: 16,
      marginBottom: 12,
    },
    primaryBtn: {
      paddingVertical: 14,
      borderRadius: ui.radiusMd,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryBtn: {
      marginTop: 10,
      paddingVertical: 12,
      borderRadius: ui.radiusMd,
      alignItems: 'center',
      borderWidth: 1.5,
      backgroundColor: ui.surface,
    },
    secondaryBtnText: {
      fontSize: 15,
      fontWeight: '700',
    },
    queueBox: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: ui.borderLight,
    },
    queueText: {
      fontSize: 13,
      color: ui.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    note: {
      fontSize: 11,
      color: ui.textMuted,
      lineHeight: 16,
      marginTop: 12,
    },
  };
}
