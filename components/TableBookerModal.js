import React, { useEffect, useMemo, useState } from 'react';
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
import * as Speech from 'expo-speech';
import useStore from '../store/store';
import { showAlert } from '../utils/alert';
import { useTranslation } from '../utils/i18n';
import { useLayoutInsets } from '../hooks/useLayoutInsets';
import { getUI, UI } from '../utils/uiTheme';
import { useAppTheme } from '../utils/theme';
import {
  TABLE_COLORS,
  formatTableCapacityLabel,
  getTableOccupancyKind,
  resolveTableCapacity,
} from '../utils/tableManagement';
import {
  buildTableReadyAnnounceMessage,
  buildTableReadyWhatsAppMessage,
  filterWaitlistByParty,
  getUniquePartySizes,
} from '../utils/waitlist';
import { sendViaWhatsApp } from '../utils/billShare';

async function announceTableReady(message) {
  const text = String(message || '').trim();
  if (!text) return false;

  try {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      await Speech.stop();
    }
  } catch {
    // ignore stop failures
  }

  try {
    Speech.speak(text, {
      rate: 0.95,
      pitch: 1,
      language: 'en-IN',
    });
    return true;
  } catch {
    // Fallback for web if expo-speech fails.
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      return true;
    }
    return false;
  }
}

function sortTables(list) {
  return [...(list || [])].sort((a, b) =>
    String(a.number).localeCompare(String(b.number), undefined, { numeric: true })
  );
}

function getFloorStyle(kind) {
  if (kind === 'available') return TABLE_COLORS.available;
  if (kind === 'seated') return TABLE_COLORS.seated;
  return TABLE_COLORS.historyTableOrder;
}

