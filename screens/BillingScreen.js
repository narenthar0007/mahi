import React, { useMemo, useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
import { shareWhatsAppInvoiceText } from '../utils/invoiceExport';
import { useAppTheme } from '../utils/theme';
import {
  calculateBillTotals,
  calculateOfferDiscount,
  formatOfferSummary,
  isShopOfferConfigured,
} from '../utils/offers';
import { useTranslation } from '../utils/i18n';
import { UI, floatingBar, shadow } from '../utils/uiTheme';
import { useResponsiveLayout } from '../utils/responsive';

const BOTTOM_BAR_HEIGHT = 72;

export default function BillingScreen() {
  const { t, sortOptions, language } = useTranslation();
  const inventory = useStore((s) => s.inventory);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const updateCartItemQuantity = useStore((s) => s.updateCartItemQuantity);
  const checkout = useStore((s) => s.checkout);
  const getCartTotal = useStore((s) => s.getCartTotal);
  const shopName = useStore((s) => s.shopName);
  const fssaiNumber = useStore((s) => s.fssaiNumber);
  const gstinNumber = useStore((s) => s.gstinNumber);
  const showWhatsAppInvoiceButtons = useStore((s) => s.showWhatsAppInvoiceButtons);
  const shopOffer = useStore((s) => s.shopOffer);
  const menuListView = useStore((s) => s.menuListView);
  const setMenuListView = useStore((s) => s.setMenuListView);
  const theme = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { menuColumns, isNarrow, scaledSize, horizontalPad } = useResponsiveLayout();
  const listBottomPad = tabBarHeight + BOTTOM_BAR_HEIGHT + 16;
  const bottomBarStyle = { bottom: tabBarHeight + 8 };

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
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

  // Safety: ensure no global modal blocks other tabs (web/desktop).
  useEffect(() => {
    if (!billVisible) return undefined;
    return () => setBillVisible(false);
  }, [billVisible]);

  const activeInventory = useMemo(
    () => inventory.filter((item) => item.enabled !== false),
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

  const handleMenuItemPress = (item) => {
    const needsModal = item.variants.length > 0 || item.addons.length > 0;
    if (needsModal) {
      setSelectedItem(item);
      setModalVisible(true);
    } else {
      addToCart(item, null, []);
    }
  };

  const handleAddToCart = (item, selectedVariant, selectedAddons) => {
    addToCart(item, selectedVariant, selectedAddons);
  };

  const completeCheckout = async (offerApplied = false) => {
    setIsCheckingOut(true);
    const phone = sanitizeCustomerPhoneInput(customerPhone);
    const whatsAppPhone = normalizePhoneNumber(phone);
    try {
      const order = checkout(phone, { taxEnabled, isPaid: billPaid, offerApplied });
      if (!order) return;

      setCustomerPhone('');
      setTaxEnabled(false);
      setBillPaid(false);
      setCheckoutOfferApplied(false);

      if (phone && showWhatsAppInvoiceButtons !== false) {
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
            customerPhone: whatsAppPhone || phone,
            title: 'Tax Invoice',
          });
          setSuccessMessage(t('whatsAppOpenedBill'));
        } catch (shareError) {
          console.error('WhatsApp share failed:', shareError);
          showAlert(t('orderSaved'), t('orderSavedShareFailed'));
          setSuccessMessage('');
        }
      } else {
        setSuccessMessage(t('orderSavedFromHistory'));
      }

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

  const renderMenuItem = ({ item }) => {
    if (menuListView) {
      return (
        <Pressable
          style={({ pressed }) => [styles.menuListRow, pressed && styles.menuListRowPressed]}
          onPress={() => handleMenuItemPress(item)}
        >
          <Text style={styles.menuListId}>
            {t('menuId')} {item.itemNumber}
          </Text>
          <Text style={[styles.menuListName, { color: theme.textColor }]} numberOfLines={1}>
            {item.name}
          </Text>
          {(item.variants.length > 0 || item.addons.length > 0) && (
            <View style={styles.menuListBadges}>
              {item.variants.length > 0 ? (
                <View style={[styles.menuListBadge, { backgroundColor: `${theme.buttonColor}18` }]}>
                  <Text style={[styles.menuListBadgeText, { color: theme.buttonColor }]}>v</Text>
                </View>
              ) : null}
              {item.addons.length > 0 ? (
                <View style={[styles.menuListBadge, { backgroundColor: `${theme.filterSortColor}18` }]}>
                  <Text style={[styles.menuListBadgeText, { color: theme.filterSortColor }]}>a</Text>
                </View>
              ) : null}
            </View>
          )}
          <Text style={[styles.menuListPrice, { color: theme.buttonColor }]}>
            {formatCurrency(item.basePrice)}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
        onPress={() => handleMenuItemPress(item)}
      >
        <Text style={styles.menuId}>
          {t('menuId')} {item.itemNumber}
        </Text>
        <Text style={[styles.menuName, { color: theme.textColor }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.menuPrice, { color: theme.buttonColor }]}>
          {formatCurrency(item.basePrice)}
        </Text>
        {(item.variants.length > 0 || item.addons.length > 0) && (
          <Text style={styles.menuMeta} numberOfLines={1}>
            {item.variants.length > 0 ? t('variantsBadge', { count: item.variants.length }) : ''}
            {item.variants.length > 0 && item.addons.length > 0 ? ' · ' : ''}
            {item.addons.length > 0 ? t('addonsBadge', { count: item.addons.length }) : ''}
          </Text>
        )}
      </Pressable>
    );
  };

  const renderCartItem = (item) => (
    <View key={item.id} style={styles.cartRow}>
      <View style={styles.cartInfo}>
        <Text style={[styles.cartName, { color: theme.textColor }]}>{formatCartLine(item)}</Text>
        <Text style={styles.cartUnit}>
          {formatCurrency(item.unitPrice)} × {item.quantity}
        </Text>
      </View>
      <View style={styles.cartRight}>
        <Text style={[styles.cartTotal, { color: theme.textColor }]}>
          {formatCurrency(item.totalPrice)}
        </Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={[styles.qtyBtn, { borderColor: `${theme.buttonColor}40` }]}
            onPress={() => {
              const nextQty = (Number(item.quantity) || 1) - 1;
              if (nextQty <= 0) removeFromCart(item.id);
              else updateCartItemQuantity(item.id, nextQty);
            }}
          >
            <Text style={[styles.qtyBtnText, { color: theme.buttonColor }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.qtyValue, { color: theme.textColor }]}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { borderColor: `${theme.buttonColor}40` }]}
            onPress={() => updateCartItemQuantity(item.id, (Number(item.quantity) || 0) + 1)}
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.menuSection, { paddingHorizontal: horizontalPad, paddingBottom: listBottomPad }]}>
          <View style={styles.menuHeaderRow}>
            <View style={styles.menuHeaderLeft}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.textColor, fontSize: scaledSize(isNarrow ? 20 : 24) },
                ]}
              >
                {t('menu')}
              </Text>
              {activeInventory.length > 0 ? (
                <Text style={styles.itemCountText}>
                  {filteredInventory.length} / {activeInventory.length}
                </Text>
              ) : null}
            </View>
            {activeInventory.length > 0 ? (
              <TouchableOpacity
                style={styles.listViewToggle}
                onPress={() => setMenuListView(!menuListView)}
                activeOpacity={0.75}
                hitSlop={6}
              >
                <Ionicons
                  name={menuListView ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={menuListView ? theme.buttonColor : UI.textMuted}
                />
                <Text style={[styles.listViewToggleLabel, { color: theme.textColor }]}>
                  {t('menuListView')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {activeInventory.length > 0 && (
            <>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={UI.textMuted}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>{t('sortLabel')}</Text>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortChip,
                      sortBy === option.key && {
                        backgroundColor: theme.filterSortColor,
                        borderColor: theme.filterSortColor,
                      },
                    ]}
                    onPress={() => setSortBy(option.key)}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        sortBy === option.key && styles.sortChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {inventory.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('noItemsYet')}</Text>
              <Text style={styles.emptySubtext}>{t('noItemsYetHint')}</Text>
            </View>
          ) : activeInventory.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('noActiveItems')}</Text>
              <Text style={styles.emptySubtext}>{t('noActiveItemsHint')}</Text>
            </View>
          ) : filteredInventory.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('noMatchingItems')}</Text>
              <Text style={styles.emptySubtext}>{t('noMatchingHint')}</Text>
            </View>
          ) : (
            <FlatList
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
      </View>

      <View style={[styles.bottomBar, floatingBar(), bottomBarStyle]}>
        <TouchableOpacity
          style={[
            styles.cartIconBtn,
            { backgroundColor: theme.tabBarColor },
            cart.length === 0 && styles.cartIconBtnDisabled,
          ]}
          onPress={() => setBillVisible(true)}
          disabled={cart.length === 0}
        >
          <Ionicons name="cart" size={22} color="#fff" />
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

      <Modal visible={billVisible} transparent animationType="slide" onRequestClose={() => setBillVisible(false)}>
        <KeyboardAvoidingView
          style={styles.billKeyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                  <View style={styles.emptyCart}>
                    <Text style={styles.emptyCartText}>{t('emptyCartTitle')}</Text>
                  </View>
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
                      placeholderTextColor="#adb5bd"
                      keyboardType="phone-pad"
                      maxLength={CUSTOMER_PHONE_MAX_LENGTH}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  container: { flex: 1, minHeight: 0 },
  menuSection: {
    flex: 1,
    minHeight: 0,
    paddingTop: 16,
  },
  menuHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
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
    gap: 6,
    flexShrink: 0,
  },
  listViewToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '500',
    color: UI.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cartIconBtn: {
    width: 48,
    height: 48,
    borderRadius: UI.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIconBtnDisabled: {
    opacity: 0.55,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  billSummary: {
    flex: 1,
    paddingHorizontal: 6,
  },
  billSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.textMuted,
  },
  billSummaryValue: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: UI.textPrimary,
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
    backgroundColor: UI.surface,
    borderTopLeftRadius: UI.radiusXl,
    borderTopRightRadius: UI.radiusXl,
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
    backgroundColor: UI.border,
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
    color: '#e94560',
  },
  billShopMeta: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 2,
  },
  billMetaLine: {
    fontSize: 12,
    color: '#495057',
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  taxBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#495057',
    textAlign: 'center',
  },
  taxBtnTextActive: {
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: UI.textPrimary,
    letterSpacing: -0.4,
  },
  searchInput: {
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: UI.radiusMd,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: UI.textPrimary,
    marginBottom: 14,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#868e96',
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: UI.radiusFull,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },
  sortChipActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  sortChipTextActive: {
    color: '#fff',
  },
  menuList: { paddingBottom: 8 },
  menuRow: { gap: 10 },
  menuCard: {
    flex: 1,
    backgroundColor: UI.surface,
    borderRadius: UI.radiusLg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.borderLight,
    minWidth: '45%',
    maxWidth: '100%',
  },
  menuCardPressed: {
    opacity: 0.88,
    backgroundColor: UI.surfaceMuted,
  },
  menuId: {
    fontSize: 11,
    fontWeight: '600',
    color: UI.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  menuName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  menuPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: -0.2,
  },
  menuMeta: {
    fontSize: 11,
    color: UI.textMuted,
    marginTop: 6,
  },
  menuListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: UI.surface,
    borderRadius: UI.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: UI.borderLight,
  },
  menuListRowPressed: {
    opacity: 0.88,
    backgroundColor: UI.surfaceMuted,
  },
  menuListId: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textMuted,
    minWidth: 44,
  },
  menuListName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  menuListPrice: {
    fontSize: 15,
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
    borderRadius: 10,
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
    color: UI.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 18,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 24,
  },
  emptyText: {
    fontSize: 16,
    color: UI.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: UI.textMuted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  cartList: { flex: 1 },
  cartListContent: { paddingBottom: 4 },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  cartInfo: { flex: 1, paddingRight: 8 },
  cartName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  cartUnit: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 2,
  },
  cartRight: { alignItems: 'flex-end' },
  cartTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
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
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    lineHeight: 20,
  },
  qtyValue: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyCartText: {
    fontSize: 15,
    color: UI.textMuted,
    fontWeight: '600',
  },
  customerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginTop: 8,
    marginBottom: 6,
  },
  customerInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  paidBtn: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
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
    color: '#495057',
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
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
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
    color: '#868e96',
    marginBottom: 2,
  },
  billLabel: {
    fontSize: 13,
    color: '#868e96',
  },
  billAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  phonePromptCard: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    margin: 24,
  },
  phonePromptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  phonePromptSub: {
    marginTop: 6,
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 18,
  },
  phonePromptInput: {
    marginTop: 14,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a2e',
  },
  phonePromptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  phonePromptSkip: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  phonePromptSkipText: {
    color: '#495057',
    fontWeight: '800',
  },
  phonePromptOk: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  phonePromptOkText: {
    color: '#fff',
    fontWeight: '900',
  },
  checkoutBtn: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: UI.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutPressed: {
    opacity: 0.85,
  },
  checkoutDisabled: {
    backgroundColor: '#f4a5b4',
    opacity: 0.7,
  },
  successBanner: {
    backgroundColor: UI.successBg,
    borderRadius: UI.radiusSm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(43, 138, 62, 0.25)',
  },
  successText: {
    color: UI.success,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
