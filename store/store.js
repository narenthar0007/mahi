import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { validateLicenseKey } from '../utils/licenseKey';
import { calculateTaxBreakdown, DEFAULT_THEME, resolveTheme } from '../utils/theme';
import { normalizeShopLogoStyle, normalizeShopLogoUri } from '../utils/shopLogo';
import { calculateBillTotals, DEFAULT_SHOP_OFFER, normalizeShopOffer } from '../utils/offers';
import { normalizeOwnerToken } from '../utils/ownerToken';

const createId = () => String(uuid.v4());
const createOrderId = (sequenceNumber) => `ORD-${String(sequenceNumber).padStart(6, '0')}`;

export const calculateItemPrice = (item, selectedVariant, selectedAddons = []) => {
  const base = selectedVariant ? selectedVariant.price : item.basePrice;
  const addonTotal = (selectedAddons || []).reduce((sum, addon) => sum + addon.price, 0);
  return base + addonTotal;
};

const cartLineKey = (itemId, selectedVariant, selectedAddons = []) => {
  const variantPart = selectedVariant
    ? `v:${String(selectedVariant?.name ?? '')}|${Number(selectedVariant?.price ?? 0)}`
    : 'v:';
  const addonsPart = (selectedAddons || [])
    .map((a) => `a:${String(a?.name ?? '')}|${Number(a?.price ?? 0)}`)
    .sort()
    .join(',');
  return `${String(itemId)}::${variantPart}::${addonsPart}`;
};

const normalizeLineItem = (line) => ({
  ...line,
  selectedVariant: line?.selectedVariant || null,
  selectedAddons: line?.selectedAddons || [],
  quantity: line?.quantity || 1,
  unitPrice: Number(line?.unitPrice) || 0,
  totalPrice: Number(line?.totalPrice) || 0,
});

const normalizeOrder = (order) => {
  const cartSubtotal =
    order?.cartSubtotal !== undefined
      ? Number(order.cartSubtotal) || 0
      : order?.subtotalAmount !== undefined
        ? Number(order.subtotalAmount) || 0
        : Number(order?.totalAmount) || 0;
  const discountAmount = Number(order?.discountAmount) || 0;
  const subtotalAmount =
    order?.subtotalAmount !== undefined
      ? Number(order.subtotalAmount) || 0
      : Math.max(0, cartSubtotal - discountAmount);
  const taxEnabled = Boolean(order?.taxEnabled);
  const tax = calculateTaxBreakdown(subtotalAmount, taxEnabled);

  return {
    ...order,
    orderId: order?.orderId || order?.id || '',
    items: (order?.items || []).map(normalizeLineItem),
    customerPhone: order?.customerPhone || '',
    cartSubtotal,
    discountAmount,
    offerApplied: Boolean(order?.offerApplied),
    offerName: typeof order?.offerName === 'string' ? order.offerName : '',
    subtotalAmount: tax.subtotal,
    taxEnabled,
    cgstAmount: order?.cgstAmount !== undefined ? Number(order.cgstAmount) || 0 : tax.cgstAmount,
    sgstAmount: order?.sgstAmount !== undefined ? Number(order.sgstAmount) || 0 : tax.sgstAmount,
    totalAmount:
      order?.totalAmount !== undefined ? Number(order.totalAmount) || 0 : tax.total,
    itemCount: Number(order?.itemCount) || 0,
    timestamp: order?.timestamp || new Date().toISOString(),
    isPaid: Boolean(order?.isPaid),
    isOrderReady: Boolean(order?.isOrderReady),
  };
};

const normalizeInventoryItem = (item, fallbackIndex = 0) => ({
  ...item,
  itemNumber: Number(item?.itemNumber) || fallbackIndex + 1,
  createdAt: item?.createdAt || new Date(0).toISOString(),
  category: typeof item?.category === 'string' ? item.category : '',
  variants: item?.variants || [],
  addons: item?.addons || [],
  basePrice: Number(item?.basePrice) || 0,
  enabled: item?.enabled !== false,
});

const assignItemNumbers = (items) => {
  let maxNum = 0;
  return items.map((item, index) => {
    let itemNumber = Number(item.itemNumber) || 0;
    if (!itemNumber) itemNumber = maxNum + 1;
    if (itemNumber <= maxNum) itemNumber = maxNum + 1;
    maxNum = itemNumber;
    return { ...item, itemNumber };
  });
};

