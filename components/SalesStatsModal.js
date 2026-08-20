import React, {
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { formatCurrency } from '../utils/currency';

import {
  cardStyle,
  useThemedStyles,
} from '../utils/uiTheme';

import {
  getSalesTrend,
  getItemLevelSales,
  STATS_PERIODS,
} from '../utils/salesStats';

const CHART_HEIGHT = 160;
const ITEM_BAR_MAX_WIDTH = '100%';

/* -------------------------------------------------------------------------- */
/*                            Vertical Bar Chart                              */
/* -------------------------------------------------------------------------- */

const VerticalBarChart = memo(function VerticalBarChart({
  buckets,
  maxRevenue,
  barColor,
  emptyLabel,
  styles,
}) {
  const max =
    maxRevenue > 0 ? maxRevenue : 1;

  const showEvery =
    buckets.length > 14
      ? 3
      : buckets.length > 8
        ? 2
        : 1;

  const hasSales =
    buckets.length > 0 &&
    buckets.some(
      (bucket) => bucket.revenue > 0
    );

  if (!hasSales) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>
          {emptyLabel}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chartScroll}
    >
      <View
        style={[
          styles.chartArea,
          {
            minWidth: Math.max(
              buckets.length * 36,
              280
            ),
          },
        ]}
      >
        <View style={styles.barsRow}>
          {buckets.map((bucket) => {
            const height = Math.max(
              2,
              (bucket.revenue / max) *
                (CHART_HEIGHT - 28)
            );

            const hasRevenue =
              bucket.revenue > 0;

            return (
              <View
                key={`bar-${bucket.key}`}
                style={styles.barCol}
              >
                {hasRevenue ? (
                  <Text style={styles.barValue}>
                    {bucket.revenue >= 1000
                      ? `${(
                          bucket.revenue / 1000
                        ).toFixed(1)}k`
                      : Math.round(
                          bucket.revenue
                        )}
                  </Text>
                ) : (
                  <View
                    style={
                      styles.barValueSpacer
                    }
                  />
                )}

                <View
                  style={[
                    styles.barTrack,
                    {
                      height:
                        CHART_HEIGHT - 28,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        height,
                        backgroundColor:
                          barColor,
                        opacity: hasRevenue
                          ? 1
                          : 0.18,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.labelRow}>
          {buckets.map(
            (bucket, index) => (
              <View
                key={`lbl-${bucket.key}`}
                style={styles.barCol}
              >
                <Text
                  style={styles.barLabel}
                  numberOfLines={1}
                >
                  {index % showEvery === 0 ||
                  index ===
                    buckets.length - 1
                    ? bucket.shortLabel
                    : ''}
                </Text>
              </View>
            )
          )}
        </View>
      </View>
    </ScrollView>
  );
});

/* -------------------------------------------------------------------------- */
/*                          Horizontal Item Bars                              */
/* -------------------------------------------------------------------------- */

const HorizontalItemBars = memo(
  function HorizontalItemBars({
    items,
    maxRevenue,
    barColor,
    emptyLabel,
    qtyLabel,
    styles,
  }) {
    const max =
      maxRevenue > 0 ? maxRevenue : 1;

    if (!items.length) {
      return (
        <View style={styles.emptyChart}>
          <Text
            style={styles.emptyChartText}
          >
            {emptyLabel}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.itemBars}>
        {items.map((item) => {
          const widthPct = Math.max(
            4,
            (item.revenue / max) * 100
          );

          return (
            <View
              key={item.key || item.name}
              style={styles.itemRow}
            >
              <View style={styles.itemMeta}>
                <Text
                  style={styles.itemName}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                <Text
                  style={styles.itemSub}
                  numberOfLines={1}
                >
                  {qtyLabel(item.quantity)}
                  {' · '}
                  {formatCurrency(
                    item.revenue
                  )}
                </Text>
              </View>

              <View style={styles.itemTrack}>
                <View
                  style={[
                    styles.itemFill,
                    {
                      width: `${widthPct}%`,
                      maxWidth:
                        ITEM_BAR_MAX_WIDTH,
                      backgroundColor:
                        barColor,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  }
);

/* -------------------------------------------------------------------------- */
/*                             Main Modal                                     */
/* -------------------------------------------------------------------------- */

export default function SalesStatsModal({
  visible,
  onClose,
  orders = [],
  shopName = '',
}) {
  const { ui, styles } =
    useThemedStyles(createStyles);

  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] =
    useState('daily');

  /* ----------------------------- Sales Trend ----------------------------- */

  const trend = useMemo(
    () =>
      getSalesTrend(
        orders,
        period
      ),
    [orders, period]
  );

  /* ---------------------------- Item Sales ------------------------------- */

  const itemSales = useMemo(
    () =>
      getItemLevelSales(
        orders,
        period
      ),
    [orders, period]
  );

  /* ---------------------------- Period Label ----------------------------- */

  const periodLabel = useMemo(
    () => t(`stats_${period}`),
    [t, period]
  );

  /* -------------------------- Period Handler ----------------------------- */

  const handlePeriodChange =
    useCallback((nextPeriod) => {
      setPeriod(nextPeriod);
    }, []);

  /* ---------------------------- Qty Label -------------------------------- */

  const qtyLabel = useCallback(
    (count) => {
      return count === 1
        ? t('statsQtyOne', {
            count,
          })
        : t('statsQtyMany', {
            count,
          });
    },
    [t]
  );

  /* ---------------------------- Colors ---------------------------------- */

  const trendBarColor =
    theme.buttonColor || '#e94560';

  const itemBarColor =
    theme.headerColor || '#1a1a2e';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(
                insets.bottom,
                16
              ),
            },
          ]}
        >
          {/* ----------------------------- Header ---------------------------- */}

          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.title,
                  {
                    color:
                      theme.textColor,
                  },
                ]}
              >
                {t('salesStatistics')}
              </Text>

              <Text
                style={styles.subtitle}
                numberOfLines={1}
              >
                {shopName ||
                  t(
                    'shopNamePlaceholder'
                  )}
                {' · '}
                {periodLabel}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text
                style={styles.closeText}
              >
                {t('close')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* --------------------------- Period Tabs -------------------------- */}

          <View style={styles.periodRow}>
            {STATS_PERIODS.map((id) => {
              const active =
                period === id;

              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.periodBtn,
                    active && {
                      backgroundColor:
                        `${theme.filterSortColor}18`,
                      borderColor:
                        theme.filterSortColor,
                    },
                  ]}
                  onPress={() =>
                    handlePeriodChange(id)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.periodText,
                      active && {
                        color:
                          theme.filterSortColor,
                      },
                    ]}
                  >
                    {t(`stats_${id}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ----------------------------- Content --------------------------- */}

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
          >
            {/* ------------------------- Summary ---------------------------- */}

            <View
              style={styles.summaryRow}
            >
              <View
                style={styles.summaryCard}
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  {t('statsRevenue')}
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        theme.buttonColor,
                    },
                  ]}
                >
                  {formatCurrency(
                    trend.totalRevenue
                  )}
                </Text>
              </View>

              <View
                style={styles.summaryCard}
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  {t('statsOrders')}
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        theme.headerColor,
                    },
                  ]}
                >
                  {trend.orderCount}
                </Text>
              </View>
            </View>

            {/* ------------------------- Trend ------------------------------ */}

            <Text
              style={styles.sectionTitle}
            >
              {t('statsSalesTrend')}
            </Text>

            <View
              style={styles.chartCard}
            >
              <VerticalBarChart
                buckets={
                  trend.buckets
                }
                maxRevenue={
                  trend.maxRevenue
                }
                barColor={
                  trendBarColor
                }
                emptyLabel={t(
                  'statsNoSales'
                )}
                styles={styles}
              />
            </View>

            {/* ------------------------- Item Sales ------------------------- */}

            <Text
              style={styles.sectionTitle}
            >
              {t('statsItemSales')}
            </Text>

            <Text
              style={styles.sectionHint}
            >
              {t('statsItemSalesHint')}
            </Text>

            <View
              style={styles.chartCard}
            >
              <HorizontalItemBars
                items={
                  itemSales.items
                }
                maxRevenue={
                  itemSales.maxRevenue
                }
                barColor={
                  itemBarColor
                }
                emptyLabel={t(
                  'statsNoSales'
                )}
                qtyLabel={qtyLabel}
                styles={styles}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Styles                                      */
/* -------------------------------------------------------------------------- */

function createStyles(ui) {
  return {
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor:
        'rgba(17,24,39,0.45)',
    },

    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },

    sheet: {
      backgroundColor: ui.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '92%',
      paddingTop: 8,
      paddingHorizontal: 16,
    },

    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#ced4da',
      marginBottom: 10,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },

    headerText: {
      flex: 1,
    },

    title: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
    },

    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: ui.textSecondary,
      fontWeight: '600',
    },

    closeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor:
        ui.surfaceMuted,
    },

    closeText: {
      fontSize: 13,
      fontWeight: '700',
      color: ui.textSecondary,
    },

    periodRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },

    periodBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: ui.radiusFull,
      backgroundColor:
        ui.surfaceMuted,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },

    periodText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#868e96',
    },

    scrollContent: {
      paddingBottom: 24,
    },

    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },

    summaryCard: {
      flex: 1,
      ...cardStyle(ui, {
        padding: 14,
        borderRadius: 12,
      }),
    },

    summaryLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: ui.textSecondary,
      marginBottom: 6,
    },

    summaryValue: {
      fontSize: 18,
      fontWeight: '800',
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: ui.textPrimary,
      marginBottom: 8,
      letterSpacing: -0.2,
    },

    sectionHint: {
      fontSize: 12,
      color: ui.textSecondary,
      marginTop: -4,
      marginBottom: 8,
    },

    chartCard: {
      ...cardStyle(ui, {
        padding: 14,
        borderRadius: 12,
      }),
      marginBottom: 18,
    },

    chartScroll: {
      paddingRight: 8,
    },

    chartArea: {
      paddingTop: 4,
    },

    barsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: CHART_HEIGHT,
    },

    labelRow: {
      flexDirection: 'row',
      marginTop: 6,
    },

    barCol: {
      width: 32,
      marginHorizontal: 2,
      alignItems: 'center',
    },

    barValue: {
      fontSize: 9,
      fontWeight: '700',
      color: ui.textSecondary,
      marginBottom: 4,
    },

    barValueSpacer: {
      height: 14,
      marginBottom: 4,
    },

    barTrack: {
      width: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },

    barFill: {
      width: 18,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      minHeight: 2,
    },

    barLabel: {
      fontSize: 9,
      color: '#868e96',
      fontWeight: '600',
      textAlign: 'center',
    },

    emptyChart: {
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
    },

    emptyChartText: {
      fontSize: 14,
      color: ui.textSecondary,
      fontWeight: '600',
    },

    itemBars: {
      gap: 12,
    },

    itemRow: {
      gap: 6,
    },

    itemMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 8,
    },

    itemName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: ui.textPrimary,
    },

    itemSub: {
      fontSize: 11,
      fontWeight: '600',
      color: ui.textSecondary,
    },

    itemTrack: {
      height: 12,
      borderRadius: 6,
      backgroundColor:
        ui.surfaceMuted,
      overflow: 'hidden',
    },

    itemFill: {
      height: '100%',
      borderRadius: 6,
    },
  };
}