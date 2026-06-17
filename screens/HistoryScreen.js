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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStore from '../store/store';
import ShareBillButtons from '../components/ShareBillButtons';
import { formatCurrency } from '../utils/currency';
import {
  formatOrderReadyMessage,
  getCustomerPhoneValidationMessage,
  isValidCustomerPhone,
  sanitizeCustomerPhoneInput,
  sendViaWhatsApp,
} from '../utils/billShare';
import { showAlert } from '../utils/alert';
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

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: '7 Days' },
  { id: 'month', label: '30 Days' },
  { id: 'all', label: 'All' },
];

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
      Alert.alert('Invalid range', 'From date cannot be after To date.');
      return;
    }

    if (filteredForExport.length === 0) {
      Alert.alert('No orders', 'No orders found for the selected date range.');
      return;
    }

    try {
      await shareOrderExport({
        orders: filteredForExport,
        shopName,
        fromDate,
        toDate,
        format: 'html',
      });
    } catch (error) {
      if (error?.message === 'sharing_unavailable') {
        Alert.alert('Export failed', 'Sharing is not available on this device.');
      } else {
        Alert.alert('Export failed', 'Could not export the order table.');
      }
    }
  };

  const handleExportCsv = async () => {
    if (fromDate > toDate) {
      Alert.alert('Invalid range', 'From date cannot be after To date.');
      return;
    }

    if (filteredForExport.length === 0) {
      Alert.alert('No orders', 'No orders found for the selected date range.');
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
        Alert.alert('Export failed', 'Sharing is not available on this device.');
      } else {
        Alert.alert('Export failed', 'Could not export the CSV file.');
      }
    }
  };

  const renderExportPanel = () => (
    <View style={styles.exportPanel}>
      <Text style={styles.exportTitle}>Export Orders</Text>

      <View style={styles.presetRow}>
        {PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[styles.presetBtn, activePreset === preset.id && styles.presetBtnActive]}
            onPress={() => applyPreset(preset.id)}
          >
            <Text
              style={[
                styles.presetText,
                activePreset === preset.id && styles.presetTextActive,
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
              <Text style={styles.dateLabel}>From</Text>
              <TextInput
                style={styles.webDateInput}
                value={formatDateInput(fromDate)}
                onChangeText={(value) => handleWebDateChange('from', value)}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <Text style={styles.dateArrow}>→</Text>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>To</Text>
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
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>{formatDateLabel(fromDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateArrow}>→</Text>
            <TouchableOpacity style={styles.dateBox} onPress={() => setPickerMode('to')}>
              <Text style={styles.dateLabel}>To</Text>
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
          <Text style={styles.donePickerText}>Done</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.exportMeta}>
        {exportSummary.orderCount} orders · {formatCurrency(exportSummary.totalRevenue)} total
      </Text>

      <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
        <Text style={styles.exportBtnText}>📊 Export Table (HTML)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.exportCsvBtn} onPress={handleExportCsv}>
        <Text style={styles.exportCsvText}>📄 Export CSV (Excel)</Text>
      </TouchableOpacity>
    </View>
  );

  const handleOrderReady = (order) => {
    const message = formatOrderReadyMessage({
      items: order.items || [],
      totalAmount: order.totalAmount || 0,
      orderId: order.orderId || order.id,
      shopName,
      itemCount: order.itemCount || 0,
    });

    if (!order.customerPhone) {
      Alert.alert(
        'No number',
        'Tap "Add number" on this order to save a WhatsApp number, or continue to pick a contact in WhatsApp.',
        [{ text: 'OK', onPress: () => sendViaWhatsApp(message) }]
      );
      return;
    }

    sendViaWhatsApp(message, order.customerPhone);
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
    const validationMessage = getCustomerPhoneValidationMessage(next);
    if (validationMessage) {
      showAlert('Validation', validationMessage);
      return;
    }
    updateOrderCustomerPhone(order.id, next);
    setEditingOrderKey(null);
    setEditingPhone('');
    showAlert('Saved', 'Customer number updated.');
  };

  const renderOrder = ({ item }) => {
    const hasValidCustomerPhone = isValidCustomerPhone(item.customerPhone || '');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.date}>{formatDateTime(item.timestamp)}</Text>
          <View style={styles.totalBox}>
            <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
            <TouchableOpacity
              style={styles.orderReadyBtnInline}
              onPress={() => handleOrderReady(item)}
            >
              <Text style={styles.orderReadyInlineTitle}>Order Ready</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.orderId} numberOfLines={1}>
          Order ID: {item.orderId || item.id}
        </Text>
        <View style={styles.phoneRow}>
          <Text style={styles.itemCount}>
            {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'} purchased
            {item.customerPhone ? ` · ${item.customerPhone}` : ' · No number'}
          </Text>
          <TouchableOpacity onPress={() => beginPhoneEdit(item)} hitSlop={6}>
            <Text style={styles.editPhoneLink}>
              {item.customerPhone ? 'Edit number' : 'Add number'}
            </Text>
          </TouchableOpacity>
        </View>

        {editingOrderKey === item.id ? (
          <View style={styles.phoneEditBox}>
            <TextInput
              style={styles.phoneInput}
              value={editingPhone}
              onChangeText={(value) => setEditingPhone(sanitizeCustomerPhoneInput(value))}
              placeholder="Customer WhatsApp No."
              keyboardType="phone-pad"
              placeholderTextColor="#adb5bd"
              maxLength={10}
            />
            <View style={styles.phoneEditActions}>
              <TouchableOpacity style={styles.phoneCancelBtn} onPress={cancelPhoneEdit}>
                <Text style={styles.phoneCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.phoneSaveBtn} onPress={() => savePhoneEdit(item)}>
                <Text style={styles.phoneSaveText}>Save</Text>
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
          timestamp={item.timestamp}
          orderId={item.orderId || item.id}
          title="Order Receipt"
          customerPhone={item.customerPhone || ''}
          disabled={!hasValidCustomerPhone}
          compact
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={sortedHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        ListHeaderComponent={renderExportPanel}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>
              Completed checkouts will appear below, newest first.
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  list: { padding: 16, paddingBottom: 24 },
  exportPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
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
    color: '#e94560',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    backgroundColor: '#1a1a2e',
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
    paddingVertical: 32,
    paddingHorizontal: 16,
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
