import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import useStore from '../store/store';
import ShareBillButtons from '../components/ShareBillButtons';
import { formatCurrency } from '../utils/currency';
import {
  formatOrderReadyMessage,
  getCustomerPhoneValidationMessage,
  sanitizeCustomerPhoneInput,
  CUSTOMER_PHONE_MAX_LENGTH,
  normalizePhoneNumber,
  sendViaWhatsApp,
} from '../utils/billShare';
import { showAlert, confirmAction } from '../utils/alert';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { cardStyle, useThemedStyles } from '../utils/uiTheme';
import {
  filterOrdersByDateRange,
  getExportSummary,
  shareOrderExport,
  startOfDay,
  endOfDay,
} from '../utils/orderExport';
import SalesStatsModal from '../components/SalesStatsModal';
import MarketingModal from '../components/MarketingModal';
import EditOrderModal from '../components/EditOrderModal';
import AppEmptyState from '../components/ui/AppEmptyState';
import AppChip from '../components/ui/AppChip';
import {
  TABLE_COLORS,
  getTableOrderHistoryStyle,
  isRunningTableOrder,
  filterOrdersByTableScope,
  getActiveTablesForOrderFilter,
} from '../utils/tableManagement';

const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateInput = (date) => date.toISOString().slice(0, 10);

const formatDateLabel = (date) =>
  date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const DateTimePicker =
  Platform.OS !== 'web'
    ? require('@react-native-community/datetimepicker').default
    : null;

function getPresetRange(presetId) {
  const today = new Date();
  switch (presetId) {
    case 'today':
      return { from: startOfDay(today), to: endOfDay(today) };
    case 'week': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(today) };
    }
    case 'month': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: startOfDay(from), to: endOfDay(today) };
    }
    default:
      return { from: new Date(2020, 0, 1), to: endOfDay(today) };
  }
}

