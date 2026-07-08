import React, { useMemo, useState } from 'react';
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
import { showAlert } from '../utils/alert';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { UI, cardStyle } from '../utils/uiTheme';
import {
  filterOrdersByDateRange,
  getExportSummary,
  shareOrderExport,
  startOfDay,
  endOfDay,
} from '../utils/orderExport';

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
  const history = useStore((s) => s.history);
  const shopName = useStore((s) => s.shopName);
  const updateOrderCustomerPhone = useStore((s) => s.updateOrderCustomerPhone);
  const toggleOrderPaid = useStore((s) => s.toggleOrderPaid);
  const markOrderReady = useStore((s) => s.markOrderReady);
  const theme = useAppTheme();
  const { t, datePresets, language } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const listBottomPad = tabBarHeight + 24;

  const [fromDate, setFromDate] = useState(startOfDay(new Date()));
  const [toDate, setToDate] = useState(endOfDay(new Date()));
  const [activePreset, setActivePreset] = useState('today');
  const [pickerMode, setPickerMode] = useState(null);
  const [editingOrderKey, setEditingOrderKey] = useState(null);
  const [editingPhone, setEditingPhone] = useState('');

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [history]
  );

  const filteredForExport = useMemo(
    () => filterOrdersByDateRange(sortedHistory, fromDate, toDate),
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

  const handleExport = async () => {
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
        format: Platform.OS === 'web' ? 'html' : 'pdf',
      });
    } catch (error) {
      if (error?.message === 'sharing_unavailable') {
        Alert.alert(t('exportFailed'), t('sharingUnavailable'));
      } else {
        Alert.alert(t('exportFailed'), t('exportTableFailed'));
      }
    }
  };

  const handleExportCsv = async () => {
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
        format: 'csv',
      });
    } catch (error) {
      if (error?.message === 'sharing_unavailable') {
        Alert.alert(t('exportFailed'), t('sharingUnavailable'));
      } else {
        Alert.alert(t('exportFailed'), t('exportCsvFailed'));
      }
    }
  };

  const renderExportPanel = () => (
    <View style={styles.exportPanel}>
      <Text style={styles.exportTitle}>{t('exportOrders')}</Text>

      <View style={styles.presetRow}>
        {datePresets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetBtn,
              activePreset === preset.id && {
                backgroundColor: `${theme.filterSortColor}18`,
                borderWidth: 1,
                borderColor: theme.filterSortColor,
              },
            ]}
            onPress={() => applyPreset(preset.id)}
          >
            <Text
              style={[
                styles.presetText,
                activePreset === preset.id && { color: theme.filterSortColor },
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
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

      <Text style={styles.exportMeta}>
        {t('exportMeta', {
          count: exportSummary.orderCount,
          total: formatCurrency(exportSummary.totalRevenue),
        })}
      </Text>

      <TouchableOpacity style={[styles.exportBtn, { backgroundColor: theme.headerColor }]} onPress={handleExport}>
        <Text style={styles.exportBtnText}>
          {t(Platform.OS === 'web' ? 'exportTableHtml' : 'exportTablePdf')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.exportCsvBtn} onPress={handleExportCsv}>
        <Text style={styles.exportCsvText}>{t('exportCsvExcel')}</Text>
      </TouchableOpacity>
    </View>
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
    if (order.isPaid) {
      return { backgroundColor: 'rgba(40, 167, 69, 0.14)', borderColor: 'rgba(40, 167, 69, 0.35)' };
    }
    if (order.isOrderReady) {
      return { backgroundColor: 'rgba(13, 110, 253, 0.12)', borderColor: 'rgba(13, 110, 253, 0.3)' };
    }
    return null;
  };

  const renderOrder = ({ item }) => {
    const orderHighlight = getOrderCardStyle(item);

    return (
      <View style={[styles.card, orderHighlight]}>
        <View style={styles.cardHeader}>
          <Text style={styles.date}>{formatDateTime(item.timestamp)}</Text>
          <View style={styles.totalBox}>
            <Text style={[styles.amount, { color: theme.buttonColor }]}>
              {formatCurrency(item.totalAmount)}
            </Text>
            <View style={styles.statusBtnRow}>
              <TouchableOpacity
                style={[
                  styles.paidBtn,
                  item.isPaid && styles.paidBtnActive,
                ]}
                onPress={() => toggleOrderPaid(item.id)}
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
              placeholderTextColor="#adb5bd"
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

        <View style={styles.itemList}>
          {(item.items || []).map((line) => (
            <Text key={line.id} style={styles.lineItem} numberOfLines={1}>
              · {line.name}
              {line.selectedVariant ? ` (${line.selectedVariant.name})` : ''}
              {(line.selectedAddons?.length ?? 0) > 0
                ? ` + ${line.selectedAddons.map((a) => a.name).join(', ')}`
                : ''}{' '}
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
          compact
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          data={sortedHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          ListHeaderComponent={renderExportPanel}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyTitle}>{t('noOrdersYet')}</Text>
              <Text style={styles.emptySub}>{t('noOrdersYetSub')}</Text>
            </View>
          }
          contentContainerStyle={[styles.list, { paddingBottom: listBottomPad }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  flex: { flex: 1 },
  list: { padding: 20, paddingBottom: 0 },
  exportPanel: {
    ...cardStyle(),
    padding: 20,
    marginBottom: 16,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: UI.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: UI.radiusFull,
    backgroundColor: UI.surfaceMuted,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetBtnActive: {
    backgroundColor: '#fff0f3',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#868e96',
  },
  presetTextActive: {
    color: '#e94560',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dateBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dateLabel: {
    fontSize: 11,
    color: '#868e96',
    fontWeight: '600',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  webDateInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    padding: 0,
    marginTop: 2,
  },
  dateArrow: {
    fontSize: 16,
    color: '#adb5bd',
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
    color: '#868e96',
    marginBottom: 12,
  },
  exportBtn: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  exportCsvBtn: {
    backgroundColor: '#f1f3f5',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  exportCsvText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    ...cardStyle(),
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    flex: 1,
    paddingRight: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#e94560',
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
    backgroundColor: '#f1f3f5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  paidBtnActive: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    borderColor: 'rgba(40, 167, 69, 0.5)',
  },
  paidBtnText: {
    color: '#495057',
    fontSize: 13,
    fontWeight: '800',
  },
  paidBtnTextActive: {
    color: '#2b8a3e',
  },
  taxNote: {
    fontSize: 12,
    color: '#868e96',
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
    color: '#868e96',
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  phoneInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a2e',
  },
  phoneEditActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  phoneCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  phoneCancelText: {
    color: '#495057',
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
    color: '#868e96',
    marginTop: 6,
    fontWeight: '700',
  },
  itemList: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 10,
  },
  lineItem: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  emptySub: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
