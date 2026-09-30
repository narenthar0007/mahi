import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  TextInput,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/store';
import ItemConfigModal from '../components/ItemConfigModal';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrency } from '../utils/currency';
import { confirmAction, showAlert } from '../utils/alert';
import { filterAndSortInventory } from '../utils/inventoryFilters';
import {
  CUSTOMER_PHONE_MAX_LENGTH,
  getCustomerPhoneValidationMessage,
  normalizePhoneNumber,
  sanitizeCustomerPhoneInput,
} from '../utils/billShare';
import { shareUpiQrOnWhatsApp, shareWhatsAppInvoiceText } from '../utils/invoiceExport';
import { normalizeUpiQrUri } from '../utils/upiQr';
import { useAppTheme } from '../utils/theme';
import {
  calculateBillTotals,
  calculateOfferDiscount,
  formatOfferSummary,
  isShopOfferConfigured,
} from '../utils/offers';
import { useTranslation } from '../utils/i18n';
import { floatingBar, shadow, useThemedStyles } from '../utils/uiTheme';
import { useResponsiveLayout } from '../utils/responsive';
import { TABLE_COLORS } from '../utils/tableManagement';
import AppEmptyState from '../components/ui/AppEmptyState';

export default function BillingScreen() {
  const { ui, styles } = useThemedStyles(createStyles);
  const { t, sortOptions, language } = useTranslation();
  const inventory = useStore((s) => s.inventory);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const updateCartItemQuantity = useStore((s) => s.updateCartItemQuantity);
  const updateCartItemNote = useStore((s) => s.updateCartItemNote);
  const checkout = useStore((s) => s.checkout);
  const getCartTotal = useStore((s) => s.getCartTotal);
  const history = useStore((s) => s.history);
  const tables = useStore((s) => s.tables);
  const activeTableId = useStore((s) => s.activeTableId);
  const clearActiveTable = useStore((s) => s.clearActiveTable);
  const shopName = useStore((s) => s.shopName);
  const fssaiNumber = useStore((s) => s.fssaiNumber);
  const gstinNumber = useStore((s) => s.gstinNumber);
  const shopWebsite = useStore((s) => s.shopWebsite);
  const menuWebsite = useStore((s) => s.menuWebsite);
  const includeWebsitesInWhatsApp = useStore((s) => s.includeWebsitesInWhatsApp);
  const upiQrUri = useStore((s) => s.upiQrUri);
  const showWhatsAppInvoiceButtons = useStore((s) => s.showWhatsAppInvoiceButtons);
  const shopOffer = useStore((s) => s.shopOffer);
  const menuListView = useStore((s) => s.menuListView);
  const setMenuListView = useStore((s) => s.setMenuListView);
  const theme = useAppTheme();
  const { menuColumns, isNarrow, scaledSize, horizontalPad } = useResponsiveLayout();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [checkoutConfirmVisible, setCheckoutConfirmVisible] = useState(false);
  const [offerConfirmVisible, setOfferConfirmVisible] = useState(false);
  const [checkoutOfferApplied, setCheckoutOfferApplied] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [billVisible, setBillVisible] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [billPaid, setBillPaid] = useState(false);
  const [upiCheckout, setUpiCheckout] = useState(null);
  const [sharingUpiQr, setSharingUpiQr] = useState(false);

  const activeInventory = useMemo(
    () =>
      (Array.isArray(inventory) ? inventory : [])
        .filter((item) => item != null)
        .map((item) => ({
          ...item,
          basePrice: item.basePrice ?? 0,
          variants: Array.isArray(item.variants) ? item.variants : [],
          addons: Array.isArray(item.addons) ? item.addons : [],
          enabled: item.enabled !== false,
          isWeightBased: Boolean(item.isWeightBased),
          isVariablePrice: Boolean(item.isVariablePrice),
          unit: item.unit || '',
        }))
        .filter((item) => item.enabled !== false),
    [inventory]
  );

  const filteredInventory = useMemo(
    () => filterAndSortInventory(activeInventory, { search: searchQuery, sortBy }),
    [activeInventory, searchQuery, sortBy]
  );

  const cartTotal = getCartTotal();
  const taxBreakdown = useMemo(
    () => calculateBillTotals(cartTotal, { taxEnabled, shopOffer, offerApplied: false }),
    [cartTotal, taxEnabled, shopOffer]
  );
  const offerPreviewBill = useMemo(
    () => calculateBillTotals(cartTotal, { taxEnabled, shopOffer, offerApplied: true }),
    [cartTotal, taxEnabled, shopOffer]
  );
  const checkoutBill = useMemo(
    () =>
      calculateBillTotals(cartTotal, {
        taxEnabled,
        shopOffer,
        offerApplied: checkoutOfferApplied,
      }),
    [cartTotal, taxEnabled, shopOffer, checkoutOfferApplied]
  );
  const offerSummary = useMemo(
    () => formatOfferSummary(shopOffer, formatCurrency),
    [shopOffer, language]
  );
  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cart]
  );
  const cartQtyByItemId = useMemo(() => {
    const map = {};
    for (const line of cart) {
      if (!line?.itemId) continue;
      const id = String(line.itemId);
      map[id] = (map[id] || 0) + (Number(line.quantity) || 0);
    }
    return map;
  }, [cart]);
  const activeTable = useMemo(
    () => tables.find((entry) => entry.id === activeTableId) || null,
    [tables, activeTableId]
  );

  // Waitlist / seated guest phone → order page automatically.
  useEffect(() => {
    if (!activeTableId || !activeTable) return;
    const phone = String(activeTable.guestPhone || '').trim();
    if (!phone) return;
    setCustomerPhone(sanitizeCustomerPhoneInput(phone));
  }, [activeTableId, activeTable?.guestPhone]);

  // Resume running table order note into the bill panel.
  useEffect(() => {
    if (!activeTable?.currentOrderId) {
      return;
    }
    const order =
      (history || []).find(
        (entry) =>
          entry &&
          (entry.id === activeTable.currentOrderId ||
            entry.orderId === activeTable.currentOrderId)
      ) || null;
    setOrderNote(order?.orderNote || '');
  }, [activeTableId, activeTable?.currentOrderId, history]);

  const handleMenuItemPress = (item) => {
    // Always open config so staff can add an item note (and variants/add-ons).
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleAddToCart = (item, selectedVariant, selectedAddons, quantity = 1, options = {}) => {
    addToCart(item, selectedVariant, selectedAddons, quantity, options);
  };

  const getMenuItemHighlight = (item) => {
    if (item.isWeightBased && item.isVariablePrice) {
      return {
        backgroundColor: 'rgba(255, 213, 79, 0.28)',
        borderColor: 'rgba(30, 136, 229, 0.55)',
      };
    }
    if (item.isWeightBased) {
      return {
        backgroundColor: 'rgba(255, 213, 79, 0.32)',
        borderColor: 'rgba(245, 180, 0, 0.5)',
      };
    }
    if (item.isVariablePrice) {
      return {
        backgroundColor: 'rgba(66, 165, 245, 0.28)',
        borderColor: 'rgba(30, 136, 229, 0.5)',
      };
    }
    return null;
  };

  const formatQuantityLabel = (cartItem) => {
    const qty = Number(cartItem.quantity);
    const qtyText = Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 100) / 100);
    if (cartItem.isWeightBased && cartItem.unit) {
      return `${qtyText} ${cartItem.unit}`;
    }
    return qtyText;
  };

  const adjustCartQuantity = (cartItem, delta) => {
    const current = Number(cartItem.quantity) || 0;
    const nextQty = Math.round((current + delta) * 100) / 100;
    if (nextQty <= 0 || (!cartItem.isWeightBased && nextQty < 1)) {
      removeFromCart(cartItem.id);
      return;
    }
    updateCartItemQuantity(cartItem.id, nextQty);
  };

  const completeCheckout = async (offerApplied = false) => {
    setIsCheckingOut(true);
    const phone = sanitizeCustomerPhoneInput(customerPhone);
    const whatsAppPhone = normalizePhoneNumber(phone);
    try {
      const order = checkout(phone, {
        taxEnabled,
        isPaid: billPaid,
        offerApplied,
        tableId: activeTableId || null,
        orderNote,
      });
      if (!order) {
        showAlert(t('checkoutFailed'), t('checkoutFailedMsg'));
        return;
      }

      const checkoutPhone = phone;
      setCustomerPhone('');
      setOrderNote('');
      setTaxEnabled(false);
      setBillPaid(false);
      setCheckoutOfferApplied(false);
      clearActiveTable();

      const savedUpiQr = normalizeUpiQrUri(upiQrUri);
      if (savedUpiQr) {
        setUpiCheckout({
          uri: savedUpiQr,
          total: order.totalAmount || 0,
          phone: whatsAppPhone || checkoutPhone || '',
          orderId: order.orderId || order.id || '',
        });
      }

      if (checkoutPhone && showWhatsAppInvoiceButtons !== false) {
        setSuccessMessage(t('openingWhatsApp'));
        try {
          await shareWhatsAppInvoiceText({
            items: order.items || [],
            totalAmount: order.totalAmount || 0,
            subtotalAmount: order.subtotalAmount,
            cartSubtotal: order.cartSubtotal,
            discountAmount: order.discountAmount,
            offerApplied: order.offerApplied,
            offerName: order.offerName,
            taxEnabled: order.taxEnabled,
            cgstAmount: order.cgstAmount,
            sgstAmount: order.sgstAmount,
            timestamp: order.timestamp,
            orderId: order.orderId || order.id,
            shopName,
            fssaiNumber,
            gstinNumber,
            shopWebsite,
            menuWebsite,
            includeWebsitesInWhatsApp,
            upiQrUri: savedUpiQr,
            customerPhone: whatsAppPhone || checkoutPhone,
            title: 'Tax Invoice',
            isTableOrder: order.isTableOrder,
            tableNumber: order.tableNumber,
            isPaid: order.isPaid,
            orderNote: order.orderNote || '',
          });
          setSuccessMessage(
            order.isTableOrder
              ? t('tableOrderSavedWhatsApp', { number: order.tableNumber || '' })
              : t('whatsAppOpenedBill')
          );
        } catch (shareError) {
          console.error('WhatsApp share failed:', shareError);
          showAlert(t('orderSaved'), t('orderSavedShareFailed'));
          setSuccessMessage('');
        }
      } else {
        setSuccessMessage(
          order.isTableOrder
            ? t('tableOrderSaved', { number: order.tableNumber || '' })
            : t('orderSavedFromHistory')
        );
      }

      // Intentionally no UI state transition here; success message is cleared by the
      // timeout below. Keep the timer local to this checkout operation.
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Checkout failed:', error);
      showAlert(t('checkoutFailed'), t('checkoutFailedMsg'));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const proceedToCheckoutConfirm = (offerApplied) => {
    setCheckoutOfferApplied(Boolean(offerApplied));

    const bill = calculateBillTotals(cartTotal, { taxEnabled, shopOffer, offerApplied });
    if (Platform.OS === 'web') {
      confirmAction(
        t('confirmCheckout'),
        t('confirmCheckoutMessage', { total: formatCurrency(bill.total) }),
        () => completeCheckout(offerApplied),
        t('checkout')
      );
      return;
    }

    setCheckoutConfirmVisible(true);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      showAlert(t('emptyCartAlert'), t('emptyCartAlertMsg'));
      return;
    }

    Keyboard.dismiss();

    if (customerPhone.trim()) {
      const validationMessage = getCustomerPhoneValidationMessage(customerPhone, language);
      if (validationMessage) {
        showAlert(t('validation'), validationMessage);
        return;
      }
    }

    if (isShopOfferConfigured(shopOffer)) {
      setOfferConfirmVisible(true);
      return;
    }

    proceedToCheckoutConfirm(false);
  };

  const formatCartLine = (cartItem) => {
    const parts = [cartItem.name];
    if (cartItem.selectedVariant) {
      parts.push(cartItem.selectedVariant.name);
    }
    if ((cartItem.selectedAddons?.length ?? 0) > 0) {
      parts.push(
        '+' + cartItem.selectedAddons.map((a) => a.name).join(', +')
      );
    }
    return parts.join(' · ');
  };

  const formatItemMetaLine = (item) => {
    const parts = [];
    if (item.itemNumber) {
      parts.push(`${t('menuId')} ${item.itemNumber}`);
    }
    if (item.variants?.length > 0) {
      parts.push(t('variantsBadge', { count: item.variants.length }));
    }
    if (item.addons?.length > 0) {
      parts.push(t('addonsBadge', { count: item.addons.length }));
    }
    return parts.join(' · ');
  };

  const renderMenuItem = useCallback(({ item }) => {
    const highlight = getMenuItemHighlight(item);
    const cartQty = cartQtyByItemId[String(item.id)] || 0;
    const inCart = cartQty > 0;
    const priceLabel = item.isVariablePrice
      ? t('variablePriceShort')
      : `${formatCurrency(item.basePrice ?? 0)}${item.isWeightBased && item.unit ? `/${item.unit}` : ''}`;

    const badges = (
      <>
        {item.isWeightBased ? (
          <View style={[styles.menuListBadge, { backgroundColor: 'rgba(245, 180, 0, 0.22)' }]}>
            <Text style={[styles.menuListBadgeText, { color: '#b8860b' }]}>w</Text>
          </View>
        ) : null}
        {item.isVariablePrice ? (
          <View style={[styles.menuListBadge, { backgroundColor: 'rgba(30, 136, 229, 0.18)' }]}>
            <Text style={[styles.menuListBadgeText, { color: '#1565c0' }]}>₹</Text>
          </View>
        ) : null}
        {(item.variants?.length ?? 0) > 0 ? (
          <View style={[styles.menuListBadge, { backgroundColor: `${theme.buttonColor}18` }]}>
            <Text style={[styles.menuListBadgeText, { color: theme.buttonColor }]}>v</Text>
          </View>
        ) : null}
        {(item.addons?.length ?? 0) > 0 ? (
          <View style={[styles.menuListBadge, { backgroundColor: `${theme.filterSortColor}18` }]}>
            <Text style={[styles.menuListBadgeText, { color: theme.filterSortColor }]}>a</Text>
          </View>
        ) : null}
      </>
    );

    const qtyBadge = inCart ? (
      <View
        style={[
          menuListView ? styles.cartQtyBadgeInline : styles.cartQtyBadge,
          { backgroundColor: theme.buttonColor },
        ]}
      >
        <Text style={styles.cartQtyBadgeText}>
          {Number.isInteger(cartQty) ? cartQty : Math.round(cartQty * 100) / 100}
        </Text>
      </View>
    ) : null;

    if (menuListView) {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.menuRowItem,
            highlight && styles.menuRowItemHighlight,
            inCart && styles.menuRowItemInCart,
            pressed && styles.menuRowItemPressed,
          ]}
          onPress={() => handleMenuItemPress(item)}
        >
          <View style={styles.menuRowMain}>
            <View style={styles.menuRowTitleLine}>
              <Text style={[styles.menuRowName, { color: theme.textColor }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.badgeGroup}>{badges}</View>
            </View>
            <Text style={styles.menuRowMeta} numberOfLines={1}>
              {formatItemMetaLine(item)}
            </Text>
          </View>
          <View style={styles.menuRowTrailing}>
            {qtyBadge}
            <Text style={[styles.menuRowPrice, { color: theme.buttonColor }]}>{priceLabel}</Text>
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={({ pressed }) => [
          styles.menuCard,
          highlight && styles.menuCardHighlight,
          inCart && styles.menuCardInCart,
          pressed && styles.menuCardPressed,
        ]}
        onPress={() => handleMenuItemPress(item)}
      >
        {inCart ? (
          <View style={[styles.inCartPill, { backgroundColor: theme.buttonColor }]} />
        ) : highlight ? (
          <View style={styles.inCartPill} />
        ) : null}

        {qtyBadge}

        <View style={styles.menuCardHeader}>
          <Text style={[styles.menuCardName, { color: theme.textColor }]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.badgeGroup}>{badges}</View>
        </View>

        <Text style={styles.menuCardMeta} numberOfLines={2}>
          {formatItemMetaLine(item)}
        </Text>

        <View style={styles.menuCardFooter}>
          <Text style={[styles.menuPrice, { color: theme.buttonColor }]}>
            {priceLabel}
          </Text>
        </View>
      </Pressable>
    );
  }, [menuListView, theme.buttonColor, theme.filterSortColor, theme.textColor, t, styles, cartQtyByItemId]);

  const renderCartItem = (item) => (
    <View
      key={item.id}
      style={[
        styles.cartRow,
        item.isWeightBased && styles.cartRowWeight,
        item.isVariablePrice && !item.isWeightBased && styles.cartRowVariable,
      ]}
    >
      <View style={styles.cartInfo}>
        <Text style={[styles.cartName, { color: theme.textColor }]}>{formatCartLine(item)}</Text>
        <Text style={styles.cartUnit}>
          {formatCurrency(item.unitPrice)}
          {item.isWeightBased && item.unit ? `/${item.unit}` : ''} × {formatQuantityLabel(item)}
        </Text>
        <TextInput
          style={styles.itemNoteInput}
          value={item.note || ''}
          onChangeText={(value) => updateCartItemNote(item.id, value)}
          placeholder={t('itemNotePlaceholder')}
          placeholderTextColor={ui.textMuted}
          maxLength={120}
        />
      </View>
      <View style={styles.cartRight}>
        <Text style={[styles.cartTotal, { color: theme.textColor }]}>
          {formatCurrency(item.totalPrice)}
        </Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={[styles.qtyBtn, { borderColor: `${theme.buttonColor}40` }]}
            onPress={() => adjustCartQuantity(item, item.isWeightBased ? -0.25 : -1)}
          >
            <Text style={[styles.qtyBtnText, { color: theme.buttonColor }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.qtyValue, { color: theme.textColor }]}>
            {formatQuantityLabel(item)}
          </Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { borderColor: `${theme.buttonColor}40` }]}
            onPress={() => adjustCartQuantity(item, item.isWeightBased ? 0.25 : 1)}
          >
            <Text style={[styles.qtyBtnText, { color: theme.buttonColor }]}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => removeFromCart(item.id)} hitSlop={6}>
          <Text style={styles.removeLink}>{t('remove')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.container}>
        <View style={[styles.menuSection, { paddingHorizontal: horizontalPad }]}>
          <View style={styles.menuHeaderRow}>
            <View style={styles.menuHeaderLeft}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.textColor, fontSize: scaledSize(isNarrow ? 20 : 22) },
                ]}
              >
                {t('menu')}
              </Text>
              {activeInventory.length > 0 ? (
                <Text style={styles.itemCountText}>
                  {filteredInventory.length}/{activeInventory.length}
                </Text>
              ) : null}
            </View>
            {activeInventory.length > 0 ? (
              <TouchableOpacity
                style={[
                  styles.listViewToggle,
                  menuListView && { backgroundColor: `${theme.buttonColor}14` },
                ]}
                onPress={() => setMenuListView(!menuListView)}
                activeOpacity={0.75}
                hitSlop={6}
              >
                <Ionicons
                  name={menuListView ? 'list' : 'grid-outline'}
                  size={16}
                  color={menuListView ? theme.buttonColor : ui.textMuted}
                />
                <Text
                  style={[
                    styles.listViewToggleLabel,
                    { color: menuListView ? theme.buttonColor : ui.textSecondary },
                  ]}
                >
                  {t('menuListView')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {activeTable ? (
            <View
              style={[
                styles.tableBanner,
                {
                  backgroundColor: TABLE_COLORS.occupied.backgroundColor,
                  borderColor: TABLE_COLORS.occupied.borderColor,
                },
              ]}
            >
              <View style={styles.tableBannerTextWrap}>
                <Text style={styles.tableBannerTitle}>
                  {t('orderingForTable', { number: activeTable.number })}
                </Text>
                {activeTable.guestName || activeTable.guestPhone ? (
                  <Text style={styles.tableBannerSub}>
                    {[activeTable.guestName, activeTable.guestPhone].filter(Boolean).join(' · ')}
                  </Text>
                ) : (
                  <Text style={styles.tableBannerSub}>{t('tableOrderBannerHint')}</Text>
                )}
              </View>
              <TouchableOpacity onPress={clearActiveTable} hitSlop={8}>
                <Text style={styles.tableBannerClear}>{t('clearTable')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {activeInventory.length > 0 && (
            <>
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={18} color={ui.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('searchPlaceholder')}
                  placeholderTextColor={ui.textMuted}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>{t('sortLabel')}</Text>
                {sortOptions.map((option) => {
                  const active = sortBy === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={({ pressed }) => [
                        styles.sortChip,
                        active && {
                          backgroundColor: theme.filterSortColor,
                          borderColor: theme.filterSortColor,
                        },
                        pressed && styles.sortChipPressed,
                      ]}
                      onPress={() => setSortBy(option.key)}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          active && styles.sortChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {inventory.length === 0 ? (
            <AppEmptyState
              icon="restaurant-outline"
              title={t('noItemsYet')}
              subtitle={t('noItemsYetHint')}
              accentColor={theme.buttonColor}
              style={styles.emptyBox}
            />
          ) : activeInventory.length === 0 ? (
            <AppEmptyState
              icon="restaurant-outline"
              title={t('noActiveItems')}
              subtitle={t('noActiveItemsHint')}
              accentColor={theme.buttonColor}
              style={styles.emptyBox}
            />
          ) : filteredInventory.length === 0 ? (
            <AppEmptyState
              icon="search-outline"
              title={t('noMatchingItems')}
              subtitle={t('noMatchingHint')}
              accentColor={theme.buttonColor}
              style={styles.emptyBox}
            />
          ) : (
            <FlatList
              // React Native requires a remount when numColumns changes. Keep this key
              // so switching between grid and list does not leave a stale layout.
              key={`menu-${menuListView ? 'list' : 'grid'}-${menuColumns}`}
              data={filteredInventory}
              keyExtractor={(item) => item.id}
              renderItem={renderMenuItem}
              numColumns={menuListView ? 1 : menuColumns}
              columnWrapperStyle={!menuListView && menuColumns > 1 ? styles.menuRow : undefined}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.menuList}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>

      <View style={[styles.bottomBar, floatingBar(ui)]}>
        <TouchableOpacity
          style={[
            styles.cartIconBtn,
            { backgroundColor: theme.tabBarColor },
            cart.length === 0 && styles.cartIconBtnDisabled,
          ]}
          onPress={() => setBillVisible(true)}
          disabled={cart.length === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="cart" size={20} color="#fff" />
          {cartItemCount > 0 ? (
            <View style={[styles.cartBadge, { backgroundColor: theme.buttonColor }]}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.billSummary}>
          <Text style={styles.billSummaryLabel}>{t('total')}</Text>
          <Text style={[styles.billSummaryValue, { color: theme.textColor }]}>
            {cart.length === 0 ? formatCurrency(0) : formatCurrency(taxBreakdown.total)}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.checkoutBtn,
            { backgroundColor: theme.buttonColor },
            (cart.length === 0 || isCheckingOut) && styles.checkoutDisabled,
            pressed && cart.length > 0 && !isCheckingOut && styles.checkoutPressed,
          ]}
          onPress={handleCheckout}
          disabled={cart.length === 0 || isCheckingOut}
          hitSlop={8}
        >
          <Text style={styles.checkoutText}>{isCheckingOut ? t('processing') : t('checkout')}</Text>
        </Pressable>
      </View>
      </View>

      <Modal visible={billVisible} transparent animationType="slide" onRequestClose={() => setBillVisible(false)}>
        <KeyboardAvoidingView
          style={styles.billKeyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.billOverlay}>
            <Pressable style={styles.billBackdrop} onPress={() => setBillVisible(false)} />
            <View style={styles.billSheet}>
              <View style={styles.billHandle} />
              <View style={styles.billHeaderRow}>
                <Text style={[styles.billSheetTitle, { color: theme.textColor }]}>{t('currentBill')}</Text>
                <TouchableOpacity onPress={() => setBillVisible(false)} hitSlop={8}>
                  <Text style={[styles.billClose, { color: theme.buttonColor }]}>{t('close')}</Text>
                </TouchableOpacity>
              </View>

              {(fssaiNumber || gstinNumber) ? (
                <View style={styles.billShopMeta}>
                  {fssaiNumber ? (
                    <Text style={styles.billMetaLine}>FSSAI No: {fssaiNumber}</Text>
                  ) : null}
                  {gstinNumber ? (
                    <Text style={styles.billMetaLine}>GSTIN: {gstinNumber}</Text>
                  ) : null}
                </View>
              ) : null}

              <ScrollView
                style={styles.billScrollBody}
                contentContainerStyle={styles.billScrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {cart.length === 0 ? (
                  <AppEmptyState
                    icon="cart-outline"
                    title={t('emptyCartTitle')}
                    accentColor={theme.buttonColor}
                    style={styles.emptyCart}
                  />
                ) : (
                  cart.map((item) => renderCartItem(item))
                )}

                {cart.length > 0 ? (
                  <View style={styles.cartExtras}>
                    {isShopOfferConfigured(shopOffer) ? (
                      <Text style={styles.offerHint}>
                        {t('offerAvailableHint', { summary: offerSummary })}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.taxBtn,
                        taxEnabled && { backgroundColor: theme.filterSortColor, borderColor: theme.filterSortColor },
                      ]}
                      onPress={() => setTaxEnabled((prev) => !prev)}
                    >
                      <Text style={[styles.taxBtnText, taxEnabled && styles.taxBtnTextActive]}>
                        {taxEnabled ? t('gstAdded') : t('addGst')}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.customerLabel}>{t('customerWhatsAppOptional')}</Text>
                    <TextInput
                      style={styles.customerInput}
                      value={customerPhone}
                      onChangeText={(value) => setCustomerPhone(sanitizeCustomerPhoneInput(value))}
                      placeholder={t('phoneExamplePlaceholder')}
                      placeholderTextColor={ui.textMuted}
                      keyboardType="phone-pad"
                      maxLength={CUSTOMER_PHONE_MAX_LENGTH}
                    />

                    <Text style={styles.customerLabel}>{t('orderNote')}</Text>
                    <TextInput
                      style={[styles.customerInput, styles.orderNoteInput]}
                      value={orderNote}
                      onChangeText={setOrderNote}
                      placeholder={t('orderNotePlaceholder')}
                      placeholderTextColor={ui.textMuted}
                      multiline
                      maxLength={200}
                    />
                  </View>
                ) : null}
              </ScrollView>

              {successMessage ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              <View style={styles.billFooter}>
                <View style={styles.billTotals}>
                  {taxEnabled ? (
                    <>
                      <Text style={styles.billTaxLine}>
                        {t('subtotalLabel')} {formatCurrency(taxBreakdown.subtotal)}
                      </Text>
                      <Text style={styles.billTaxLine}>
                        {t('cgstLabel')} {formatCurrency(taxBreakdown.cgstAmount)}
                      </Text>
                      <Text style={styles.billTaxLine}>
                        {t('sgstLabel')} {formatCurrency(taxBreakdown.sgstAmount)}
                      </Text>
                    </>
                  ) : null}
                  <Text style={styles.billLabel}>{taxEnabled ? t('grandTotal') : t('total')}</Text>
                  <Text style={[styles.billAmount, { color: theme.textColor }]}>
                    {formatCurrency(taxBreakdown.total)}
                  </Text>
                </View>
                <View style={styles.billActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.paidBtn,
                      billPaid && styles.paidBtnActive,
                      cart.length === 0 && styles.paidBtnDisabled,
                    ]}
                    onPress={() => setBillPaid((prev) => !prev)}
                    disabled={cart.length === 0}
                  >
                    <Text style={[styles.paidBtnText, billPaid && styles.paidBtnTextActive]}>
                      {billPaid ? t('paidCheck') : t('markPaid')}
                    </Text>
                  </TouchableOpacity>
                  <Pressable
                    style={({ pressed }) => [
                      styles.checkoutBtn,
                      { backgroundColor: theme.buttonColor },
                      (cart.length === 0 || isCheckingOut) && styles.checkoutDisabled,
                      pressed && cart.length > 0 && !isCheckingOut && styles.checkoutPressed,
                    ]}
                    onPress={() => {
                      setBillVisible(false);
                      handleCheckout();
                    }}
                    disabled={cart.length === 0 || isCheckingOut}
                  >
                    <Text style={styles.checkoutText}>
                      {isCheckingOut ? t('processing') : t('checkout')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={offerConfirmVisible}
        title={t('applyOfferTitle')}
        message={t('applyOfferMessage', {
          summary: offerSummary,
          discount: formatCurrency(calculateOfferDiscount(cartTotal, shopOffer)),
          total: formatCurrency(offerPreviewBill.total),
        })}
        confirmLabel={t('applyOffer')}
        cancelLabel={t('skipOffer')}
        onCancel={() => {
          setOfferConfirmVisible(false);
          proceedToCheckoutConfirm(false);
        }}
        onConfirm={() => {
          setOfferConfirmVisible(false);
          proceedToCheckoutConfirm(true);
        }}
      />

      <ConfirmModal
        visible={checkoutConfirmVisible}
        title={t('confirmCheckout')}
        message={t('confirmCheckoutMessage', { total: formatCurrency(checkoutBill.total) })}
        confirmLabel={t('checkout')}
        onCancel={() => {
          setCheckoutConfirmVisible(false);
          setCheckoutOfferApplied(false);
        }}
        onConfirm={() => {
          setCheckoutConfirmVisible(false);
          completeCheckout(checkoutOfferApplied);
        }}
      />

      <ItemConfigModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
        onAddToCart={handleAddToCart}
      />

      <Modal
        visible={Boolean(upiCheckout?.uri)}
        transparent
        animationType="fade"
        onRequestClose={() => setUpiCheckout(null)}
      >
        <View style={styles.upiOverlay}>
          <View style={[styles.upiCard, { backgroundColor: ui.surface }]}>
            <Text style={[styles.upiTitle, { color: ui.textPrimary }]}>
              {t('upiQrCheckoutTitle')}
            </Text>
            <Text style={[styles.upiHint, { color: ui.textSecondary }]}>
              {t('upiQrCheckoutHint', {
                total: formatCurrency(upiCheckout?.total || 0),
              })}
            </Text>
            {upiCheckout?.uri ? (
              <Image
                source={{ uri: upiCheckout.uri }}
                style={styles.upiImage}
                resizeMode="contain"
              />
            ) : null}
            {upiCheckout?.phone ? (
              <TouchableOpacity
                style={[styles.upiShareBtn, { backgroundColor: theme.buttonColor }]}
                disabled={sharingUpiQr}
                onPress={async () => {
                  setSharingUpiQr(true);
                  try {
                    await shareUpiQrOnWhatsApp({
                      upiQrUri: upiCheckout.uri,
                      caption: `${shopName || 'Bill'} — Pay via UPI. Total: ${formatCurrency(
                        upiCheckout.total || 0
                      )}${upiCheckout.orderId ? `\nOrder: ${upiCheckout.orderId}` : ''}`,
                      customerPhone: upiCheckout.phone,
                      dialogTitle: t('upiQrShareWhatsApp'),
                    });
                  } catch (error) {
                    console.error('Share UPI QR failed:', error);
                    showAlert(t('validation'), t('upiQrPickFailed'));
                  } finally {
                    setSharingUpiQr(false);
                  }
                }}
              >
                <Text style={styles.upiShareBtnText}>{t('upiQrShareWhatsApp')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.upiDoneBtn} onPress={() => setUpiCheckout(null)}>
              <Text style={[styles.upiDoneBtnText, { color: theme.buttonColor }]}>
                {t('upiQrDone')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(ui) {
  return {
  safe: { flex: 1, backgroundColor: ui.bg },
  container: { flex: 1, minHeight: 0, backgroundColor: ui.bg },
  menuSection: {
    flex: 1,
    minHeight: 0,
    paddingTop: 16,
  },
  menuHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  tableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: ui.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  tableBannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  tableBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
  },
  tableBannerSub: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '500',
  },
  tableBannerClear: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9d174d',
  },
  menuHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  listViewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ui.radiusFull,
    backgroundColor: ui.surfaceMuted,
  },
  listViewToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textMuted,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cartIconBtn: {
    width: 44,
    height: 44,
    borderRadius: ui.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIconBtnDisabled: {
    opacity: 0.5,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: ui.radiusSm,
    // backgroundColor via theme.buttonColor at call site
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  billSummary: {
    flex: 1,
    paddingHorizontal: 4,
  },
  billSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ui.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  billSummaryValue: {
    marginTop: 1,
    fontSize: 18,
    fontWeight: '700',
    color: ui.textPrimary,
    letterSpacing: -0.3,
  },
  billKeyboardRoot: {
    flex: 1,
  },
  billOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  billBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  billSheet: {
    backgroundColor: ui.surface,
    borderTopLeftRadius: ui.radiusXl,
    borderTopRightRadius: ui.radiusXl,
    height: '88%',
    maxHeight: '88%',
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    zIndex: 1,
    elevation: 8,
  },
  billScrollBody: {
    flex: 1,
    minHeight: 0,
  },
  billScrollContent: {
    paddingBottom: 8,
  },
  billHandle: {
    width: 36,
    height: 4,
    backgroundColor: ui.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  billHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16213e',
  },
  billClose: {
    fontSize: 13,
    fontWeight: '700',
    // color via theme.buttonColor at call site
  },
  billShopMeta: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 2,
  },
  billMetaLine: {
    fontSize: 12,
    color: ui.textSecondary,
    fontWeight: '600',
  },
  billBody: { flex: 1, minHeight: 140 },
  cartExtras: {
    flexShrink: 0,
  },
  taxBtn: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: ui.radiusSm,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.surfaceMuted,
  },
  taxBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: ui.textSecondary,
    textAlign: 'center',
  },
  taxBtnTextActive: {
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: ui.textPrimary,
    letterSpacing: -0.4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.borderLight,
    borderRadius: ui.radiusMd,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: ui.textPrimary,
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textMuted,
    marginRight: 2,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ui.radiusFull,
    backgroundColor: ui.surface,
    borderWidth: 1,
    borderColor: ui.border,
  },
  sortChipPressed: {
    opacity: 0.85,
  },
  sortChipActive: {
    // colors via theme.filterSortColor at call sites
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  sortChipTextActive: {
    color: '#fff',
  },
  menuList: { paddingBottom: 8 },
  menuRow: { gap: 8 },
  menuCard: {
    flex: 1,
    position: 'relative',
    backgroundColor: ui.surface,
    borderRadius: ui.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: ui.borderLight,
    minWidth: '45%',
    maxWidth: '100%',
  },
  menuCardHighlight: {
    borderColor: `${ui.info}55`,
    backgroundColor: ui.mode === 'dark' ? 'rgba(125, 211, 252, 0.08)' : 'rgba(37, 99, 235, 0.04)',
  },
  menuCardPressed: {
    opacity: 0.92,
    backgroundColor: ui.surfaceMuted,
  },
  menuCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  menuCardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  menuCardMeta: {
    fontSize: 11,
    color: ui.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
  menuCardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inCartPill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: ui.radiusMd,
    borderTopRightRadius: ui.radiusMd,
    backgroundColor: ui.info,
  },
  cartQtyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cartQtyBadgeInline: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  menuRowTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
  },
  menuRowItemInCart: {
    borderColor: ui.info,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  menuCardInCart: {
    borderColor: ui.info,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ui.surface,
    borderRadius: ui.radiusMd,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: ui.borderLight,
  },
  menuRowItemHighlight: {
    borderColor: `${ui.info}55`,
    backgroundColor: ui.mode === 'dark' ? 'rgba(125, 211, 252, 0.08)' : 'rgba(37, 99, 235, 0.04)',
  },
  menuRowItemPressed: {
    opacity: 0.92,
    backgroundColor: ui.surfaceMuted,
  },
  menuRowMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  menuRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuRowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  menuRowMeta: {
    fontSize: 11,
    color: ui.textMuted,
  },
  menuRowPrice: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 0,
  },
  menuCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  menuCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  menuId: {
    fontSize: 10,
    fontWeight: '700',
    color: ui.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  menuName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  menuMeta: {
    fontSize: 11,
    color: ui.textMuted,
    marginTop: 6,
  },
  menuListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ui.surface,
    borderRadius: ui.radiusMd,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: ui.borderLight,
  },
  menuListRowPressed: {
    opacity: 0.92,
    backgroundColor: ui.surfaceMuted,
  },
  menuListId: {
    fontSize: 11,
    fontWeight: '700',
    color: ui.textMuted,
    minWidth: 40,
  },
  menuListName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  menuListPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuListBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuListBadge: {
    width: 20,
    height: 20,
    borderRadius: ui.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuListBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  offerHint: {
    fontSize: 12,
    color: ui.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 18,
  },
  emptyBox: {
    flex: 1,
    marginTop: 24,
  },
  cartList: { flex: 1 },
  cartListContent: { paddingBottom: 4 },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: ui.surfaceMuted,
  },
  cartRowWeight: {
    backgroundColor: 'rgba(255, 213, 79, 0.14)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: ui.radiusSm,
  },
  cartRowVariable: {
    backgroundColor: 'rgba(66, 165, 245, 0.12)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: ui.radiusSm,
  },
  cartInfo: { flex: 1, paddingRight: 8 },
  cartName: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textPrimary,
  },
  cartUnit: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 2,
  },
  itemNoteInput: {
    marginTop: 6,
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.borderLight,
    borderRadius: ui.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: ui.textPrimary,
  },
  cartRight: { alignItems: 'flex-end' },
  cartTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: ui.textPrimary,
  },
  removeLink: {
    fontSize: 12,
    color: '#e03131',
    marginTop: 4,
    fontWeight: '600',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: ui.radiusSm,
    backgroundColor: ui.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.borderLight,
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: ui.textPrimary,
    lineHeight: 20,
  },
  qtyValue: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  emptyCart: {
    paddingVertical: 16,
  },
  customerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ui.textSecondary,
    marginTop: 8,
    marginBottom: 6,
  },
  customerInput: {
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.borderLight,
    borderRadius: ui.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: ui.textPrimary,
    marginBottom: 4,
  },
  orderNoteInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  paidBtn: {
    flex: 1,
    backgroundColor: ui.surfaceMuted,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: ui.radiusMd,
    borderWidth: 1,
    borderColor: ui.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidBtnDisabled: {
    opacity: 0.45,
  },
  paidBtnActive: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    borderColor: 'rgba(40, 167, 69, 0.5)',
  },
  paidBtnText: {
    color: ui.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  paidBtnTextActive: {
    color: '#2b8a3e',
  },
  billFooter: {
    flexShrink: 0,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: ui.border,
    backgroundColor: ui.surface,
    marginTop: 8,
  },
  billTotals: {
    marginBottom: 10,
  },
  billActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  billTaxLine: {
    fontSize: 12,
    color: ui.textMuted,
    marginBottom: 2,
  },
  billLabel: {
    fontSize: 13,
    color: ui.textMuted,
  },
  billAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  phonePromptCard: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    backgroundColor: ui.surface,
    borderRadius: ui.radiusLg,
    padding: 18,
    margin: 24,
  },
  phonePromptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  phonePromptSub: {
    marginTop: 6,
    fontSize: 13,
    color: ui.textSecondary,
    lineHeight: 18,
  },
  phonePromptInput: {
    marginTop: 14,
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.borderLight,
    borderRadius: ui.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: ui.textPrimary,
  },
  phonePromptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  phonePromptSkip: {
    flex: 1,
    backgroundColor: ui.surfaceMuted,
    borderRadius: ui.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  phonePromptSkipText: {
    color: ui.textSecondary,
    fontWeight: '800',
  },
  phonePromptOk: {
    flex: 1,
    backgroundColor: ui.textPrimary,
    borderRadius: ui.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  phonePromptOkText: {
    color: '#fff',
    fontWeight: '900',
  },
  checkoutBtn: {
    flex: 1.15,
    minWidth: 112,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: ui.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutPressed: {
    opacity: 0.9,
  },
  checkoutDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.75,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  successBanner: {
    backgroundColor: ui.successBg,
    borderRadius: ui.radiusSm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(43, 138, 62, 0.25)',
  },
  successText: {
    color: ui.success,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  upiOverlay: {
    flex: 1,
    backgroundColor: ui.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  upiCard: {
    borderRadius: ui.radiusLg,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  upiTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  upiHint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  upiImage: {
    width: 240,
    height: 240,
    marginVertical: 8,
  },
  upiShareBtn: {
    marginTop: 8,
    borderRadius: ui.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 18,
    width: '100%',
    alignItems: 'center',
  },
  upiShareBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  upiDoneBtn: {
    marginTop: 4,
    paddingVertical: 12,
  },
  upiDoneBtnText: {
    fontWeight: '800',
    fontSize: 15,
  },
};
}