export default function HistoryScreen() {
  const { ui, styles } = useThemedStyles(createStyles);
  const history = useStore((s) => s.history);
  const tables = useStore((s) => s.tables);
  const enableTables = useStore((s) => s.enableTables);
  const enableDueOrders = useStore((s) => s.enableDueOrders);
  const shopName = useStore((s) => s.shopName);
  const updateOrderCustomerPhone = useStore((s) => s.updateOrderCustomerPhone);
  const updateOrderItems = useStore((s) => s.updateOrderItems);
  const toggleOrderPaid = useStore((s) => s.toggleOrderPaid);
  const markOrderWrong = useStore((s) => s.markOrderWrong);
  const markOrderReady = useStore((s) => s.markOrderReady);
  const theme = useAppTheme();
  const { t, datePresets, language } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const listBottomPad = useMemo(() => tabBarHeight + 24, [tabBarHeight]);
  const listContentStyle = useMemo(
    () => [styles.list, { paddingBottom: listBottomPad }],
    [styles.list, listBottomPad]
  );

  const [fromDate, setFromDate] = useState(startOfDay(new Date()));
  const [toDate, setToDate] = useState(endOfDay(new Date()));
  const [activePreset, setActivePreset] = useState('today');
  const [pickerMode, setPickerMode] = useState(null);
  const [editingOrderKey, setEditingOrderKey] = useState(null);
  const [editingPhone, setEditingPhone] = useState('');
  const [statsVisible, setStatsVisible] = useState(false);
  const [marketingVisible, setMarketingVisible] = useState(false);
  const [menuOrder, setMenuOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [orderScope, setOrderScope] = useState('all');
  const [selectedTableId, setSelectedTableId] = useState(null);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [history]
  );

  const activeFilterTables = useMemo(
    () => getActiveTablesForOrderFilter(tables, history),
    [tables, history]
  );

  const tableFilterChips = useMemo(() => {
    if (activeFilterTables.length > 0) return activeFilterTables;
    return [...(Array.isArray(tables) ? tables : [])].sort((a, b) =>
      String(a.number).localeCompare(String(b.number), undefined, { numeric: true })
    );
  }, [activeFilterTables, tables]);

  const filteredOrders = useMemo(
    () =>
      filterOrdersByTableScope(sortedHistory, {
        scope: orderScope,
        tableId: selectedTableId,
      }),
    [sortedHistory, orderScope, selectedTableId]
  );

  const filteredForExport = useMemo(
    () =>
      filterOrdersByDateRange(sortedHistory, fromDate, toDate).filter(
        (order) => order && !order.isWrongOrder
      ),
    [sortedHistory, fromDate, toDate]
  );

  const exportSummary = useMemo(
    () => getExportSummary(filteredForExport),
    [filteredForExport]
  );

  const applyPreset = (presetId) => {
    const range = getPresetRange(presetId);
    setFromDate(range.from);
    setToDate(range.to);
    setActivePreset(presetId);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setPickerMode(null);
    }
    if (event.type === 'dismissed' || !selectedDate) return;

    if (pickerMode === 'from') {
      setFromDate(startOfDay(selectedDate));
      setActivePreset(null);
    } else if (pickerMode === 'to') {
      setToDate(endOfDay(selectedDate));
      setActivePreset(null);
    }
  };

  const handleWebDateChange = (mode, value) => {
    if (!value) return;
    const selected = new Date(`${value}T12:00:00`);
    if (Number.isNaN(selected.getTime())) return;

    if (mode === 'from') {
      setFromDate(startOfDay(selected));
      setActivePreset(null);
    } else {
      setToDate(endOfDay(selected));
      setActivePreset(null);
    }
  };

  const handleExportPdf = useCallback(async () => {
    if (fromDate > toDate) {
      Alert.alert(t('invalidRange'), t('invalidRangeMsg'));
      return;
    }

    if (filteredForExport.length === 0) {
      Alert.alert(t('noOrders'), t('noOrdersMsg'));
      return;
    }

    try {
      await shareOrderExport({
        orders: filteredForExport,
        shopName,
        fromDate,
        toDate,
        format: 'pdf',
      });
    } catch (error) {
      if (error?.message === 'sharing_unavailable') {
        Alert.alert(t('exportFailed'), t('sharingUnavailable'));
      } else {
        Alert.alert(t('exportFailed'), t('exportTableFailed'));
      }
    }
  }, [fromDate, toDate, filteredForExport, shopName, t]);

  const exportPanel = useMemo(
    () => (
    <View style={styles.exportPanel}>
      <View style={styles.exportHeaderRow}>
        <Text style={styles.exportTitle} numberOfLines={1}>
          {t('exportOrders')}
        </Text>

        <View style={styles.exportHeaderActions}>
          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              styles.headerActionBtnSecondary,
              { borderColor: theme.filterSortColor },
            ]}
            onPress={() => setStatsVisible(true)}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.headerActionText, { color: theme.filterSortColor }]}
              numberOfLines={1}
            >
              {t('viewStatistics')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              styles.headerActionBtnSecondary,
              { borderColor: theme.filterSortColor },
            ]}
            onPress={() => setMarketingVisible(true)}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.headerActionText, { color: theme.filterSortColor }]}
              numberOfLines={1}
            >
              {t('marketingTitle')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              { backgroundColor: theme.buttonColor },
            ]}
            onPress={handleExportPdf}
            activeOpacity={0.85}
          >
            <Text style={styles.headerActionTextPrimary} numberOfLines={1}>
              {t('exportPdf')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.presetRow}>
        {datePresets.map((preset) => (
          <AppChip
            key={preset.id}
            label={preset.label}
            selected={activePreset === preset.id}
            onPress={() => applyPreset(preset.id)}
            color={theme.filterSortColor}
            style={styles.presetChip}
          />
        ))}
      </View>

      <View style={styles.dateRow}>
        {Platform.OS === 'web' ? (
          <>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>{t('from')}</Text>
              <TextInput
                style={styles.webDateInput}
                value={formatDateInput(fromDate)}
                onChangeText={(value) => handleWebDateChange('from', value)}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <Text style={styles.dateArrow}>→</Text>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>{t('to')}</Text>
              <TextInput
                style={styles.webDateInput}
                value={formatDateInput(toDate)}
                onChangeText={(value) => handleWebDateChange('to', value)}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerMode('from')}>
              <Text style={styles.dateLabel}>{t('from')}</Text>
              <Text style={styles.dateValue}>{formatDateLabel(fromDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateArrow}>→</Text>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerMode('to')}>
              <Text style={styles.dateLabel}>{t('to')}</Text>
              <Text style={styles.dateValue}>{formatDateLabel(toDate)}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {pickerMode && DateTimePicker && (
        <DateTimePicker
          value={pickerMode === 'from' ? fromDate : toDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {Platform.OS === 'ios' && pickerMode && (
        <TouchableOpacity style={styles.donePickerBtn} onPress={() => setPickerMode(null)}>
          <Text style={[styles.donePickerText, { color: theme.buttonColor }]}>{t('done')}</Text>
        </TouchableOpacity>
      )}

      {enableTables !== false || sortedHistory.some((order) => order?.isTableOrder || order?.tableId) ? (
        <View style={styles.orderFilterBlock}>
          <View style={styles.orderFilterRow}>
            {[
              { id: 'all', label: t('orderFilterAll') },
              { id: 'table', label: t('orderFilterTable') },
              { id: 'noTable', label: t('orderFilterNoTable') },
            ].map((option) => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={orderScope === option.id && !selectedTableId}
                onPress={() => {
                  setOrderScope(option.id);
                  setSelectedTableId(null);
                }}
                color={theme.filterSortColor}
                style={styles.orderFilterChip}
              />
            ))}
          </View>
          {enableTables !== false && tableFilterChips.length > 0 ? (
            <>
              <Text style={styles.orderFilterLabel}>
                {activeFilterTables.length > 0 ? t('orderFilterActiveTables') : t('tables')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activeTableRow}
              >
                {tableFilterChips.map((table) => (
                  <AppChip
                    key={table.id}
                    label={table.number}
                    selected={selectedTableId === table.id}
                    onPress={() => {
                      setSelectedTableId((current) => {
                        if (current === table.id) return null;
                        return table.id;
                      });
                      setOrderScope('table');
                    }}
                    color={TABLE_COLORS.historyTableOrder.swatch}
                    style={styles.activeTableChip}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.exportMeta}>
        {t('exportMeta', {
          count: exportSummary.orderCount,
          total: formatCurrency(exportSummary.totalRevenue),
        })}
      </Text>
    </View>
    ),
    [
      styles,
      t,
      theme.filterSortColor,
      theme.buttonColor,
      datePresets,
      activePreset,
      fromDate,
      toDate,
      pickerMode,
      exportSummary,
      handleExportPdf,
      applyPreset,
      handleWebDateChange,
      handleDateChange,
      enableTables,
      sortedHistory,
      orderScope,
      selectedTableId,
      activeFilterTables,
      tableFilterChips,
    ]
  );

  const handleOrderReady = (order) => {
    markOrderReady(order.id);

    const message = formatOrderReadyMessage({
      items: order.items || [],
      totalAmount: order.totalAmount || 0,
      orderId: order.orderId || order.id,
      shopName,
      itemCount: order.itemCount || 0,
    });

    if (!order.customerPhone) {
      Alert.alert(
        t('noNumber'),
        t('noNumberOrderReadyMsg'),
        [{ text: t('ok'), onPress: () => sendViaWhatsApp(message) }]
      );
      return;
    }

    sendViaWhatsApp(message, normalizePhoneNumber(order.customerPhone) || order.customerPhone);
  };

  const handleMarkPaid = (order) => {
    if (order.isPaid) {
      showAlert(t('paidLockedTitle'), t('paidLockedMsg'));
      return;
    }
    if (order.isWrongOrder) {
      showAlert(t('wrongOrderLockedTitle'), t('wrongOrderLockedMsg'));
      return;
    }
    const result = toggleOrderPaid(order.id);
    if (result?.error === 'paid_locked') {
      showAlert(t('paidLockedTitle'), t('paidLockedMsg'));
    } else if (result?.error === 'wrong_locked') {
      showAlert(t('wrongOrderLockedTitle'), t('wrongOrderLockedMsg'));
    }
  };

  const handleDueReminder = (order) => {
    if (!order?.isDue || order.isPaid) {
      return;
    }
    const phone = normalizePhoneNumber(order.customerPhone || '');
    if (!phone) {
      showAlert(t('noWhatsAppNumber'), t('noWhatsAppNumberMsg'));
      return;
    }
    const message = t('dueReminderWhatsAppBody', {
      shop: shopName || 'Shop',
      amount: formatCurrency(order.totalAmount),
      orderId: order.orderId || order.id || '',
      date: formatDateTime(order.timestamp),
    });
    sendViaWhatsApp(message, phone);
  };

  const handleWrongOrder = (order) => {
    if (order.isPaid) {
      showAlert(t('wrongOrderPaidTitle'), t('wrongOrderPaidMsg'));
      return;
    }

    if (order.isWrongOrder) {
      const result = markOrderWrong(order.id, false);
      if (!result?.success) {
        if (result?.error === 'paid_locked') {
          showAlert(t('wrongOrderPaidTitle'), t('wrongOrderPaidMsg'));
        }
        return;
      }
      showAlert(t('wrongOrderUndoneTitle'), t('wrongOrderUndoneMsg'));
      return;
    }

    confirmAction(
      t('wrongOrderConfirmTitle'),
      t('wrongOrderConfirmMsg'),
      () => {
        const result = markOrderWrong(order.id, true);
        if (!result?.success) {
          if (result?.error === 'paid_locked') {
            showAlert(t('wrongOrderPaidTitle'), t('wrongOrderPaidMsg'));
          } else {
            showAlert(t('validation'), t('wrongOrderFailed'));
          }
        }
      },
      t('markWrongOrder')
    );
  };

  const openOrderMenu = (order) => {
    setMenuOrder(order);
  };

  const handleEditOrderFromMenu = () => {
    const order = menuOrder;
    setMenuOrder(null);
    if (!order) return;
    if (order.isPaid) {
      showAlert(t('editOrderLockedTitle'), t('editOrderLockedMsg'));
      return;
    }
    setEditOrder(order);
  };

  const handleSaveEditedOrder = (nextItems, nextOrderNote) => {
    if (!editOrder) return;
    const result = updateOrderItems(editOrder.id, nextItems, {
      orderNote: nextOrderNote,
    });
    if (!result?.success) {
      if (result?.error === 'paid_locked') {
        showAlert(t('editOrderLockedTitle'), t('editOrderLockedMsg'));
      } else if (result?.error === 'empty_items') {
        showAlert(t('validation'), t('editOrderNeedItem'));
      } else {
        showAlert(t('validation'), t('editOrderFailed'));
      }
      return;
    }
    setEditOrder(null);
    showAlert(t('saved'), t('orderUpdated'));
  };

  const beginPhoneEdit = (order) => {
    setEditingOrderKey(order.id);
    setEditingPhone(order.customerPhone || '');
  };

  const cancelPhoneEdit = () => {
    setEditingOrderKey(null);
    setEditingPhone('');
  };

  const savePhoneEdit = (order) => {
    const next = sanitizeCustomerPhoneInput(editingPhone);
    const validationMessage = getCustomerPhoneValidationMessage(next, language);
    if (validationMessage) {
      showAlert(t('validation'), validationMessage);
      return;
    }
    updateOrderCustomerPhone(order.id, next);
    setEditingOrderKey(null);
    setEditingPhone('');
    showAlert(t('saved'), t('customerNumberUpdated'));
  };

  const getOrderCardStyle = (order) => {
    if (order.isWrongOrder) {
      return {
        backgroundColor: 'rgba(220, 38, 38, 0.10)',
        borderColor: 'rgba(220, 38, 38, 0.35)',
      };
    }
    if (order.isDue && !order.isPaid) {
      return {
        backgroundColor: 'rgba(217, 119, 6, 0.12)',
        borderColor: 'rgba(217, 119, 6, 0.45)',
      };
    }
    if (order.isPaid) {
      return {
        backgroundColor: TABLE_COLORS.paid.backgroundColor,
        borderColor: TABLE_COLORS.paid.borderColor,
      };
    }
    const tableStyle = getTableOrderHistoryStyle(order);
    if (tableStyle) return tableStyle;
    if (order.isOrderReady) {
      return {
        backgroundColor: TABLE_COLORS.orderReady.backgroundColor,
        borderColor: TABLE_COLORS.orderReady.borderColor,
      };
    }
    return null;
  };

  const renderOrder = useCallback(({ item }) => {
    const orderHighlight = getOrderCardStyle(item);

    return (
      <View style={[styles.card, orderHighlight]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.date}>{formatDateTime(item.timestamp)}</Text>
            {item.isTableOrder ? (
              <View
                style={[
                  styles.tableBadge,
                  isRunningTableOrder(item) ? styles.tableBadgeRunning : styles.tableBadgeDone,
                ]}
              >
                <Text
                  style={[
                    styles.tableBadgeText,
                    isRunningTableOrder(item)
                      ? styles.tableBadgeTextRunning
                      : styles.tableBadgeTextDone,
                  ]}
                >
                  {t('tableOrderBadge', { number: item.tableNumber || '—' })}
                </Text>
              </View>
            ) : null}
            {item.isEdited ? (
              <View style={styles.editedBadge}>
                <Text style={styles.editedBadgeText}>{t('orderEditedBadge')}</Text>
              </View>
            ) : null}
            {item.isWrongOrder ? (
              <View style={styles.wrongBadge}>
                <Text style={styles.wrongBadgeText}>{t('wrongOrderBadge')}</Text>
              </View>
            ) : null}
            {item.isDue && !item.isPaid ? (
              <View style={styles.dueBadge}>
                <Text style={styles.dueBadgeText}>{t('dueOrderBadge')}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.totalBox}>
            <View style={styles.amountRow}>
              <Text style={[styles.amount, { color: theme.buttonColor }]}>
                {formatCurrency(item.totalAmount)}
              </Text>
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => openOrderMenu(item)}
                hitSlop={8}
                accessibilityLabel={t('orderMenu')}
              >
                <Text style={styles.menuBtnText}>⋮</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statusBtnRow}>
              <TouchableOpacity
                style={[
                  styles.paidBtn,
                  item.isPaid && styles.paidBtnActive,
                  item.isPaid && styles.paidBtnLocked,
                  item.isWrongOrder && styles.paidBtnLocked,
                ]}
                onPress={() => handleMarkPaid(item)}
                disabled={item.isPaid || item.isWrongOrder}
              >
                <Text style={[styles.paidBtnText, item.isPaid && styles.paidBtnTextActive]}>
                  {item.isPaid ? t('paidCheck') : t('markPaid')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.orderReadyBtnInline}
                onPress={() => handleOrderReady(item)}
              >
                <Text style={styles.orderReadyInlineTitle}>{t('orderReady')}</Text>
              </TouchableOpacity>
            </View>
            {!item.isPaid ? (
              <View style={styles.secondaryActionRow}>
                {item.isDue && enableDueOrders !== false ? (
                  <TouchableOpacity
                    style={styles.dueReminderBtn}
                    onPress={() => handleDueReminder(item)}
                  >
                    <Text style={styles.dueReminderBtnText}>{t('sendDueReminder')}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.wrongBtn,
                    item.isWrongOrder && styles.wrongBtnActive,
                    item.isDue && styles.wrongBtnDueCompanion,
                  ]}
                  onPress={() => handleWrongOrder(item)}
                >
                  <Text
                    style={[
                      styles.wrongBtnText,
                      item.isWrongOrder && styles.wrongBtnTextActive,
                    ]}
                  >
                    {item.isWrongOrder ? t('undoWrongOrder') : t('markWrongOrder')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
        {item.taxEnabled ? (
          <Text style={styles.taxNote}>
            {t('gstIncludedNote', {
              cgst: formatCurrency(item.cgstAmount),
              sgst: formatCurrency(item.sgstAmount),
            })}
          </Text>
        ) : null}
        <Text style={styles.orderId} numberOfLines={1}>
          {t('orderIdLabel')} {item.orderId || item.id}
          {item.isEdited ? ` · ${t('orderEditedShort')}` : ''}
        </Text>
        <View style={styles.phoneRow}>
          <Text style={styles.itemCount}>
            {item.itemCount === 1
              ? t('itemPurchased', { count: item.itemCount })
              : t('itemsPurchased', { count: item.itemCount })}
            {item.customerPhone ? ` · ${item.customerPhone}` : ` · ${t('noNumberShort')}`}
          </Text>
          <TouchableOpacity onPress={() => beginPhoneEdit(item)} hitSlop={6}>
            <Text style={styles.editPhoneLink}>
              {item.customerPhone ? t('editNumber') : t('addNumber')}
            </Text>
          </TouchableOpacity>
        </View>

        {editingOrderKey === item.id ? (
          <View style={styles.phoneEditBox}>
            <TextInput
              style={styles.phoneInput}
              value={editingPhone}
              onChangeText={(value) => setEditingPhone(sanitizeCustomerPhoneInput(value))}
              placeholder={t('customerWhatsAppNo')}
              keyboardType="phone-pad"
              placeholderTextColor={ui.textMuted}
              maxLength={CUSTOMER_PHONE_MAX_LENGTH}
            />
            <View style={styles.phoneEditActions}>
              <TouchableOpacity style={styles.phoneCancelBtn} onPress={cancelPhoneEdit}>
                <Text style={styles.phoneCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.phoneSaveBtn, { backgroundColor: theme.buttonColor }]}
                onPress={() => savePhoneEdit(item)}
              >
                <Text style={styles.phoneSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {item.orderNote ? (
          <Text style={styles.orderNoteLine} numberOfLines={2}>
            {t('orderNote')}: {item.orderNote}
          </Text>
        ) : null}
        <View style={styles.itemList}>
          {(item.items || []).map((line) => (
            <Text key={line.id} style={styles.lineItem} numberOfLines={2}>
              · {line.name}
              {line.selectedVariant ? ` (${line.selectedVariant.name})` : ''}
              {(line.selectedAddons?.length ?? 0) > 0
                ? ` + ${line.selectedAddons.map((a) => a.name).join(', ')}`
                : ''}
              {line.note ? ` — ${line.note}` : ''}{' '}
              — {formatCurrency(line.totalPrice)}
            </Text>
          ))}
        </View>
        <ShareBillButtons
          items={item.items || []}
          totalAmount={item.totalAmount || 0}
          subtotalAmount={item.subtotalAmount}
          cartSubtotal={item.cartSubtotal}
          discountAmount={item.discountAmount}
          offerApplied={item.offerApplied}
          offerName={item.offerName}
          taxEnabled={item.taxEnabled}
          cgstAmount={item.cgstAmount}
          sgstAmount={item.sgstAmount}
          timestamp={item.timestamp}
          orderId={item.orderId || item.id}
          title="Order Receipt"
          customerPhone={item.customerPhone || ''}
          isTableOrder={item.isTableOrder}
          tableNumber={item.tableNumber}
          isPaid={item.isPaid}
          orderNote={item.orderNote || ''}
          compact
        />
      </View>
    );
  }, [
    styles,
    theme.buttonColor,
    t,
    editingOrderKey,
    editingPhone,
    shopName,
    language,
    enableDueOrders,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          ListHeaderComponent={exportPanel}
          ListEmptyComponent={
            <AppEmptyState
              icon="receipt-outline"
              title={sortedHistory.length ? t('orderFilterNoMatch') : t('noOrdersYet')}
              subtitle={sortedHistory.length ? t('orderFilterNoMatchSub') : t('noOrdersYetSub')}
            />
          }
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== 'web'}
        />
        {menuOrder ? (
          <View style={styles.menuOverlay}>
            <TouchableOpacity
              style={styles.menuBackdrop}
              activeOpacity={1}
              onPress={() => setMenuOrder(null)}
            />
            <View style={styles.menuSheet}>
              <Text style={styles.menuTitle}>
                {t('orderIdLabel')} {menuOrder.orderId || menuOrder.id}
              </Text>
              <TouchableOpacity
                style={[styles.menuItem, menuOrder.isPaid && styles.menuItemDisabled]}
                onPress={handleEditOrderFromMenu}
              >
                <Text
                  style={[styles.menuItemText, menuOrder.isPaid && styles.menuItemTextDisabled]}
                >
                  {t('editOrderItems')}
                </Text>
                {menuOrder.isPaid ? (
                  <Text style={styles.menuItemHint}>{t('editOrderLockedShort')}</Text>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuOrder(null)}>
                <Text style={styles.menuCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {statsVisible ? (
        <SalesStatsModal
          visible
          onClose={() => setStatsVisible(false)}
          orders={sortedHistory}
          shopName={shopName}
        />
      ) : null}
      {marketingVisible ? (
        <MarketingModal visible onClose={() => setMarketingVisible(false)} />
      ) : null}
      {editOrder ? (
        <EditOrderModal
          visible
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={handleSaveEditedOrder}
        />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(ui) {
  return {
  safe: { flex: 1, backgroundColor: ui.bg },
  flex: { flex: 1 },
  list: { padding: 20, paddingBottom: 0 },
  exportPanel: {
    ...cardStyle(ui),
    padding: 20,
    marginBottom: 16,
  },
  exportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  exportTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: '700',
    color: ui.textPrimary,
    letterSpacing: -0.3,
  },
  exportHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flexShrink: 0,
    maxWidth: '72%',
    justifyContent: 'flex-end',
  },
  headerActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: ui.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 120,
  },
  headerActionBtnSecondary: {
    backgroundColor: ui.surface,
    borderWidth: 1.5,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerActionTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
  },
  orderFilterBlock: {
    marginTop: 4,
    marginBottom: 10,
  },
  orderFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  orderFilterChip: {
    flexGrow: 0,
  },
  orderFilterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ui.textMuted,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  activeTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  activeTableChip: {
    flexGrow: 0,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dateBox: {
    flex: 1,
    backgroundColor: ui.surfaceMuted,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: ui.borderLight,
  },
  dateLabel: {
    fontSize: 11,
    color: ui.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: ui.textPrimary,
  },
  webDateInput: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textPrimary,
    padding: 0,
    marginTop: 2,
  },
  dateArrow: {
    fontSize: 16,
    color: ui.textMuted,
  },
  donePickerBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  donePickerText: {
    fontWeight: '700',
  },
  exportMeta: {
    fontSize: 13,
    color: ui.textMuted,
    marginBottom: 4,
  },
  card: {
    ...cardStyle(ui),
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 8,
    gap: 6,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  editedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ui.warningBg,
    borderColor: ui.warning,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  editedBadgeText: {
    color: ui.warning,
    fontSize: 11,
    fontWeight: '800',
  },
  wrongBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ui.dangerBg,
    borderColor: ui.danger,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  wrongBadgeText: {
    color: ui.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  dueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: 'rgba(217, 119, 6, 0.55)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dueBadgeText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '800',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  dueReminderBtn: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.45)',
  },
  dueReminderBtnText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '800',
  },
  tableBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tableBadgeRunning: {
    backgroundColor: 'rgba(244, 114, 182, 0.28)',
    borderColor: 'rgba(236, 72, 153, 0.5)',
  },
  tableBadgeDone: {
    backgroundColor: 'rgba(244, 114, 182, 0.14)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  tableBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tableBadgeTextRunning: {
    color: '#9d174d',
  },
  tableBadgeTextDone: {
    color: '#be185d',
  },
  amount: {
    fontSize: 20,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: ui.textSecondary,
    marginTop: -4,
  },
  totalBox: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBtnRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  paidBtn: {
    backgroundColor: ui.surfaceMuted,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ui.border,
  },
  paidBtnActive: {
    backgroundColor: ui.successBg,
    borderColor: ui.success,
  },
  paidBtnLocked: {
    opacity: 0.95,
  },
  paidBtnText: {
    color: ui.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  paidBtnTextActive: {
    color: ui.success,
  },
  wrongBtn: {
    backgroundColor: ui.dangerBg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ui.danger,
  },
  wrongBtnDueCompanion: {
    alignSelf: 'auto',
  },
  wrongBtnActive: {
    backgroundColor: ui.dangerBg,
    borderColor: ui.danger,
  },
  wrongBtnText: {
    color: ui.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  wrongBtnTextActive: {
    color: ui.danger,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.35)',
  },
  menuSheet: {
    backgroundColor: ui.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 28,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ui.textMuted,
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: ui.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: ui.borderLight,
    marginBottom: 10,
  },
  menuItemDisabled: {
    opacity: 0.7,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  menuItemTextDisabled: {
    color: ui.textMuted,
  },
  menuItemHint: {
    marginTop: 4,
    fontSize: 12,
    color: ui.textMuted,
    fontWeight: '600',
  },
  menuCancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: ui.textSecondary,
  },
  taxNote: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 6,
    fontWeight: '600',
  },
  orderReadyBtnInline: {
    backgroundColor: '#25D366',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  orderReadyBtnInlineDisabled: {
    backgroundColor: '#a9e8c0',
  },
  orderReadyInlineTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  itemCount: {
    fontSize: 13,
    color: ui.textMuted,
    marginTop: 6,
    marginBottom: 10,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  editPhoneLink: {
    color: '#228be6',
    fontSize: 13,
    fontWeight: '700',
  },
  phoneEditBox: {
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.borderLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  phoneInput: {
    backgroundColor: ui.surface,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: ui.textPrimary,
  },
  phoneEditActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  phoneCancelBtn: {
    flex: 1,
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  phoneCancelText: {
    color: ui.textSecondary,
    fontWeight: '700',
  },
  phoneSaveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  phoneSaveText: {
    color: '#fff',
    fontWeight: '800',
  },
  orderId: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 6,
    fontWeight: '700',
  },
  itemList: {
    borderTopWidth: 1,
    borderTopColor: ui.surfaceMuted,
    paddingTop: 10,
  },
  orderNoteLine: {
    fontSize: 13,
    fontWeight: '600',
    color: ui.textSecondary,
    marginBottom: 8,
  },
  lineItem: {
    fontSize: 13,
    color: ui.textSecondary,
    marginBottom: 4,
  },
};
}