export default function TableBookerModal({ visible, onClose, onSeated, onStartOrder }) {
  const { t } = useTranslation();
  const { top: topInset, bottom: bottomInset } = useLayoutInsets();
  const waitlist = useStore((s) => s.waitlist);
  const tables = useStore((s) => s.tables);
  const appearanceMode = useStore((s) => s.appearanceMode);
  const setAppearanceMode = useStore((s) => s.setAppearanceMode);
  const addWaitlistCustomer = useStore((s) => s.addWaitlistCustomer);
  const removeWaitlistCustomer = useStore((s) => s.removeWaitlistCustomer);
  const seatWaitlistCustomer = useStore((s) => s.seatWaitlistCustomer);
  const setActiveTable = useStore((s) => s.setActiveTable);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [party, setParty] = useState('');
  const [filterParty, setFilterParty] = useState(null);
  const [filterInput, setFilterInput] = useState('');
  const [seatingCustomer, setSeatingCustomer] = useState(null);
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);
  const fallbackScrollHeight = useMemo(() => {
    const windowHeight = Dimensions.get('window').height;
    return Math.max(280, Math.round(windowHeight - topInset - bottomInset - 160));
  }, [topInset, bottomInset, visible]);

  useEffect(() => {
    if (!visible) {
      setScrollAreaHeight(0);
      return undefined;
    }
    return () => {
      Speech.stop().catch(() => {});
    };
  }, [visible]);

  const isDark = appearanceMode === 'dark';
  const theme = useAppTheme();
  const c = useMemo(() => {
    const ui = getUI(isDark ? 'dark' : 'light');
    return {
      overlay: ui.overlay,
      sheet: ui.bg,
      surface: ui.surface,
      surfaceMuted: ui.surfaceMuted,
      border: ui.border,
      borderLight: ui.borderLight,
      textPrimary: ui.textPrimary,
      textSecondary: ui.textSecondary,
      textMuted: ui.textMuted,
      accent: theme.buttonColor,
      accentText: '#ffffff',
      link: ui.info,
      success: ui.success,
      warn: ui.warning,
      chipActive: theme.filterSortColor,
      queueAccent: theme.buttonColor,
      seatBackdrop: ui.overlay,
    };
  }, [isDark, theme.buttonColor, theme.filterSortColor]);

  const partySizes = useMemo(() => getUniquePartySizes(waitlist), [waitlist]);
  const filteredQueue = useMemo(
    () => filterWaitlistByParty(waitlist, filterParty),
    [waitlist, filterParty]
  );

  const sortedTables = useMemo(() => sortTables(tables), [tables]);

  const floorStats = useMemo(() => {
    let free = 0;
    let busy = 0;
    sortedTables.forEach((table) => {
      if (getTableOccupancyKind(table) === 'available') free += 1;
      else busy += 1;
    });
    return { free, busy };
  }, [sortedTables]);

  const seatingOptions = useMemo(() => {
    if (!seatingCustomer) return [];
    const partySize = Math.max(1, Math.floor(Number(seatingCustomer.party) || 1));
    return sortedTables.map((table) => {
      const kind = getTableOccupancyKind(table);
      const capacity = resolveTableCapacity(table.seatsType, table.capacity);
      const fits = kind === 'available' && capacity >= partySize;
      return { table, kind, capacity, fits };
    });
  }, [sortedTables, seatingCustomer]);

  const availableForSeat = useMemo(
    () => seatingOptions.filter((entry) => entry.fits),
    [seatingOptions]
  );

  const resetForm = () => {
    setName('');
    setPhone('');
    setParty('');
  };

  const handleClose = () => {
    setSeatingCustomer(null);
    onClose?.();
  };

  const startOrderForTable = (table) => {
    if (!table) return;
    const kind = getTableOccupancyKind(table);
    if (kind === 'ordering') {
      showAlert(t('validation'), t('tableOccupiedMsg'));
      return;
    }
    if (kind !== 'seated') return;
    const result = setActiveTable(table.id);
    if (!result?.success) {
      showAlert(t('validation'), t('tableOccupiedMsg'));
      return;
    }
    handleClose();
    onStartOrder?.(table);
  };

  const handleFloorTablePress = (table) => {
    const kind = getTableOccupancyKind(table);
    if (kind === 'seated') {
      startOrderForTable(table);
      return;
    }
    if (kind === 'ordering') {
      showAlert(t('validation'), t('tableOccupiedMsg'));
    }
  };

  const handleAdd = () => {
    const result = addWaitlistCustomer({ name, phone, party });
    if (!result?.success) {
      showAlert(t('validation'), t('waitlistInvalid'));
      return;
    }
    resetForm();
  };

  const handleNotify = (customer) => {
    const message = buildTableReadyWhatsAppMessage(customer);
    sendViaWhatsApp(message, customer.phone);
  };

  const handleAnnounce = async (customer) => {
    const message = buildTableReadyAnnounceMessage(customer);
    const spoken = await announceTableReady(message);
    if (!spoken) {
      showAlert(t('waitlistAnnounceTitle'), message);
    }
  };

  const handleDone = (customerId) => {
    removeWaitlistCustomer(customerId);
  };

  const handleSeatPress = (customer) => {
    setSeatingCustomer(customer);
  };

  const handleConfirmSeat = (table) => {
    if (!seatingCustomer) return;
    const result = seatWaitlistCustomer(seatingCustomer.id, table.id);
    if (!result?.success) {
      if (result?.error === 'has_order') {
        showAlert(t('validation'), t('tableOccupiedMsg'));
      } else {
        showAlert(t('validation'), t('waitlistSeatFailed'));
      }
      return;
    }
    const customer = seatingCustomer;
    setSeatingCustomer(null);
    onSeated?.(table, customer);
    const activate = setActiveTable(table.id);
    if (activate?.success) {
      handleClose();
      onStartOrder?.(table);
      return;
    }
    showAlert(
      t('waitlistSeatedTitle'),
      t('waitlistSeatedMsg', { name: customer.name, number: table.number })
    );
  };

  const applyFilterInput = (value) => {
    setFilterInput(value);
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      setFilterParty(null);
      return;
    }
    const size = Number(trimmed);
    setFilterParty(Number.isFinite(size) && size >= 1 ? size : null);
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
            backgroundColor: c.sheet,
            paddingTop: topInset,
            paddingBottom: Math.max(bottomInset, 16),
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        <View style={styles.body}>
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: c.textPrimary }]}>{t('tableBooker')}</Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                {t('tableBookerHint')}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <View style={[styles.themeToggle, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
                <TouchableOpacity
                  style={[
                    styles.themeBtn,
                    !isDark && { backgroundColor: c.accent },
                  ]}
                  onPress={() => setAppearanceMode('light')}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      { color: !isDark ? c.accentText : c.textSecondary },
                    ]}
                  >
                    {t('themeLight')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeBtn,
                    isDark && { backgroundColor: c.accent },
                  ]}
                  onPress={() => setAppearanceMode('dark')}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      { color: isDark ? c.accentText : c.textSecondary },
                    ]}
                  >
                    {t('themeDark')}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleClose} hitSlop={8}>
                <Text style={[styles.closeText, { color: c.link }]}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={styles.scrollArea}
            onLayout={(event) => {
              const next = Math.round(event.nativeEvent.layout.height);
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
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
            bounces
          >
            <View
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.borderLight },
              ]}
            >
              <Text style={[styles.cardTitle, { color: c.textPrimary }]}>
                {t('waitlistAddTitle')}
              </Text>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('waitlistName')}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceMuted,
                    borderColor: c.border,
                    color: c.textPrimary,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder={t('waitlistNamePlaceholder')}
                placeholderTextColor={c.textMuted}
              />
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('waitlistPhone')}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceMuted,
                    borderColor: c.border,
                    color: c.textPrimary,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('waitlistPhonePlaceholder')}
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
              />
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('waitlistParty')}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceMuted,
                    borderColor: c.border,
                    color: c.textPrimary,
                  },
                ]}
                value={party}
                onChangeText={(value) => setParty(value.replace(/[^\d]/g, '').slice(0, 2))}
                placeholder={t('waitlistPartyPlaceholder')}
                placeholderTextColor={c.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: c.accent }]}
                onPress={handleAdd}
              >
                <Text style={[styles.submitBtnText, { color: c.accentText }]}>
                  {t('waitlistAddBtn')}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.borderLight },
              ]}
            >
              <View style={styles.floorHeader}>
                <Text style={[styles.cardTitle, { color: c.textPrimary }]}>
                  {t('waitlistFloorTitle')}
                </Text>
                <Text style={[styles.floorStats, { color: c.textSecondary }]}>
                  {t('waitlistFloorFree', { count: floorStats.free })} ·{' '}
                  {t('waitlistFloorBusy', { count: floorStats.busy })}
                </Text>
              </View>
              <View style={styles.floorGrid}>
                {sortedTables.map((table) => {
                  const kind = getTableOccupancyKind(table);
                  const colors = getFloorStyle(kind);
                  const statusLabel =
                    kind === 'available'
                      ? t('waitlistFloorFreeLabel')
                      : kind === 'seated'
                        ? t('waitlistFloorSeatedLabel')
                        : t('waitlistFloorBusyLabel');
                  const Card = kind === 'seated' ? TouchableOpacity : View;
                  return (
                    <Card
                      key={table.id}
                      style={[
                        styles.floorCard,
                        {
                          backgroundColor: colors.backgroundColor,
                          borderColor: colors.borderColor,
                        },
                      ]}
                      onPress={kind === 'seated' ? () => handleFloorTablePress(table) : undefined}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.floorNumber, { color: c.textPrimary }]}>
                        {table.number}
                      </Text>
                      <Text style={[styles.floorMeta, { color: c.textSecondary }]}>
                        {formatTableCapacityLabel(table, t)}
                      </Text>
                      <Text style={[styles.floorStatus, { color: colors.swatch }]}>
                        {statusLabel}
                      </Text>
                      {table.guestName ? (
                        <Text style={[styles.floorGuest, { color: c.textPrimary }]} numberOfLines={1}>
                          {table.guestName}
                        </Text>
                      ) : null}
                      {kind === 'seated' ? (
                        <Text style={[styles.floorAddHint, { color: c.success }]}>
                          {t('addOrderForTable')}
                        </Text>
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            </View>

            <View style={styles.queueHeader}>
              <Text style={[styles.queueTitle, { color: c.textPrimary }]}>{t('waitlistLive')}</Text>
              <View style={[styles.queueBadge, { backgroundColor: c.accent }]}>
                <Text style={[styles.queueBadgeText, { color: c.accentText }]}>
                  {filterParty != null
                    ? t('waitlistCountFiltered', {
                        filtered: filteredQueue.length,
                        total: waitlist.length,
                      })
                    : t('waitlistCount', { count: waitlist.length })}
                </Text>
              </View>
            </View>

            <View style={styles.filterSection}>
              <TextInput
                style={[
                  styles.input,
                  styles.filterInput,
                  {
                    backgroundColor: c.surfaceMuted,
                    borderColor: c.border,
                    color: c.textPrimary,
                  },
                ]}
                value={filterInput}
                onChangeText={applyFilterInput}
                placeholder={t('waitlistFilterPlaceholder')}
                placeholderTextColor={c.textMuted}
                keyboardType="number-pad"
              />
              <View style={styles.filterChips}>
                {partySizes.map((size) => {
                  const active = filterParty === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: active ? c.chipActive : c.border,
                          backgroundColor: active ? c.chipActive : c.surface,
                        },
                      ]}
                      onPress={() => {
                        const next = filterParty === size ? null : size;
                        setFilterParty(next);
                        setFilterInput(next ? String(next) : '');
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: active ? '#fff' : c.textSecondary },
                        ]}
                      >
                        {t('waitlistPartyChip', { count: size })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.clearFilterBtn, { borderColor: c.border }]}
                onPress={() => {
                  setFilterParty(null);
                  setFilterInput('');
                }}
              >
                <Text style={[styles.clearFilterText, { color: c.textMuted }]}>
                  {t('waitlistClearFilter')}
                </Text>
              </TouchableOpacity>
            </View>

            {filteredQueue.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
                  {filterParty != null ? t('waitlistNoMatchTitle') : t('waitlistEmptyTitle')}
                </Text>
                <Text style={[styles.emptySub, { color: c.textMuted }]}>
                  {filterParty != null
                    ? t('waitlistNoMatchSub', { count: filterParty })
                    : t('waitlistEmptySub')}
                </Text>
              </View>
            ) : (
              filteredQueue.map((customer, index) => (
                <View
                  key={customer.id}
                  style={[
                    styles.queueItem,
                    {
                      backgroundColor: c.surface,
                      borderColor: c.borderLight,
                      borderLeftColor: c.queueAccent,
                    },
                  ]}
                >
                  <View style={styles.customerInfo}>
                    <View style={[styles.queueNumber, { backgroundColor: c.surfaceMuted }]}>
                      <Text style={[styles.queueNumberText, { color: c.textMuted }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.customerCopy}>
                      <Text style={[styles.customerName, { color: c.textPrimary }]}>
                        {customer.name}
                      </Text>
                      <Text style={[styles.customerMeta, { color: c.textSecondary }]}>
                        {t('waitlistPartyOf', { count: customer.party })} · {customer.phone}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.notifyBtn]}
                      onPress={() => handleNotify(customer)}
                    >
                      <Text style={styles.actionBtnText}>{t('waitlistNotify')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.announceBtn]}
                      onPress={() => handleAnnounce(customer)}
                    >
                      <Text style={styles.actionBtnText}>{t('waitlistAnnounce')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.seatBtn]}
                      onPress={() => handleSeatPress(customer)}
                    >
                      <Text style={styles.actionBtnText}>{t('waitlistSeat')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.doneBtn]}
                      onPress={() => handleDone(customer.id)}
                    >
                      <Text style={styles.actionBtnText}>{t('waitlistDone')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          </View>

          {seatingCustomer ? (
            <View style={styles.seatOverlay}>
              <Pressable
                style={[styles.seatBackdrop, { backgroundColor: c.seatBackdrop }]}
                onPress={() => setSeatingCustomer(null)}
              />
              <View style={[styles.seatSheet, { backgroundColor: c.surface }]}>
                <Text style={[styles.seatTitle, { color: c.textPrimary }]}>
                  {t('waitlistPickTableTitle', { name: seatingCustomer.name })}
                </Text>
                <Text style={[styles.seatHint, { color: c.textSecondary }]}>
                  {t('waitlistPickTableHint', { count: seatingCustomer.party })}
                </Text>
                {availableForSeat.length === 0 ? (
                  <Text style={[styles.seatEmpty, { color: c.warn }]}>
                    {t('waitlistNoAvailableTable')}
                  </Text>
                ) : null}
                <View style={styles.seatScrollWrap}>
                  <ScrollView
                    style={[
                      styles.seatScroll,
                      Platform.OS === 'web' ? styles.seatScrollWeb : null,
                    ]}
                    contentContainerStyle={styles.seatScrollContent}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >
                    <View style={styles.seatGrid}>
                      {seatingOptions.map(({ table, kind, fits }) => {
                        const colors = getFloorStyle(kind);
                        const label = fits
                          ? t('waitlistFloorFits')
                          : kind === 'available'
                            ? t('waitlistFloorTooSmall')
                            : kind === 'seated'
                              ? t('waitlistFloorSeatedLabel')
                              : t('waitlistFloorBusyLabel');
                        return (
                          <TouchableOpacity
                            key={table.id}
                            disabled={!fits}
                            style={[
                              styles.seatTableCard,
                              {
                                backgroundColor: colors.backgroundColor,
                                borderColor: colors.borderColor,
                                opacity: fits ? 1 : 0.55,
                              },
                            ]}
                            onPress={() => handleConfirmSeat(table)}
                          >
                            <Text style={[styles.seatTableNumber, { color: c.textPrimary }]}>
                              {table.number}
                            </Text>
                            <Text style={[styles.seatTableMeta, { color: c.textSecondary }]}>
                              {formatTableCapacityLabel(table, t)}
                            </Text>
                            <Text style={[styles.seatTableStatus, { color: colors.swatch }]}>
                              {label}
                            </Text>
                            {table.guestName ? (
                              <Text
                                style={[styles.seatTableGuest, { color: c.textPrimary }]}
                                numberOfLines={1}
                              >
                                {table.guestName}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
                <TouchableOpacity
                  style={styles.seatCancel}
                  onPress={() => setSeatingCustomer(null)}
                >
                  <Text style={[styles.seatCancelText, { color: c.textSecondary }]}>
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    ...(Platform.OS === 'web' ? { overflow: 'auto' } : {}),
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  themeToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    maxWidth: 260,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    borderRadius: UI.radiusLg,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  floorStats: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  floorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  floorCard: {
    width: '30%',
    minWidth: 88,
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: UI.radiusMd,
    padding: 10,
  },
  floorNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  floorMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  floorStatus: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
  },
  floorGuest: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
  },
  floorAddHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: UI.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 10,
    borderRadius: UI.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnText: {
    fontWeight: '800',
    fontSize: 15,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  queueBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  queueBadgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  filterSection: {
    gap: 8,
  },
  filterInput: {
    marginBottom: 0,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: UI.radiusMd,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearFilterBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: UI.radiusMd,
    borderWidth: 1,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
  },
  queueItem: {
    borderRadius: UI.radiusMd,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  queueNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  customerCopy: { flex: 1 },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  customerMeta: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  notifyBtn: { backgroundColor: '#22c55e' },
  announceBtn: { backgroundColor: '#3b82f6' },
  seatBtn: { backgroundColor: '#f97316' },
  doneBtn: { backgroundColor: '#ef4444' },
  seatOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 30,
  },
  seatBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  seatSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 8,
    gap: 10,
    maxHeight: '78%',
  },
  seatTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  seatHint: {
    fontSize: 13,
  },
  seatEmpty: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 12,
  },
  seatScrollWrap: {
    maxHeight: 340,
    minHeight: 120,
  },
  seatScroll: {
    flexGrow: 0,
  },
  seatScrollWeb: {
    maxHeight: 340,
    overflow: 'auto',
  },
  seatScrollContent: {
    paddingBottom: 8,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  seatTableCard: {
    width: '47%',
    minWidth: 120,
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: UI.radiusLg,
    padding: 14,
  },
  seatTableNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  seatTableMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  seatTableStatus: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  seatTableGuest: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  seatCancel: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 12,
  },
  seatCancelText: {
    fontWeight: '700',
  },
});
