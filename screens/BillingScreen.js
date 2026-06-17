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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStore from '../store/store';
import ItemConfigModal from '../components/ItemConfigModal';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrency } from '../utils/currency';
import { confirmAction, showAlert } from '../utils/alert';
import { filterAndSortInventory, SORT_OPTIONS } from '../utils/inventoryFilters';
import {
  formatBillText,
  getCustomerPhoneValidationMessage,
  sanitizeCustomerPhoneInput,
  sendViaWhatsApp,
} from '../utils/billShare';

export default function BillingScreen() {
  const inventory = useStore((s) => s.inventory);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const updateCartItemQuantity = useStore((s) => s.updateCartItemQuantity);
  const checkout = useStore((s) => s.checkout);
  const getCartTotal = useStore((s) => s.getCartTotal);
  const shopName = useStore((s) => s.shopName);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkoutConfirmVisible, setCheckoutConfirmVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [billVisible, setBillVisible] = useState(false);

  // Safety: ensure no global modal blocks other tabs (web/desktop).
  useEffect(() => {
    if (!billVisible) return undefined;
    return () => setBillVisible(false);
  }, [billVisible]);

  const filteredInventory = useMemo(
    () => filterAndSortInventory(inventory, { search: searchQuery, sortBy }),
    [inventory, searchQuery, sortBy]
  );

  const cartTotal = getCartTotal();
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

  const completeCheckout = async () => {
    setIsCheckingOut(true);
    const phone = sanitizeCustomerPhoneInput(customerPhone);
    try {
      const order = checkout(phone);
      if (!order) return;

      setCustomerPhone('');
      setSuccessMessage(phone ? 'Order saved. Opening WhatsApp invoice...' : 'Order saved to history.');
      setTimeout(() => setSuccessMessage(''), 4000);

      if (phone) {
        const billText = formatBillText({
          items: order.items || [],
          totalAmount: order.totalAmount || 0,
          timestamp: order.timestamp,
          orderId: order.orderId || order.id,
          shopName,
        });

        await sendViaWhatsApp(billText, phone);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      showAlert('Checkout failed', 'Could not save the order. Try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      showAlert('Empty Cart', 'Add items before checking out.');
      return;
    }

    Keyboard.dismiss();

    if (customerPhone.trim()) {
      const validationMessage = getCustomerPhoneValidationMessage(customerPhone);
      if (validationMessage) {
        showAlert('Validation', validationMessage);
        return;
      }
    }

    if (Platform.OS === 'web') {
      confirmAction(
        'Confirm Checkout',
        `Total: ${formatCurrency(cartTotal)}. Complete this order?`,
        completeCheckout,
        'Checkout'
      );
      return;
    }

    setCheckoutConfirmVisible(true);
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

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity style={styles.menuCard} onPress={() => handleMenuItemPress(item)}>
      <Text style={styles.menuId}>ID: {item.itemNumber}</Text>
      <Text style={styles.menuName}>{item.name}</Text>
      <Text style={styles.menuPrice}>{formatCurrency(item.basePrice)}</Text>
      {(item.variants.length > 0 || item.addons.length > 0) && (
        <Text style={styles.menuBadge}>
          {item.variants.length > 0 && `${item.variants.length} variants`}
          {item.variants.length > 0 && item.addons.length > 0 && ' · '}
          {item.addons.length > 0 && `${item.addons.length} add-ons`}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartRow}>
      <View style={styles.cartInfo}>
        <Text style={styles.cartName}>{formatCartLine(item)}</Text>
        <Text style={styles.cartUnit}>
          {formatCurrency(item.unitPrice)} × {item.quantity}
        </Text>
      </View>
      <View style={styles.cartRight}>
        <Text style={styles.cartTotal}>{formatCurrency(item.totalPrice)}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => {
              const nextQty = (Number(item.quantity) || 1) - 1;
              if (nextQty <= 0) removeFromCart(item.id);
              else updateCartItemQuantity(item.id, nextQty);
            }}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateCartItemQuantity(item.id, (Number(item.quantity) || 0) + 1)}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => removeFromCart(item.id)} hitSlop={6}>
          <Text style={styles.removeLink}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Menu</Text>

          {inventory.length > 0 && (
            <>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by ID or name..."
                placeholderTextColor="#adb5bd"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Sort:</Text>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortChip,
                      sortBy === option.key && styles.sortChipActive,
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
              <Text style={styles.emptyText}>No items yet.</Text>
              <Text style={styles.emptySubtext}>Add items in the Inventory tab.</Text>
            </View>
          ) : filteredInventory.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No matching items.</Text>
              <Text style={styles.emptySubtext}>Try a different ID or name.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredInventory}
              keyExtractor={(item) => item.id}
              renderItem={renderMenuItem}
              numColumns={2}
              columnWrapperStyle={styles.menuRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.menuList}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.cartIconBtn, cart.length === 0 && styles.cartIconBtnDisabled]}
          onPress={() => setBillVisible(true)}
          disabled={cart.length === 0}
        >
          <Text style={styles.cartIcon}>🛒</Text>
          {cartItemCount > 0 ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.billSummary}>
          <Text style={styles.billSummaryLabel}>Total</Text>
          <Text style={styles.billSummaryValue}>
            {cart.length === 0 ? formatCurrency(0) : formatCurrency(cartTotal)}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.checkoutBtn,
            (cart.length === 0 || isCheckingOut) && styles.checkoutDisabled,
            pressed && cart.length > 0 && !isCheckingOut && styles.checkoutPressed,
          ]}
          onPress={handleCheckout}
          disabled={cart.length === 0 || isCheckingOut}
          hitSlop={8}
        >
          <Text style={styles.checkoutText}>{isCheckingOut ? 'Processing...' : 'Checkout'}</Text>
        </Pressable>
      </View>

      <Modal visible={billVisible} transparent animationType="slide" onRequestClose={() => setBillVisible(false)}>
        <Pressable style={styles.billOverlay} onPress={() => setBillVisible(false)}>
          <Pressable style={styles.billSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.billHandle} />
            <View style={styles.billHeaderRow}>
              <Text style={styles.billSheetTitle}>Current Bill</Text>
              <TouchableOpacity onPress={() => setBillVisible(false)} hitSlop={8}>
                <Text style={styles.billClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.billBody}>
              {cart.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyCartText}>Cart is empty</Text>
                </View>
              ) : (
                <FlatList
                  data={cart}
                  keyExtractor={(item) => item.id}
                  renderItem={renderCartItem}
                  showsVerticalScrollIndicator={false}
                  style={styles.cartList}
                  contentContainerStyle={styles.cartListContent}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>

            {cart.length > 0 && (
              <View style={styles.cartExtras}>
                <Text style={styles.customerLabel}>Customer WhatsApp No. (optional)</Text>
                <TextInput
                  style={styles.customerInput}
                  value={customerPhone}
                  onChangeText={(value) => setCustomerPhone(sanitizeCustomerPhoneInput(value))}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#adb5bd"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            )}

            {successMessage ? (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <View style={styles.billFooter}>
              <View>
                <Text style={styles.billLabel}>Total</Text>
                <Text style={styles.billAmount}>{formatCurrency(cartTotal)}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.checkoutBtn,
                  (cart.length === 0 || isCheckingOut) && styles.checkoutDisabled,
                  pressed && cart.length > 0 && !isCheckingOut && styles.checkoutPressed,
                ]}
                onPress={() => {
                  setBillVisible(false);
                  handleCheckout();
                }}
                disabled={cart.length === 0 || isCheckingOut}
              >
                <Text style={styles.checkoutText}>{isCheckingOut ? 'Processing...' : 'Checkout'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={checkoutConfirmVisible}
        title="Confirm Checkout"
        message={`Total: ${formatCurrency(cartTotal)}. Complete this order?`}
        confirmLabel="Checkout"
        onCancel={() => setCheckoutConfirmVisible(false)}
        onConfirm={() => {
          setCheckoutConfirmVisible(false);
          completeCheckout();
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
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1, minHeight: 0 },
  menuSection: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 88,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  cartIconBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#16213e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIconBtnDisabled: {
    opacity: 0.55,
  },
  cartIcon: {
    fontSize: 24,
    color: '#fff',
    lineHeight: 28,
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
    color: '#868e96',
  },
  billSummaryValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  billOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  billSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '88%',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 10,
  },
  billHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#dee2e6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
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
  billBody: { flex: 1, minHeight: 140 },
  cartExtras: {
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16213e',
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a2e',
    marginBottom: 10,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: '45%',
  },
  menuId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#868e96',
    marginBottom: 4,
  },
  menuName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  menuPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e94560',
    marginTop: 4,
  },
  menuBadge: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 4,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#868e96',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#adb5bd',
    marginTop: 4,
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
  },
  emptyCartText: {
    fontSize: 15,
    color: '#adb5bd',
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
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
    marginTop: 8,
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
    backgroundColor: '#e94560',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  checkoutPressed: {
    opacity: 0.85,
  },
  checkoutDisabled: {
    backgroundColor: '#f4a5b4',
    opacity: 0.7,
  },
  successBanner: {
    backgroundColor: '#d3f9d8',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  successText: {
    color: '#2b8a3e',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
