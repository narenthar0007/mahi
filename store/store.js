import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { validateLicenseKey } from '../utils/licenseKey';

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

const normalizeOrder = (order) => ({
  ...order,
  orderId: order?.orderId || order?.id || '',
  items: (order?.items || []).map(normalizeLineItem),
  customerPhone: order?.customerPhone || '',
  totalAmount: Number(order?.totalAmount) || 0,
  itemCount: Number(order?.itemCount) || 0,
  timestamp: order?.timestamp || new Date().toISOString(),
});

const normalizeInventoryItem = (item, fallbackIndex = 0) => ({
  ...item,
  itemNumber: Number(item?.itemNumber) || fallbackIndex + 1,
  createdAt: item?.createdAt || new Date(0).toISOString(),
  category: typeof item?.category === 'string' ? item.category : '',
  variants: item?.variants || [],
  addons: item?.addons || [],
  basePrice: Number(item?.basePrice) || 0,
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
      licenseKey: '',
      licenseExpiry: null,
      isAuthenticated: false,

      login: (shopName, licenseKey) => {
        const result = validateLicenseKey(licenseKey);
        if (!result.valid) {
          if (result.reason === 'expired') {
            return { success: false, error: 'This license key has expired. Contact your provider for a new key.' };
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
          variants: item.variants.map((v) => ({
            name: v.name.trim(),
            price: Number(v.price),
          })),
          addons: item.addons.map((a) => ({
            name: a.name.trim(),
            price: Number(a.price),
          })),
        };
        set((state) => ({ inventory: [...state.inventory, newItem] }));
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
            };
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

      checkout: (customerPhone = '') => {
        const { cart } = get();
        if (cart.length === 0) return null;

        const nextSeq = Number(get().orderSequence || 0) + 1;
        const order = {
          id: createId(),
          orderId: createOrderId(nextSeq),
          items: [...cart],
          totalAmount: get().getCartTotal(),
          itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
          timestamp: new Date().toISOString(),
          customerPhone: customerPhone.trim(),
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

      clearCart: () => set({ cart: [] }),

      resetStorage: () => {
        set({
          inventory: [],
          cart: [],
          history: [],
          orderSequence: 0,
          shopName: '',
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