const useStore = create(
  persist(
    (set, get) => ({
      inventory: [],
      cart: [],
      history: [],
      orderSequence: 0,

      shopName: '',
      fssaiNumber: '',
      gstinNumber: '',
      shopLogoUri: '',
      shopLogoStyle: 'normal',
      theme: { ...DEFAULT_THEME },
      language: 'en',
      showWhatsAppInvoiceButtons: true,
      shopOffer: { ...DEFAULT_SHOP_OFFER },
      menuListView: false,
      ownerToken: '',
      licenseKey: '',
      licenseExpiry: null,
      isAuthenticated: false,

      login: (shopName, licenseKey) => {
        const result = validateLicenseKey(licenseKey);
        if (!result.valid) {
          if (result.reason === 'expired') {
            return {
              success: false,
              reason: 'expired',
              error:
                'This license key has expired. Generate a 10-digit renewal code below and send it to your provider.',
            };
          }
          return { success: false, error: 'Invalid license key. Please check and try again.' };
        }

        set({
          shopName: shopName.trim(),
          licenseKey: licenseKey.trim().toUpperCase(),
          licenseExpiry: result.expiryMs,
          isAuthenticated: true,
        });
        return { success: true };
      },

      logout: () => {
        set({
          shopName: '',
          licenseKey: '',
          licenseExpiry: null,
          isAuthenticated: false,
          cart: [],
        });
      },

      checkLicense: () => {
        try {
          const { licenseKey, isAuthenticated } = get();
          if (!isAuthenticated || !licenseKey) return false;

          const result = validateLicenseKey(licenseKey);
          if (!result.valid) {
            get().logout();
            return false;
          }

          set({ licenseExpiry: result.expiryMs });
          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      addInventoryItem: (item) => {
        const inventory = get().inventory;
        const maxNum = inventory.reduce(
          (max, entry) => Math.max(max, Number(entry.itemNumber) || 0),
          0
        );
        const newItem = {
          id: createId(),
          itemNumber: maxNum + 1,
          createdAt: new Date().toISOString(),
          name: item.name.trim(),
          basePrice: Number(item.basePrice),
          category: typeof item.category === 'string' ? item.category.trim() : '',
          variants: (item.variants || []).map((v) => ({
            name: v.name.trim(),
            price: Number(v.price),
          })),
          addons: (item.addons || []).map((a) => ({
            name: a.name.trim(),
            price: Number(a.price),
          })),
          enabled: item?.enabled !== false,
        };
        set((state) => ({ inventory: [...state.inventory, newItem] }));
      },

      bulkAddInventoryItems: (items) => {
        if (!Array.isArray(items) || items.length === 0) {
          return { added: 0 };
        }

        const inventory = get().inventory;
        let maxNum = inventory.reduce(
          (max, entry) => Math.max(max, Number(entry.itemNumber) || 0),
          0
        );

        const newItems = items.map((item) => {
          maxNum += 1;
          return {
            id: createId(),
            itemNumber: maxNum,
            createdAt: new Date().toISOString(),
            name: item.name.trim(),
            basePrice: Number(item.basePrice),
            category: typeof item.category === 'string' ? item.category.trim() : '',
            variants: (item.variants || []).map((v) => ({
              name: v.name.trim(),
              price: Number(v.price),
            })),
            addons: (item.addons || []).map((a) => ({
              name: a.name.trim(),
              price: Number(a.price),
            })),
            enabled: item?.enabled !== false,
          };
        });

        set((state) => ({ inventory: [...state.inventory, ...newItems] }));
        return { added: newItems.length };
      },

      updateInventoryItem: (id, updates) => {
        set((state) => ({
          inventory: state.inventory.map((entry) => {
            if (entry.id !== id) return entry;
            return {
              ...entry,
              name: typeof updates?.name === 'string' ? updates.name.trim() : entry.name,
              basePrice:
                updates?.basePrice !== undefined ? Number(updates.basePrice) : entry.basePrice,
              category:
                typeof updates?.category === 'string' ? updates.category.trim() : entry.category || '',
              variants: Array.isArray(updates?.variants)
                ? updates.variants.map((v) => ({
                    name: String(v?.name ?? '').trim(),
                    price: Number(v?.price ?? 0),
                  }))
                : entry.variants,
              addons: Array.isArray(updates?.addons)
                ? updates.addons.map((a) => ({
                    name: String(a?.name ?? '').trim(),
                    price: Number(a?.price ?? 0),
                  }))
                : entry.addons,
              enabled:
                typeof updates?.enabled === 'boolean' ? updates.enabled : entry.enabled !== false,
            };
          }),
        }));
      },

      toggleInventoryItemEnabled: (id) => {
        set((state) => ({
          inventory: state.inventory.map((entry) => {
            if (entry.id !== id) return entry;
            const currentlyEnabled = entry.enabled !== false;
            return { ...entry, enabled: !currentlyEnabled };
          }),
        }));
      },

      removeInventoryItem: (id) => {
        set((state) => ({
          inventory: state.inventory.filter((item) => item.id !== id),
        }));
      },

      addToCart: (item, selectedVariant, selectedAddons, quantity = 1) => {
        const unitPrice = calculateItemPrice(item, selectedVariant, selectedAddons);
        const lineKey = cartLineKey(item.id, selectedVariant, selectedAddons);

        set((state) => {
          const existingIndex = state.cart.findIndex((ci) => {
            const existingKey = cartLineKey(ci.itemId, ci.selectedVariant, ci.selectedAddons);
            return existingKey === lineKey && Number(ci.unitPrice) === Number(unitPrice);
          });

          if (existingIndex === -1) {
            const cartItem = {
              id: createId(),
              itemId: item.id,
              name: item.name,
              selectedVariant,
              selectedAddons,
              quantity,
              unitPrice,
              totalPrice: unitPrice * quantity,
            };
            return { cart: [...state.cart, cartItem] };
          }

          const existing = state.cart[existingIndex];
          const nextQty = (Number(existing.quantity) || 0) + (Number(quantity) || 0);
          const updated = {
            ...existing,
            quantity: nextQty,
            totalPrice: Number(existing.unitPrice) * nextQty,
          };
          const nextCart = state.cart.slice();
          nextCart[existingIndex] = updated;
          return { cart: nextCart };
        });
      },

      removeFromCart: (cartItemId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== cartItemId),
        }));
      },

      updateCartItemQuantity: (cartItemId, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === cartItemId
              ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
              : item
          ),
        }));
      },

      getCartTotal: () => {
        return get().cart.reduce((sum, item) => sum + item.totalPrice, 0);
      },

      updateShopSettings: ({
        shopName,
        fssaiNumber,
        gstinNumber,
        shopLogoUri,
        shopLogoStyle,
        theme,
        language,
        showWhatsAppInvoiceButtons,
        shopOffer,
        menuListView,
        ownerToken,
      }) => {
        const updates = {};
        if (typeof shopName === 'string') updates.shopName = shopName.trim();
        if (typeof fssaiNumber === 'string') updates.fssaiNumber = fssaiNumber.trim();
        if (typeof gstinNumber === 'string') updates.gstinNumber = gstinNumber.trim();
        if (typeof shopLogoUri === 'string') {
          updates.shopLogoUri = normalizeShopLogoUri(shopLogoUri);
        }
        if (typeof shopLogoStyle === 'string') {
          updates.shopLogoStyle = normalizeShopLogoStyle(shopLogoStyle);
        }
        if (theme && typeof theme === 'object') {
          updates.theme = resolveTheme(theme);
        }
        if (typeof language === 'string') updates.language = language;
        if (typeof showWhatsAppInvoiceButtons === 'boolean') {
          updates.showWhatsAppInvoiceButtons = showWhatsAppInvoiceButtons;
        }
        if (shopOffer && typeof shopOffer === 'object') {
          updates.shopOffer = normalizeShopOffer(shopOffer);
        }
        if (typeof menuListView === 'boolean') {
          updates.menuListView = menuListView;
        }
        if (typeof ownerToken === 'string') {
          updates.ownerToken = normalizeOwnerToken(ownerToken);
        }
        set(updates);
      },

      setMenuListView: (menuListView) => {
        set({ menuListView: Boolean(menuListView) });
      },

      checkout: (customerPhone = '', { taxEnabled = false, isPaid = false, offerApplied = false } = {}) => {
        const { cart, shopOffer } = get();
        if (cart.length === 0) return null;

        const cartSubtotal = get().getCartTotal();
        const bill = calculateBillTotals(cartSubtotal, { taxEnabled, shopOffer, offerApplied });
        const nextSeq = Number(get().orderSequence || 0) + 1;
        const order = {
          id: createId(),
          orderId: createOrderId(nextSeq),
          items: [...cart],
          cartSubtotal: bill.cartSubtotal,
          discountAmount: bill.discountAmount,
          offerApplied: bill.offerApplied,
          offerName: bill.offerName,
          subtotalAmount: bill.subtotal,
          taxEnabled,
          cgstAmount: bill.cgstAmount,
          sgstAmount: bill.sgstAmount,
          totalAmount: bill.total,
          itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
          timestamp: new Date().toISOString(),
          customerPhone: customerPhone.trim(),
          isPaid: Boolean(isPaid),
          isOrderReady: false,
        };

        set((state) => ({
          history: [order, ...state.history],
          cart: [],
          orderSequence: nextSeq,
        }));

        return order;
      },

      updateOrderCustomerPhone: (orderKey, customerPhone = '') => {
        const nextPhone = String(customerPhone ?? '').trim();
        set((state) => ({
          history: state.history.map((order) => {
            const matches = order.id === orderKey || order.orderId === orderKey;
            return matches ? { ...order, customerPhone: nextPhone } : order;
          }),
        }));
      },

      toggleOrderPaid: (orderKey) => {
        set((state) => ({
          history: state.history.map((order) => {
            const matches = order.id === orderKey || order.orderId === orderKey;
            return matches ? { ...order, isPaid: !order.isPaid } : order;
          }),
        }));
      },

      markOrderReady: (orderKey) => {
        set((state) => ({
          history: state.history.map((order) => {
            const matches = order.id === orderKey || order.orderId === orderKey;
            return matches ? { ...order, isOrderReady: true } : order;
          }),
        }));
      },

      clearCart: () => set({ cart: [] }),

      importBackupData: (data) => {
        if (!data || typeof data !== 'object') return { success: false };

        set({
          shopName: typeof data.shopName === 'string' ? data.shopName.trim() : '',
          fssaiNumber: typeof data.fssaiNumber === 'string' ? data.fssaiNumber.trim() : '',
          gstinNumber: typeof data.gstinNumber === 'string' ? data.gstinNumber.trim() : '',
          shopLogoUri: normalizeShopLogoUri(data.shopLogoUri),
          shopLogoStyle: normalizeShopLogoStyle(data.shopLogoStyle),
          theme: resolveTheme(data.theme),
          language: typeof data.language === 'string' ? data.language : 'en',
          showWhatsAppInvoiceButtons: data.showWhatsAppInvoiceButtons !== false,
          shopOffer: normalizeShopOffer(data.shopOffer),
          menuListView: Boolean(data.menuListView),
          ownerToken: normalizeOwnerToken(data.ownerToken),
          orderSequence: Number(data.orderSequence) || 0,
          inventory: Array.isArray(data.inventory)
            ? assignItemNumbers(
                data.inventory.map((item, index) => normalizeInventoryItem(item, index))
              )
            : [],
          history: Array.isArray(data.history) ? data.history.map(normalizeOrder) : [],
          cart: [],
        });

        return { success: true };
      },

      resetStorage: () => {
        set({
          inventory: [],
          cart: [],
          history: [],
          orderSequence: 0,
          shopName: '',
          fssaiNumber: '',
          gstinNumber: '',
          shopLogoUri: '',
          shopLogoStyle: 'normal',
          theme: { ...DEFAULT_THEME },
          language: 'en',
          showWhatsAppInvoiceButtons: true,
          shopOffer: { ...DEFAULT_SHOP_OFFER },
          menuListView: false,
          ownerToken: '',
          licenseKey: '',
          licenseExpiry: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'pos-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        inventory: state.inventory,
        history: state.history,
        orderSequence: state.orderSequence,
        shopName: state.shopName,
        fssaiNumber: state.fssaiNumber,
        gstinNumber: state.gstinNumber,
        shopLogoUri: state.shopLogoUri,
        shopLogoStyle: state.shopLogoStyle,
        theme: state.theme,
        language: state.language,
        showWhatsAppInvoiceButtons: state.showWhatsAppInvoiceButtons,
        shopOffer: state.shopOffer,
        menuListView: state.menuListView,
        ownerToken: state.ownerToken,
        licenseKey: state.licenseKey,
        licenseExpiry: state.licenseExpiry,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => {
        try {
          const saved = persistedState && typeof persistedState === 'object' ? persistedState : {};
          return {
            ...currentState,
            shopName: typeof saved.shopName === 'string' ? saved.shopName : '',
            fssaiNumber: typeof saved.fssaiNumber === 'string' ? saved.fssaiNumber : '',
            gstinNumber: typeof saved.gstinNumber === 'string' ? saved.gstinNumber : '',
            shopLogoUri: normalizeShopLogoUri(saved.shopLogoUri),
            shopLogoStyle: normalizeShopLogoStyle(saved.shopLogoStyle),
            theme: resolveTheme(saved.theme),
            language: typeof saved.language === 'string' ? saved.language : 'en',
            showWhatsAppInvoiceButtons:
              saved.showWhatsAppInvoiceButtons !== undefined
                ? Boolean(saved.showWhatsAppInvoiceButtons)
                : true,
            shopOffer: normalizeShopOffer(saved.shopOffer),
            menuListView: Boolean(saved.menuListView),
            ownerToken: normalizeOwnerToken(saved.ownerToken),
            licenseKey: typeof saved.licenseKey === 'string' ? saved.licenseKey : '',
            licenseExpiry: saved.licenseExpiry ?? null,
            isAuthenticated: Boolean(saved.isAuthenticated),
            orderSequence: Number(saved.orderSequence) || 0,
            inventory: Array.isArray(saved.inventory)
              ? assignItemNumbers(
                  saved.inventory.map((item, index) => normalizeInventoryItem(item, index))
                )
              : [],
            history: Array.isArray(saved.history)
              ? saved.history.map(normalizeOrder)
              : [],
            cart: [],
          };
        } catch (error) {
          console.error('Failed to merge saved data:', error);
          return currentState;
        }
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to restore saved data:', error);
        }
      },
    }
  )
);

export default useStore;
