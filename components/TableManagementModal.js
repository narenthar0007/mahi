import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import useStore from '../store/store';
import { showAlert } from '../utils/alert';
import { useTranslation } from '../utils/i18n';
import { useLayoutInsets } from '../hooks/useLayoutInsets';
import { formatCurrency } from '../utils/currency';
import { useThemedStyles } from '../utils/uiTheme';
import {
  CUSTOMER_PHONE_MAX_LENGTH,
  getCustomerPhoneValidationMessage,
  sanitizeCustomerPhoneInput,
} from '../utils/billShare';

import {
  COLOR_LEGEND_KEYS,
  TABLE_COLORS,
  TABLE_SEAT_TYPES,
  groupTablesBySeatType,
  getSeatTypeMeta,
  getTableOccupancyKind,
  resolveTableCapacity,
} from '../utils/tableManagement';

import ShareBillButtons from './ShareBillButtons';
import EditOrderModal from './EditOrderModal';

const TABLE_FILTERS = [
  { id: 'available', labelKey: 'tableFilterAvailable' },
  { id: 'seated', labelKey: 'tableFilterSeated' },
  { id: 'ordering', labelKey: 'tableFilterOrdering' },
  { id: 'all', labelKey: 'tableFilterAll' },
];

function nextSuggestedNumber(tables, seatsType) {
  const prefix = seatsType === 'customer' ? 'C' : 'T';

  let max = 0;

  (tables || []).forEach((table) => {
    const match = String(table.number || '').match(
      new RegExp(`^${prefix}(\\d+)$`, 'i')
    );

    if (!match) return;

    const num = Number(match[1]);

    if (Number.isFinite(num)) {
      max = Math.max(max, num);
    }
  });

  const next = max + 1;

  return `${prefix}${String(next).padStart(2, '0')}`;
}

export default function TableManagementModal({
  visible,
  onClose,
  onStartOrder,
  onCheckoutOrder,
  onViewHistory,
}) {
  const { ui, styles } = useThemedStyles(createStyles);

  const { t, language } = useTranslation();
  const { top: topInset, bottom: bottomInset } = useLayoutInsets();

  const tables = useStore((s) => s.tables);
  const history = useStore((s) => s.history);

  const addTable = useStore((s) => s.addTable);
  const removeTable = useStore((s) => s.removeTable);
  const updateTable = useStore((s) => s.updateTable);

  const updateOrderItems = useStore((s) => s.updateOrderItems);
  const updateOrderCustomerPhone = useStore((s) => s.updateOrderCustomerPhone);
  const resumeTableOrderForBilling = useStore((s) => s.resumeTableOrderForBilling);
  const setActiveTable = useStore((s) => s.setActiveTable);
  const occupyTable = useStore((s) => s.occupyTable);
  const freeTable = useStore((s) => s.freeTable);
  const toggleOrderPaid = useStore((s) => s.toggleOrderPaid);

  const [newNumber, setNewNumber] = useState('');
  const [newSeatsType, setNewSeatsType] = useState('4');
  const [newCapacity, setNewCapacity] = useState('10');

  const [selectedTableId, setSelectedTableId] = useState(null);

  const [editingTableId, setEditingTableId] = useState(null);
  const [editNumber, setEditNumber] = useState('');
  const [editSeatsType, setEditSeatsType] = useState('4');
  const [editCapacity, setEditCapacity] = useState('10');

  const [editOrder, setEditOrder] = useState(null);
  const [tableFilter, setTableFilter] = useState('all');
  const [orderPhoneDraft, setOrderPhoneDraft] = useState('');
  const [editingOrderPhone, setEditingOrderPhone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);
  const fallbackScrollHeight = useMemo(() => {
    const windowHeight = Dimensions.get('window').height;
    return Math.max(
      280,
      Math.round(windowHeight - topInset - bottomInset - 140)
    );
  }, [topInset, bottomInset, visible]);

  useEffect(() => {
    if (!visible) {
      setScrollAreaHeight(0);
      setMenuOpen(false);
      setHintVisible(false);
    }
  }, [visible]);

  const filteredTables = useMemo(() => {
    if (tableFilter === 'all') {
      return tables || [];
    }

    return (tables || []).filter(
      (table) => getTableOccupancyKind(table) === tableFilter
    );
  }, [tables, tableFilter]);

  const grouped = useMemo(
    () => groupTablesBySeatType(filteredTables),
    [filteredTables]
  );

  const filterCounts = useMemo(() => {
    const counts = {
      available: 0,
      seated: 0,
      ordering: 0,
      all: (tables || []).length,
    };

    (tables || []).forEach((table) => {
      const kind = getTableOccupancyKind(table);
      counts[kind] = (counts[kind] || 0) + 1;
    });

    return counts;
  }, [tables]);

  const selectedTable = useMemo(
    () =>
      (tables || []).find(
        (entry) => entry.id === selectedTableId
      ) || null,
    [tables, selectedTableId]
  );

  const selectedOrder = useMemo(() => {
    if (!selectedTable?.currentOrderId) {
      return null;
    }

    return (
      (history || []).find(
        (order) =>
          order.id === selectedTable.currentOrderId ||
          order.orderId === selectedTable.currentOrderId
      ) || null
    );
  }, [history, selectedTable]);

  useEffect(() => {
    if (!selectedTable) {
      setOrderPhoneDraft('');
      setEditingOrderPhone(false);
      return;
    }

    const phone =
      selectedOrder?.customerPhone ||
      selectedTable.guestPhone ||
      '';

    setOrderPhoneDraft(
      sanitizeCustomerPhoneInput(phone)
    );
    setEditingOrderPhone(false);
  }, [selectedTable, selectedOrder?.customerPhone, selectedTable?.guestPhone]);

  const handleClose = () => {
    setSelectedTableId(null);
    setEditingTableId(null);
    setEditOrder(null);
    setEditingOrderPhone(false);
    setOrderPhoneDraft('');
    setMenuOpen(false);
    setSettingsPanel(null);
    setHintVisible(false);

    onClose?.();
  };

  const openSettingsPanel = (panel) => {
    setMenuOpen(false);
    setHintVisible(false);
    setSettingsPanel(panel);
  };

  const closeSettingsPanel = () => {
    setSettingsPanel(null);
  };

  const beginEditTable = (table) => {
    setSelectedTableId(null);

    setEditingTableId(table.id);
    setEditNumber(String(table.number || ''));

    setEditSeatsType(table.seatsType || '4');

    setEditCapacity(
      String(
        table.capacity ||
          resolveTableCapacity(table.seatsType) ||
          '10'
      )
    );
  };

  const cancelEditTable = () => {
    setEditingTableId(null);
  };

  const handleSaveEditTable = () => {
    if (!editingTableId) {
      return;
    }

    const result = updateTable(editingTableId, {
      number: editNumber,
      seatsType: editSeatsType,
      capacity:
        editSeatsType === 'customer'
          ? editCapacity
          : undefined,
    });

    if (!result?.success) {
      if (result?.error === 'duplicate_number') {
        showAlert(
          t('validation'),
          t('tableNumberExists')
        );
      } else if (result?.error === 'capacity_required') {
        showAlert(
          t('validation'),
          t('tableCapacityRequired')
        );
      } else {
        showAlert(
          t('validation'),
          t('tableNumberRequired')
        );
      }

      return;
    }

    setEditingTableId(null);

    showAlert(
      t('saved'),
      t('tableUpdated')
    );
  };

  const handleSaveEditedOrder = (nextItems, nextOrderNote) => {
    if (!editOrder) {
      return;
    }

    const result = updateOrderItems(
      editOrder.id,
      nextItems,
      { orderNote: nextOrderNote }
    );

    if (!result?.success) {
      if (result?.error === 'paid_locked') {
        showAlert(
          t('editOrderLockedTitle'),
          t('editOrderLockedMsg')
        );
      } else if (result?.error === 'empty_items') {
        showAlert(
          t('validation'),
          t('editOrderNeedItem')
        );
      } else {
        showAlert(
          t('validation'),
          t('editOrderFailed')
        );
      }

      return;
    }

    setEditOrder(null);

    showAlert(
      t('saved'),
      t('orderUpdated')
    );
  };

  const handleAddTable = (override = {}) => {
    const seatsType =
      override.seatsType || newSeatsType;

    const number =
      (override.number ?? newNumber).trim() ||
      nextSuggestedNumber(tables, seatsType);

    const capacity =
      seatsType === 'customer'
        ? override.capacity ?? newCapacity
        : resolveTableCapacity(seatsType);

    const result = addTable({
      number,
      seatsType,
      capacity,
    });

    if (!result?.success) {
      if (result?.error === 'duplicate_number') {
        showAlert(
          t('validation'),
          t('tableNumberExists')
        );
      } else if (result?.error === 'capacity_required') {
        showAlert(
          t('validation'),
          t('tableCapacityRequired')
        );
      } else {
        showAlert(
          t('validation'),
          t('tableNumberRequired')
        );
      }

      return;
    }

    if (!override.seatsType) {
      setNewNumber('');

      if (seatsType === 'customer') {
        setNewCapacity('10');
      }
    }

    closeSettingsPanel();

    showAlert(
      t('saved'),
      t('tableAdded')
    );
  };

  const selectSeatType = (typeId) => {
    setNewSeatsType(typeId);

    if (
      typeId === 'customer' &&
      !String(newCapacity).trim()
    ) {
      setNewCapacity('10');
    }
  };

  const startOrderForTable = (table) => {
    const kind = getTableOccupancyKind(table);

    // Already has a running bill.
    // Open the existing bill instead of creating another order.
    if (kind === 'ordering') {
      setSelectedTableId(table.id);
      return;
    }

    const result = setActiveTable(table.id);

    if (!result?.success) {
      showAlert(
        t('validation'),
        t('tableOccupiedMsg')
      );

      return;
    }

    // Keep guest seated while taking first order.
    if (kind === 'available') {
      occupyTable(table.id);
    }

    setSelectedTableId(null);

    handleClose();

    onStartOrder?.(table);
  };

  const checkoutOrderNow = (table) => {
    const result = resumeTableOrderForBilling(
      table.id
    );

    if (!result?.success) {
      if (result?.error === 'empty_items') {
        showAlert(
          t('validation'),
          t('editOrderNeedItem')
        );
      } else {
        showAlert(
          t('validation'),
          t('checkoutOrderNowFailed')
        );
      }

      return;
    }

    setSelectedTableId(null);

    handleClose();

    const navigate =
      onCheckoutOrder || onStartOrder;

    navigate?.(table);
  };

  const beginOrderPhoneEdit = () => {
    setEditingOrderPhone(true);
  };

  const cancelOrderPhoneEdit = () => {
    const phone =
      selectedOrder?.customerPhone ||
      selectedTable?.guestPhone ||
      '';

    setOrderPhoneDraft(
      sanitizeCustomerPhoneInput(phone)
    );
    setEditingOrderPhone(false);
  };

  const saveOrderPhone = () => {
    if (!selectedTable) {
      return;
    }

    const next = sanitizeCustomerPhoneInput(
      orderPhoneDraft
    );

    const validationMessage =
      getCustomerPhoneValidationMessage(
        next,
        language
      );

    if (validationMessage) {
      showAlert(
        t('validation'),
        validationMessage
      );

      return;
    }

    if (selectedOrder) {
      updateOrderCustomerPhone(
        selectedOrder.id,
        next
      );
    }

    updateTable(
      selectedTable.id,
      {
        guestPhone: next,
      }
    );

    setEditingOrderPhone(false);

    showAlert(
      t('saved'),
      t('customerNumberUpdated')
    );
  };

  const handleSeatGuest = (table) => {
    const result = occupyTable(table.id);

    if (!result?.success) {
      if (result?.error === 'has_order') {
        showAlert(
          t('validation'),
          t('tableOccupiedMsg')
        );
      } else {
        showAlert(
          t('validation'),
          t('tableSeatFailed')
        );
      }

      return;
    }

    showAlert(
      t('tableMarkedOccupiedTitle'),
      t('tableMarkedOccupiedMsg', {
        number: table.number,
      })
    );
  };

  const handleFreeSeatedTable = (table) => {
    const result = freeTable(table.id);

    if (!result?.success) {
      showAlert(
        t('validation'),
        t('tableFreeFailed')
      );

      return;
    }

    setSelectedTableId(null);

    showAlert(
      t('saved'),
      t('tableFreedGuest')
    );
  };

  const handleTablePress = (table) => {
    const kind = getTableOccupancyKind(table);

    if (kind === 'available') {
      // Customer present → mark occupied only.
      handleSeatGuest(table);
      return;
    }

    // Seated or ordering → open detail actions.
    setSelectedTableId(table.id);
  };

  const handleRemoveTable = (table) => {
    const result = removeTable(table.id);

    if (!result?.success) {
      if (result?.error === 'occupied') {
        showAlert(
          t('validation'),
          t('tableCannotRemoveOccupied')
        );
      } else {
        showAlert(
          t('validation'),
          t('tableRemoveFailed')
        );
      }

      return;
    }

    if (selectedTableId === table.id) {
      setSelectedTableId(null);
    }
  };

  const handleMarkPaid = () => {
    if (!selectedOrder) {
      return;
    }

    const result = toggleOrderPaid(
      selectedOrder.id
    );

    if (result?.error === 'paid_locked') {
      showAlert(
        t('paidLockedTitle'),
        t('paidLockedMsg')
      );

      return;
    }

    setSelectedTableId(null);

    showAlert(
      t('saved'),
      t('tableFreedPaid')
    );
  };

  const seatLabel = (tableOrType) => {
    if (
      tableOrType &&
      typeof tableOrType === 'object'
    ) {
      const typeLabel = t(
        getSeatTypeMeta(
          tableOrType.seatsType
        ).labelKey
      );

      const seats = resolveTableCapacity(
        tableOrType.seatsType,
        tableOrType.capacity
      );

      return t(
        'tableTypeWithCapacity',
        {
          type: typeLabel,
          count: seats,
        }
      );
    }

    return t(
      getSeatTypeMeta(tableOrType).labelKey
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[
          styles.page,
          {
            backgroundColor: ui.bg,
            paddingTop: topInset,
            paddingBottom: Math.max(
              bottomInset,
              16
            ),
          },
        ]}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        enabled={Platform.OS === 'ios'}
      >
        <View style={styles.body}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: ui.border,
              },
            ]}
          >
            <View style={styles.headerTitleRow}>
              <Text
                style={[
                  styles.title,
                  {
                    color: ui.textPrimary,
                  },
                ]}
              >
                {t('tableManagement')}
              </Text>

              <Pressable
                style={[
                  styles.infoCircle,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surfaceMuted,
                  },
                ]}
                onHoverIn={() => setHintVisible(true)}
                onHoverOut={() => setHintVisible(false)}
                onPress={() => setHintVisible((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel={t('tableManagementHint')}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.infoCircleText,
                    { color: ui.textSecondary },
                  ]}
                >
                  i
                </Text>
              </Pressable>

              {hintVisible ? (
                <View
                  style={[
                    styles.hintTooltip,
                    {
                      backgroundColor: ui.surface,
                      borderColor: ui.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.hintTooltipText,
                      { color: ui.textSecondary },
                    ]}
                  >
                    {t('tableManagementHint')}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              <View style={styles.menuWrap}>
                <TouchableOpacity
                  style={[
                    styles.menuBtn,
                    {
                      borderColor: ui.border,
                      backgroundColor: ui.surfaceMuted,
                    },
                  ]}
                  onPress={() => {
                    setHintVisible(false);
                    setMenuOpen((open) => !open);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('tableSettingsMenu')}
                >
                  <Ionicons
                    name="menu"
                    size={20}
                    color={ui.textPrimary}
                  />
                </TouchableOpacity>

                {menuOpen ? (
                  <View
                    style={[
                      styles.menuDropdown,
                      {
                        backgroundColor: ui.surface,
                        borderColor: ui.border,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => openSettingsPanel('add')}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          { color: ui.textPrimary },
                        ]}
                      >
                        {t('addTable')}
                      </Text>
                    </TouchableOpacity>

                    <View
                      style={[
                        styles.menuDivider,
                        { backgroundColor: ui.borderLight },
                      ]}
                    />

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => openSettingsPanel('colors')}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          { color: ui.textPrimary },
                        ]}
                      >
                        {t('colorLegendTitle')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleClose}
                hitSlop={10}
              >
                <Text
                  style={[
                    styles.closeText,
                    {
                      color: ui.info,
                    },
                  ]}
                >
                  {t('close')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {menuOpen ? (
            <Pressable
              style={styles.menuDismiss}
              onPress={() => setMenuOpen(false)}
            />
          ) : null}

          {/* Main Content */}
          <View
            style={styles.scrollArea}
            onLayout={(event) => {
              const next = Math.round(
                event.nativeEvent.layout.height
              );
              if (next > 0 && next !== scrollAreaHeight) {
                setScrollAreaHeight(next);
              }
            }}
          >
          <ScrollView
            style={[
              styles.scroll,
              {
                height:
                  scrollAreaHeight > 0
                    ? scrollAreaHeight
                    : fallbackScrollHeight,
              },
            ]}
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
            bounces
          >
            {/* Filters */}
            <View style={styles.filterRow}>
              {TABLE_FILTERS.map((filter) => {
                const active =
                  tableFilter === filter.id;

                const count =
                  filterCounts[filter.id] ?? 0;

                return (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterChip,
                      active &&
                        styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setTableFilter(filter.id)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {t(filter.labelKey)} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Groups */}
            {grouped.map((group) => (
              <View
                key={group.id}
                style={styles.groupBlock}
              >
                <View style={styles.groupHeader}>
                  <Text
                    style={styles.groupTitle}
                  >
                    {t(group.labelKey)}
                  </Text>

                  <TouchableOpacity
                    style={styles.groupAddBtn}
                    onPress={() =>
                      handleAddTable({
                        seatsType: group.id,
                        number:
                          nextSuggestedNumber(
                            tables,
                            group.id
                          ),
                        capacity:
                          group.id === 'customer'
                            ? newCapacity || '10'
                            : undefined,
                      })
                    }
                  >
                    <Text
                      style={
                        styles.groupAddBtnText
                      }
                    >
                      {t('addTableShort')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {group.tables.length === 0 ? (
                  <Text
                    style={styles.emptyGroup}
                  >
                    {t('noTablesInGroup')}
                  </Text>
                ) : (
                  <View
                    style={styles.tableGrid}
                  >
                    {group.tables.map((table) => {
                      const kind =
                        getTableOccupancyKind(
                          table
                        );

                      const occupied =
                        kind !== 'available';

                      const palette =
                        kind === 'ordering'
                          ? TABLE_COLORS.occupied
                          : kind === 'seated'
                            ? TABLE_COLORS.seated
                            : TABLE_COLORS.available;

                      const statusLabel =
                        kind === 'ordering'
                          ? t('tableOrdering')
                          : kind === 'seated'
                            ? t('tableSeated')
                            : t(
                                'tableAvailable'
                              );

                      const statusColor =
                        kind === 'available'
                          ? '#047857'
                          : kind === 'seated'
                            ? '#b45309'
                            : '#9a3412';

                      const isEditing =
                        editingTableId ===
                        table.id;

                      if (isEditing) {
                        return (
                          <View
                            key={table.id}
                            style={[
                              styles.tableCard,
                              styles.tableCardEditing,
                              {
                                backgroundColor:
                                  ui.surface,
                                borderColor:
                                  '#ec4899',
                              },
                            ]}
                          >
                            <Text
                              style={
                                styles.editCardTitle
                              }
                            >
                              {t('editTable')}
                            </Text>

                            <TextInput
                              style={styles.input}
                              value={editNumber}
                              onChangeText={
                                setEditNumber
                              }
                              placeholder={t(
                                'tableNumberPlaceholder'
                              )}
                              placeholderTextColor={
                                ui.textMuted
                              }
                              autoCapitalize="characters"
                              maxLength={12}
                            />

                            <Text
                              style={
                                styles.fieldLabel
                              }
                            >
                              {t(
                                'tableSeatType'
                              )}
                            </Text>

                            <View
                              style={
                                styles.seatChips
                              }
                            >
                              {TABLE_SEAT_TYPES.map(
                                (type) => {
                                  const active =
                                    editSeatsType ===
                                    type.id;

                                  return (
                                    <TouchableOpacity
                                      key={type.id}
                                      style={[
                                        styles.seatChip,
                                        active &&
                                          styles.seatChipActive,
                                      ]}
                                      onPress={() => {
                                        setEditSeatsType(
                                          type.id
                                        );

                                        if (
                                          type.id ===
                                            'customer' &&
                                          !String(
                                            editCapacity
                                          ).trim()
                                        ) {
                                          setEditCapacity(
                                            '10'
                                          );
                                        }
                                      }}
                                    >
                                      <Text
                                        style={[
                                          styles.seatChipText,
                                          active &&
                                            styles.seatChipTextActive,
                                        ]}
                                      >
                                        {t(
                                          type.labelKey
                                        )}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                }
                              )}
                            </View>

                            {editSeatsType ===
                            'customer' ? (
                              <TextInput
                                style={styles.input}
                                value={editCapacity}
                                onChangeText={(
                                  value
                                ) =>
                                  setEditCapacity(
                                    value
                                      .replace(
                                        /[^\d]/g,
                                        ''
                                      )
                                      .slice(0, 2)
                                  )
                                }
                                placeholder={t(
                                  'tableCapacityPlaceholder'
                                )}
                                placeholderTextColor={
                                  ui.textMuted
                                }
                                keyboardType="number-pad"
                                maxLength={2}
                              />
                            ) : (
                              <Text
                                style={
                                  styles.fixedCapacityNote
                                }
                              >
                                {t(
                                  'tableFixedCapacityNote',
                                  {
                                    count:
                                      resolveTableCapacity(
                                        editSeatsType
                                      ),
                                  }
                                )}
                              </Text>
                            )}

                            <View
                              style={
                                styles.editActions
                              }
                            >
                              <TouchableOpacity
                                style={
                                  styles.editCancelBtn
                                }
                                onPress={
                                  cancelEditTable
                                }
                              >
                                <Text
                                  style={
                                    styles.editCancelText
                                  }
                                >
                                  {t('cancel')}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={
                                  styles.editSaveBtn
                                }
                                onPress={
                                  handleSaveEditTable
                                }
                              >
                                <Text
                                  style={
                                    styles.editSaveText
                                  }
                                >
                                  {t('saveTable')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={table.id}
                          style={[
                            styles.tableCard,
                            {
                              backgroundColor:
                                palette.backgroundColor,
                              borderColor:
                                palette.borderColor,
                            },
                          ]}
                          onPress={() =>
                            handleTablePress(
                              table
                            )
                          }
                          activeOpacity={0.85}
                        >
                          <View
                            style={
                              styles.tableCardTop
                            }
                          >
                            <Text
                              style={
                                styles.tableNumber
                              }
                            >
                              {table.number}
                            </Text>

                            <View
                              style={
                                styles.tableCardActions
                              }
                            >
                              <TouchableOpacity
                                style={
                                  styles.tableIconBtn
                                }
                                onPress={() =>
                                  beginEditTable(
                                    table
                                  )
                                }
                                hitSlop={8}
                              >
                                <Text
                                  style={
                                    styles.tableIconBtnText
                                  }
                                >
                                  ✎
                                </Text>
                              </TouchableOpacity>

                              {!occupied ? (
                                <TouchableOpacity
                                  style={[
                                    styles.tableIconBtn,
                                    styles.tableRemoveBtn,
                                  ]}
                                  onPress={() =>
                                    handleRemoveTable(
                                      table
                                    )
                                  }
                                  hitSlop={8}
                                >
                                  <Text
                                    style={
                                      styles.tableRemoveBtnText
                                    }
                                  >
                                    ✕
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>

                          <Text
                            style={styles.tableMeta}
                          >
                            {seatLabel(table)}
                          </Text>

                          <Text
                            style={[
                              styles.tableStatus,
                              {
                                color:
                                  statusColor,
                              },
                            ]}
                          >
                            {statusLabel}
                          </Text>

                          {table.guestName ? (
                            <Text
                              style={
                                styles.tableGuest
                              }
                              numberOfLines={1}
                            >
                              {t(
                                'tableGuestLabel',
                                {
                                  name: table.guestName,
                                }
                              )}
                            </Text>
                          ) : null}

                          {kind === 'available' ? (
                            <Text
                              style={
                                styles.tableActionHint
                              }
                            >
                              {t(
                                'tableTapToSeat'
                              )}
                            </Text>
                          ) : kind === 'seated' ? (
                            <>
                              <Text
                                style={
                                  styles.tableActionHint
                                }
                              >
                                {t(
                                  'tableTapToTakeOrder'
                                )}
                              </Text>

                              <TouchableOpacity
                                style={
                                  styles.cardAddOrderBtn
                                }
                                onPress={() =>
                                  startOrderForTable(
                                    table
                                  )
                                }
                              >
                                <Text
                                  style={
                                    styles.cardAddOrderBtnText
                                  }
                                >
                                  {t(
                                    'addOrderForTable'
                                  )}
                                </Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <Text
                              style={
                                styles.tableActionHint
                              }
                            >
                              {t(
                                'tableTapToViewBill'
                              )}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}

            {filteredTables.length === 0 ? (
              <Text
                style={styles.emptyFilter}
              >
                {t('tableFilterEmpty')}
              </Text>
            ) : null}

            <Text
              style={styles.longPressHint}
            >
              {t('tableLongPressRemove')}
            </Text>
          </ScrollView>
          </View>

          {/* Selected Table Detail */}
          {selectedTable ? (
            <View style={styles.detailOverlay}>
              <Pressable
                style={styles.detailBackdrop}
                onPress={() =>
                  setSelectedTableId(null)
                }
              />

              <View style={styles.detailSheet}>
                <ScrollView
                  style={styles.detailScroll}
                  contentContainerStyle={
                    styles.detailScrollContent
                  }
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                <Text
                  style={styles.detailTitle}
                >
                  {t('tableLabel', {
                    number:
                      selectedTable.number,
                  })}
                </Text>

                <Text
                  style={styles.detailMeta}
                >
                  {seatLabel(selectedTable)}
                </Text>

                {selectedOrder ? (
                  <>
                    <Text
                      style={
                        styles.detailStatus
                      }
                    >
                      {t('tableOrdering')}
                    </Text>

                    <Text
                      style={
                        styles.detailOrder
                      }
                    >
                      {t('orderIdLabel')}{' '}
                      {selectedOrder.orderId ||
                        selectedOrder.id}
                    </Text>

                    <Text
                      style={
                        styles.detailAmount
                      }
                    >
                      {formatCurrency(
                        selectedOrder.totalAmount
                      )}
                    </Text>

                    {selectedOrder.orderNote ? (
                      <Text style={styles.detailEmpty}>
                        {t('orderNote')}:{' '}
                        {selectedOrder.orderNote}
                      </Text>
                    ) : null}

                    <Text
                      style={
                        styles.detailItems
                      }
                    >
                      {(selectedOrder.items || [])
                        .slice(0, 4)
                        .map((line) => {
                          const note = String(
                            line.note || ''
                          ).trim();
                          return note
                            ? `· ${line.name} — ${note}`
                            : `· ${line.name}`;
                        })
                        .join('\n')}

                      {(selectedOrder.items || [])
                        .length > 4
                        ? `\n… +${
                            selectedOrder.items
                              .length - 4
                          }`
                        : ''}
                    </Text>

                    <View style={styles.phoneSection}>
                      <Text style={styles.phoneLabel}>
                        {t('customerWhatsAppNo')}
                      </Text>
                      {editingOrderPhone ? (
                        <View style={styles.phoneEditBox}>
                          <TextInput
                            style={styles.phoneInput}
                            value={orderPhoneDraft}
                            onChangeText={(value) =>
                              setOrderPhoneDraft(
                                sanitizeCustomerPhoneInput(
                                  value
                                )
                              )
                            }
                            placeholder={t(
                              'phoneExamplePlaceholder'
                            )}
                            keyboardType="phone-pad"
                            placeholderTextColor={
                              ui.textMuted
                            }
                            maxLength={
                              CUSTOMER_PHONE_MAX_LENGTH
                            }
                          />
                          <View
                            style={
                              styles.phoneEditActions
                            }
                          >
                            <TouchableOpacity
                              style={
                                styles.phoneCancelBtn
                              }
                              onPress={
                                cancelOrderPhoneEdit
                              }
                            >
                              <Text
                                style={
                                  styles.phoneCancelText
                                }
                              >
                                {t('cancel')}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={
                                styles.phoneSaveBtn
                              }
                              onPress={saveOrderPhone}
                            >
                              <Text
                                style={
                                  styles.phoneSaveText
                                }
                              >
                                {t('save')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.phoneRow}>
                          <Text
                            style={
                              styles.phoneValue
                            }
                          >
                            {orderPhoneDraft
                              ? orderPhoneDraft
                              : t('noNumberShort')}
                          </Text>
                          <TouchableOpacity
                            onPress={
                              beginOrderPhoneEdit
                            }
                            hitSlop={6}
                          >
                            <Text
                              style={
                                styles.phoneEditLink
                              }
                            >
                              {orderPhoneDraft
                                ? t('editNumber')
                                : t('addNumber')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <ShareBillButtons
                      items={
                        selectedOrder.items || []
                      }
                      totalAmount={
                        selectedOrder.totalAmount ||
                        0
                      }
                      subtotalAmount={
                        selectedOrder.subtotalAmount
                      }
                      cartSubtotal={
                        selectedOrder.cartSubtotal
                      }
                      discountAmount={
                        selectedOrder.discountAmount
                      }
                      offerApplied={
                        selectedOrder.offerApplied
                      }
                      offerName={
                        selectedOrder.offerName
                      }
                      taxEnabled={
                        selectedOrder.taxEnabled
                      }
                      cgstAmount={
                        selectedOrder.cgstAmount
                      }
                      sgstAmount={
                        selectedOrder.sgstAmount
                      }
                      timestamp={
                        selectedOrder.timestamp
                      }
                      orderId={
                        selectedOrder.orderId ||
                        selectedOrder.id
                      }
                      customerPhone={
                        selectedOrder.customerPhone ||
                        ''
                      }
                      isTableOrder={
                        selectedOrder.isTableOrder
                      }
                      tableNumber={
                        selectedOrder.tableNumber
                      }
                      isPaid={
                        selectedOrder.isPaid
                      }
                      orderNote={
                        selectedOrder.orderNote ||
                        ''
                      }
                      compact
                    />

                    {!selectedOrder.isPaid ? (
                      <TouchableOpacity
                        style={
                          styles.checkoutOrderBtn
                        }
                        onPress={() =>
                          checkoutOrderNow(
                            selectedTable
                          )
                        }
                      >
                        <Text
                          style={
                            styles.checkoutOrderBtnText
                          }
                        >
                          {t(
                            'checkoutOrderNow'
                          )}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {!selectedOrder.isPaid ? (
                      <TouchableOpacity
                        style={
                          styles.addItemsOrderBtn
                        }
                        onPress={() => {
                          setEditOrder(
                            selectedOrder
                          );
                        }}
                      >
                        <Text
                          style={
                            styles.addItemsOrderBtnText
                          }
                        >
                          {t(
                            'addItemsToOrder'
                          )}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.paidBtn}
                      onPress={
                        handleMarkPaid
                      }
                    >
                      <Text
                        style={styles.paidBtnText}
                      >
                        {t(
                          'markPaidFreeTable'
                        )}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.secondaryBtn
                      }
                      onPress={() => {
                        setSelectedTableId(
                          null
                        );

                        handleClose();

                        onViewHistory?.(
                          selectedOrder
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.secondaryBtnText
                        }
                      >
                        {t('viewInHistory')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.secondaryBtn
                      }
                      onPress={() =>
                        beginEditTable(
                          selectedTable
                        )
                      }
                    >
                      <Text
                        style={
                          styles.secondaryBtnText
                        }
                      >
                        {t('editTable')}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text
                      style={
                        styles.detailStatus
                      }
                    >
                      {t('tableSeated')}
                    </Text>

                    {selectedTable.guestName ||
                    selectedTable.guestPhone ? (
                      <Text
                        style={
                          styles.detailGuest
                        }
                      >
                        {[
                          selectedTable.guestName,
                          selectedTable.guestPhone,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    ) : null}

                    <Text
                      style={
                        styles.detailEmpty
                      }
                    >
                      {t(
                        'tableSeatedNoOrderHint'
                      )}
                    </Text>

                    <View style={styles.phoneSection}>
                      <Text style={styles.phoneLabel}>
                        {t('customerWhatsAppNo')}
                      </Text>
                      {editingOrderPhone ? (
                        <View style={styles.phoneEditBox}>
                          <TextInput
                            style={styles.phoneInput}
                            value={orderPhoneDraft}
                            onChangeText={(value) =>
                              setOrderPhoneDraft(
                                sanitizeCustomerPhoneInput(
                                  value
                                )
                              )
                            }
                            placeholder={t(
                              'phoneExamplePlaceholder'
                            )}
                            keyboardType="phone-pad"
                            placeholderTextColor={
                              ui.textMuted
                            }
                            maxLength={
                              CUSTOMER_PHONE_MAX_LENGTH
                            }
                          />
                          <View
                            style={
                              styles.phoneEditActions
                            }
                          >
                            <TouchableOpacity
                              style={
                                styles.phoneCancelBtn
                              }
                              onPress={
                                cancelOrderPhoneEdit
                              }
                            >
                              <Text
                                style={
                                  styles.phoneCancelText
                                }
                              >
                                {t('cancel')}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={
                                styles.phoneSaveBtn
                              }
                              onPress={saveOrderPhone}
                            >
                              <Text
                                style={
                                  styles.phoneSaveText
                                }
                              >
                                {t('save')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.phoneRow}>
                          <Text
                            style={
                              styles.phoneValue
                            }
                          >
                            {orderPhoneDraft
                              ? orderPhoneDraft
                              : t('noNumberShort')}
                          </Text>
                          <TouchableOpacity
                            onPress={
                              beginOrderPhoneEdit
                            }
                            hitSlop={6}
                          >
                            <Text
                              style={
                                styles.phoneEditLink
                              }
                            >
                              {orderPhoneDraft
                                ? t('editNumber')
                                : t('addNumber')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.paidBtn}
                      onPress={() =>
                        startOrderForTable(
                          selectedTable
                        )
                      }
                    >
                      <Text
                        style={
                          styles.paidBtnText
                        }
                      >
                        {t(
                          'addOrderForTable'
                        )}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.secondaryBtn
                      }
                      onPress={() =>
                        handleFreeSeatedTable(
                          selectedTable
                        )
                      }
                    >
                      <Text
                        style={
                          styles.secondaryBtnText
                        }
                      >
                        {t(
                          'freeTableGuest'
                        )}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.secondaryBtn
                      }
                      onPress={() =>
                        beginEditTable(
                          selectedTable
                        )
                      }
                    >
                      <Text
                        style={
                          styles.secondaryBtnText
                        }
                      >
                        {t('editTable')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.dismissDetail}
                  onPress={() =>
                    setSelectedTableId(null)
                  }
                >
                  <Text
                    style={
                      styles.dismissDetailText
                    }
                  >
                    {t('close')}
                  </Text>
                </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          ) : null}

          {/* Add table / Color definitions panels */}
          {settingsPanel ? (
            <View style={styles.settingsOverlay}>
              <Pressable
                style={styles.detailBackdrop}
                onPress={closeSettingsPanel}
              />

              <View style={styles.detailSheet}>
                <ScrollView
                  style={styles.detailScroll}
                  contentContainerStyle={
                    styles.detailScrollContent
                  }
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {settingsPanel === 'add' ? (
                    <View style={styles.panelCard}>
                      <Text style={styles.sectionTitle}>
                        {t('addTable')}
                      </Text>

                      <Text style={styles.addHint}>
                        {t('addTableHint')}
                      </Text>

                      <TextInput
                        style={styles.input}
                        value={newNumber}
                        onChangeText={setNewNumber}
                        placeholder={t(
                          'tableNumberPlaceholder'
                        )}
                        placeholderTextColor={
                          ui.textMuted
                        }
                        autoCapitalize="characters"
                        maxLength={12}
                      />

                      <Text style={styles.fieldLabel}>
                        {t('tableSeatType')}
                      </Text>

                      <View style={styles.seatChips}>
                        {TABLE_SEAT_TYPES.map((type) => {
                          const active =
                            newSeatsType === type.id;

                          return (
                            <TouchableOpacity
                              key={type.id}
                              style={[
                                styles.seatChip,
                                active &&
                                  styles.seatChipActive,
                              ]}
                              onPress={() =>
                                selectSeatType(type.id)
                              }
                            >
                              <Text
                                style={[
                                  styles.seatChipText,
                                  active &&
                                    styles.seatChipTextActive,
                                ]}
                              >
                                {t(type.labelKey)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {newSeatsType === 'customer' ? (
                        <View style={styles.capacityWrap}>
                          <Text style={styles.fieldLabel}>
                            {t('tableSeatingCapacity')}
                          </Text>

                          <TextInput
                            style={styles.input}
                            value={newCapacity}
                            onChangeText={(value) =>
                              setNewCapacity(
                                value
                                  .replace(/[^\d]/g, '')
                                  .slice(0, 2)
                              )
                            }
                            placeholder={t(
                              'tableCapacityPlaceholder'
                            )}
                            placeholderTextColor={
                              ui.textMuted
                            }
                            keyboardType="number-pad"
                            maxLength={2}
                          />

                          <Text style={styles.capacityHint}>
                            {t('tableCapacityHint')}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.fixedCapacityNote}>
                          {t('tableFixedCapacityNote', {
                            count: resolveTableCapacity(
                              newSeatsType
                            ),
                          })}
                        </Text>
                      )}

                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => handleAddTable()}
                      >
                        <Text style={styles.addBtnText}>
                          {t('addTable')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.panelCard}>
                      <Text style={styles.sectionTitle}>
                        {t('colorLegendTitle')}
                      </Text>

                      <Text style={styles.legendHint}>
                        {t('colorLegendHint')}
                      </Text>

                      {COLOR_LEGEND_KEYS.map((key) => {
                        const color = TABLE_COLORS[key];

                        return (
                          <View
                            key={key}
                            style={styles.legendRow}
                          >
                            <View
                              style={[
                                styles.legendSwatch,
                                {
                                  backgroundColor:
                                    color.swatch,
                                },
                              ]}
                            />

                            <Text style={styles.legendLabel}>
                              {t(color.labelKey)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.dismissDetail}
                    onPress={closeSettingsPanel}
                  >
                    <Text style={styles.dismissDetailText}>
                      {t('close')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          ) : null}

          {/* Edit Order */}
          <EditOrderModal
            visible={Boolean(editOrder)}
            order={editOrder}
            onClose={() => setEditOrder(null)}
            onSave={handleSaveEditedOrder}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(ui) {
  return {
    page: {
      flex: 1,
      minHeight: 0,
      ...(Platform.OS === 'web'
        ? { height: '100%', maxHeight: '100%' }
        : {}),
    },

    body: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      backgroundColor: ui.bg,
    },

    header: {
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: ui.borderLight,
      zIndex: 40,
    },

    headerTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      position: 'relative',
      minWidth: 0,
    },

    title: {
      fontSize: 20,
      fontWeight: '800',
      color: ui.textPrimary,
      letterSpacing: -0.3,
      flexShrink: 1,
    },

    infoCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    infoCircleText: {
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 14,
    },

    hintTooltip: {
      position: 'absolute',
      top: 30,
      left: 0,
      right: 0,
      maxWidth: 320,
      zIndex: 50,
      borderWidth: 1,
      borderRadius: ui.radiusMd,
      paddingHorizontal: 12,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },

    hintTooltipText: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },

    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    menuWrap: {
      position: 'relative',
      zIndex: 45,
    },

    menuBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    menuDropdown: {
      position: 'absolute',
      top: 42,
      right: 0,
      minWidth: 180,
      borderWidth: 1,
      borderRadius: ui.radiusMd,
      paddingVertical: 4,
      zIndex: 50,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },

    menuItem: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    menuItemText: {
      fontSize: 14,
      fontWeight: '700',
    },

    menuDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 10,
    },

    menuDismiss: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 30,
    },

    closeText: {
      fontSize: 14,
      fontWeight: '700',
      color: ui.info,
    },

    scrollArea: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
    },

    scroll: {
      flexGrow: 0,
      flexShrink: 1,
      ...(Platform.OS === 'web'
        ? { overflow: 'auto' }
        : {}),
    },

    scrollContent: {
      padding: 16,
      paddingBottom: 28,
      gap: 16,
    },

    panelCard: {
      gap: 10,
    },

    legendHint: {
      fontSize: 12,
      color: ui.textSecondary,
      marginBottom: 4,
    },

    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    legendSwatch: {
      width: 16,
      height: 16,
      borderRadius: 4,
    },

    legendLabel: {
      flex: 1,
      fontSize: 13,
      color: ui.textPrimary,
      fontWeight: '500',
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: ui.textPrimary,
    },

    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ui.border,
      backgroundColor: ui.surface,
    },

    filterChipActive: {
      borderColor: '#ec4899',
      backgroundColor:
        'rgba(236, 72, 153, 0.12)',
    },

    filterChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: ui.textSecondary,
    },

    filterChipTextActive: {
      color: '#be185d',
    },

    emptyFilter: {
      textAlign: 'center',
      color: ui.textMuted,
      fontSize: 13,
      fontWeight: '600',
      paddingVertical: 12,
    },

    addHint: {
      fontSize: 12,
      color: ui.textSecondary,
      marginTop: -4,
    },

    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: ui.textSecondary,
    },

    capacityWrap: {
      gap: 6,
    },

    capacityHint: {
      fontSize: 12,
      color: ui.textMuted,
    },

    fixedCapacityNote: {
      fontSize: 12,
      color: ui.textSecondary,
      fontWeight: '600',
    },

    input: {
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: ui.radiusMd,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: ui.textPrimary,
      backgroundColor: ui.surface,
    },

    seatChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    seatChip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ui.border,
      backgroundColor: ui.surfaceMuted,
    },

    seatChipActive: {
      borderColor: '#ec4899',
      backgroundColor:
        'rgba(244, 114, 182, 0.18)',
    },

    seatChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: ui.textSecondary,
    },

    seatChipTextActive: {
      color: '#9d174d',
    },

    addBtn: {
      backgroundColor: ui.textPrimary,
      borderRadius: ui.radiusMd,
      paddingVertical: 12,
      alignItems: 'center',
    },

    addBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },

    groupBlock: {
      gap: 10,
    },

    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    groupTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: ui.textPrimary,
      flex: 1,
    },

    groupAddBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        'rgba(236, 72, 153, 0.45)',
      backgroundColor:
        'rgba(244, 114, 182, 0.14)',
    },

    groupAddBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#9d174d',
    },

    emptyGroup: {
      fontSize: 13,
      color: ui.textMuted,
      fontStyle: 'italic',
    },

    tableGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    tableCard: {
      width: '47%',
      minWidth: 140,
      flexGrow: 1,
      borderWidth: 1.5,
      borderRadius: ui.radiusLg,
      padding: 14,
      gap: 4,
    },

    tableCardEditing: {
      width: '100%',
      minWidth: '100%',
      gap: 8,
    },

    tableCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },

    tableCardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    tableIconBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(255,255,255,0.75)',
      borderWidth: 1,
      borderColor:
        'rgba(17,24,39,0.12)',
    },

    tableIconBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: ui.textPrimary,
    },

    tableRemoveBtn: {
      backgroundColor:
        'rgba(220, 38, 38, 0.12)',
      borderColor:
        'rgba(220, 38, 38, 0.35)',
    },

    tableRemoveBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#dc2626',
    },

    editCardTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: ui.textPrimary,
    },

    editActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },

    editCancelBtn: {
      flex: 1,
      borderRadius: ui.radiusMd,
      borderWidth: 1,
      borderColor: ui.border,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: ui.surfaceMuted,
    },

    editCancelText: {
      fontWeight: '700',
      color: ui.textSecondary,
    },

    editSaveBtn: {
      flex: 1.2,
      borderRadius: ui.radiusMd,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: ui.textPrimary,
    },

    editSaveText: {
      fontWeight: '800',
      color: '#fff',
    },

    tableNumber: {
      fontSize: 20,
      fontWeight: '800',
      color: ui.textPrimary,
      letterSpacing: 0.3,
      flex: 1,
    },

    tableMeta: {
      fontSize: 12,
      color: ui.textSecondary,
      fontWeight: '600',
    },

    tableStatus: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    tableActionHint: {
      marginTop: 2,
      fontSize: 11,
      color: ui.textMuted,
      fontWeight: '600',
    },

    cardAddOrderBtn: {
      marginTop: 8,
      backgroundColor: ui.success,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      alignItems: 'center',
    },

    cardAddOrderBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },

    tableGuest: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: '700',
      color: ui.textPrimary,
    },

    longPressHint: {
      fontSize: 12,
      color: ui.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },

    addItemsOrderBtn: {
      borderWidth: 1.5,
      borderColor: '#ec4899',
      backgroundColor:
        'rgba(244, 114, 182, 0.14)',
      borderRadius: ui.radiusMd,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },

    addItemsOrderBtnText: {
      color: '#9d174d',
      fontWeight: '800',
      fontSize: 14,
    },

    checkoutOrderBtn: {
      backgroundColor: ui.textPrimary,
      borderRadius: ui.radiusMd,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },

    checkoutOrderBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14,
    },

    phoneSection: {
      marginTop: 4,
      gap: 6,
    },

    phoneLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: ui.textSecondary,
    },

    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    phoneValue: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: ui.textPrimary,
    },

    phoneEditLink: {
      fontSize: 13,
      fontWeight: '700',
      color: ui.info,
    },

    phoneEditBox: {
      gap: 8,
    },

    phoneInput: {
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: ui.radiusMd,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: ui.textPrimary,
    },

    phoneEditActions: {
      flexDirection: 'row',
      gap: 8,
    },

    phoneCancelBtn: {
      flex: 1,
      borderRadius: ui.radiusMd,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.border,
    },

    phoneCancelText: {
      fontSize: 14,
      fontWeight: '700',
      color: ui.textSecondary,
    },

    phoneSaveBtn: {
      flex: 1,
      borderRadius: ui.radiusMd,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: ui.textPrimary,
    },

    phoneSaveText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },

    detailOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      zIndex: 20,
    },

    settingsOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      zIndex: 35,
    },

    detailBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        'rgba(17, 24, 39, 0.35)',
    },

    detailSheet: {
      backgroundColor: ui.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingTop: 18,
      paddingHorizontal: 18,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderColor:
        TABLE_COLORS.occupied.borderColor,
      maxHeight: '78%',
    },

    detailScroll: {
      flexGrow: 0,
      ...(Platform.OS === 'web'
        ? { maxHeight: '100%', overflow: 'auto' }
        : {}),
    },

    detailScrollContent: {
      gap: 8,
      paddingBottom: 18,
    },

    detailTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: ui.textPrimary,
    },

    detailStatus: {
      fontSize: 13,
      fontWeight: '800',
      color: '#b45309',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    detailMeta: {
      fontSize: 13,
      color: ui.textSecondary,
      fontWeight: '600',
    },

    detailOrder: {
      fontSize: 13,
      color: ui.textPrimary,
      marginTop: 4,
    },

    detailAmount: {
      fontSize: 22,
      fontWeight: '800',
      color:
        TABLE_COLORS.runningTableBill
          .accent,
    },

    detailItems: {
      fontSize: 13,
      color: ui.textSecondary,
      lineHeight: 20,
      marginBottom: 4,
    },

    detailEmpty: {
      fontSize: 13,
      color: ui.textMuted,
      marginVertical: 8,
    },

    detailGuest: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: '700',
      color: ui.textPrimary,
    },

    paidBtn: {
      backgroundColor: ui.success,
      borderRadius: ui.radiusMd,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },

    paidBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },

    secondaryBtn: {
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: ui.radiusMd,
      paddingVertical: 11,
      alignItems: 'center',
    },

    secondaryBtnText: {
      color: ui.textPrimary,
      fontWeight: '700',
      fontSize: 14,
    },

    dismissDetail: {
      alignItems: 'center',
      paddingVertical: 8,
    },

    dismissDetailText: {
      color: ui.textSecondary,
      fontWeight: '600',
    },
  };
}