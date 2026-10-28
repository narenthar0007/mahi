import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

import { getLicenseAccess } from '../utils/licenseKey';
import { APP_VERSION, verifyAccountAccess, setAccountLoginState } from '../utils/licenseRemote';
import {
  createDebouncedEncryptedAsyncStorage,
} from '../utils/secureCrypto';

const PERSIST_DEBOUNCE_MS = 650;
const debouncedPersistStorage = createDebouncedEncryptedAsyncStorage(
  AsyncStorage,
  PERSIST_DEBOUNCE_MS
);
import {
  calculateTaxBreakdown,
  DEFAULT_THEME,
  resolveTheme,
} from '../utils/theme';

import {
  normalizeShopLogoStyle,
  normalizeShopLogoUri,
} from '../utils/shopLogo';

import { normalizeUpiQrUri } from '../utils/upiQr';

import {
  calculateBillTotals,
  DEFAULT_SHOP_OFFER,
  normalizeShopOffer,
} from '../utils/offers';

import {
  normalizeAppUniqueKey,
  normalizeAppKey,
  normalizeSecretToken,
  normalizeClientToken,
} from '../utils/apiKeys';

import {
  createWaitlistEntry,
  normalizeWaitlist,
} from '../utils/waitlist';

import {
  createDefaultTables,
  createTable,
  normalizeSeatsType,
  normalizeTables,
  resolveTableCapacity,
  syncTablesWithHistory,
} from '../utils/tableManagement';

/* =========================================================
   HELPERS
========================================================= */

const createId = () => String(uuid.v4());

const createOrderId = (sequenceNumber) =>
  `ORD-${String(sequenceNumber).padStart(6, '0')}`;

export const ITEM_UNITS = [
  'Kg',
  'Gram',
  'Litre',
  'ml',
];

/* =========================================================
   SAFE NUMBER
========================================================= */

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

/* =========================================================
   NORMALIZE UNIT
========================================================= */

const normalizeUnit = (unit) => {
  const value =
    typeof unit === 'string'
      ? unit.trim()
      : '';

  if (!value) return '';

  const match = ITEM_UNITS.find(
    (entry) =>
      entry.toLowerCase() ===
      value.toLowerCase()
  );

  return match || value;
};

/* =========================================================
   CALCULATE ITEM PRICE
========================================================= */

export const calculateItemPrice = (
  item,
  selectedVariant = null,
  selectedAddons = [],
  priceOverride = null
) => {
  /*
    IMPORTANT:
    Prevent:
    Cannot read properties of null
    (reading 'basePrice')
  */

  if (!item || typeof item !== 'object') {
    return 0;
  }

  const hasOverride =
    priceOverride !== null &&
    priceOverride !== undefined &&
    priceOverride !== '';

  let basePrice = 0;

  if (hasOverride) {
    basePrice = safeNumber(
      priceOverride,
      0
    );
  } else if (
    selectedVariant &&
    typeof selectedVariant === 'object'
  ) {
    basePrice = safeNumber(
      selectedVariant.price,
      0
    );
  } else {
    basePrice = safeNumber(
      item.basePrice,
      0
    );
  }

  const addonTotal =
    Array.isArray(selectedAddons)
      ? selectedAddons.reduce(
          (sum, addon) => {
            if (
              !addon ||
              typeof addon !== 'object'
            ) {
              return sum;
            }

            return (
              sum +
              safeNumber(
                addon.price,
                0
              )
            );
          },
          0
        )
      : 0;

  return (
    safeNumber(basePrice, 0) +
    safeNumber(addonTotal, 0)
  );
};

/* =========================================================
   CART LINE KEY
========================================================= */

const cartLineKey = (
  itemId,
  selectedVariant = null,
  selectedAddons = [],
  note = ''
) => {
  const variantPart =
    selectedVariant &&
    typeof selectedVariant === 'object'
      ? `v:${String(
          selectedVariant.name ?? ''
        )}|${safeNumber(
          selectedVariant.price,
          0
        )}`
    : 'v:';

  const addonsPart =
    Array.isArray(selectedAddons)
      ? selectedAddons
          .filter(
            (addon) =>
              addon &&
              typeof addon === 'object'
          )
          .map(
            (addon) =>
              `a:${String(
                addon.name ?? ''
              )}|${safeNumber(
                addon.price,
                0
              )}`
          )
    .sort()
          .join(',')
      : '';

  const notePart = `n:${String(note ?? '').trim()}`;

  return `${String(
    itemId ?? ''
  )}::${variantPart}::${addonsPart}::${notePart}`;
};

/* =========================================================
   NORMALIZE LINE ITEM
========================================================= */

const normalizeLineItem = (line) => {
  if (
    !line ||
    typeof line !== 'object'
  ) {
    return null;
  }

  const selectedVariant =
    line.selectedVariant &&
    typeof line.selectedVariant ===
      'object'
      ? {
          name: String(
            line.selectedVariant.name ??
              ''
          ),
          price: safeNumber(
            line.selectedVariant.price,
            0
          ),
        }
      : null;

  const selectedAddons =
    Array.isArray(line.selectedAddons)
      ? line.selectedAddons
          .filter(
            (addon) =>
              addon &&
              typeof addon === 'object'
          )
          .map((addon) => ({
            name: String(
              addon.name ?? ''
            ),
            price: safeNumber(
              addon.price,
              0
            ),
          }))
      : [];

  return {
  ...line,

    id: line.id
      ? String(line.id)
      : createId(),

    itemId: line.itemId
      ? String(line.itemId)
      : '',

    name:
      typeof line.name === 'string'
        ? line.name
        : 'Unnamed Item',

    selectedVariant,

    selectedAddons,

    quantity:
      safeNumber(line.quantity, 1) > 0
        ? safeNumber(line.quantity, 1)
        : 1,

    unitPrice:
      safeNumber(line.unitPrice, 0),

    totalPrice:
      safeNumber(line.totalPrice, 0),

    isWeightBased:
      Boolean(line.isWeightBased),

    isVariablePrice:
      Boolean(line.isVariablePrice),

    unit:
      normalizeUnit(line.unit),

    note:
      typeof line.note === 'string'
        ? line.note.trim()
        : '',
  };
};

/* =========================================================
   NORMALIZE ORDER
========================================================= */

const normalizeOrder = (order) => {
  if (
    !order ||
    typeof order !== 'object'
  ) {
    return null;
  }

  const rawItems = Array.isArray(
    order.items
  )
    ? order.items
    : [];

  const items = rawItems
    .map(normalizeLineItem)
    .filter(Boolean);

  const cartSubtotal =
    order.cartSubtotal !== undefined
      ? safeNumber(
          order.cartSubtotal,
          0
        )
      : order.subtotalAmount !==
        undefined
      ? safeNumber(
          order.subtotalAmount,
          0
        )
      : safeNumber(
          order.totalAmount,
          0
        );

  const discountAmount =
    safeNumber(
      order.discountAmount,
      0
    );

  const subtotalAmount =
    order.subtotalAmount !==
    undefined
      ? safeNumber(
          order.subtotalAmount,
          0
        )
      : Math.max(
          0,
          cartSubtotal -
            discountAmount
        );

  const taxEnabled =
    Boolean(order.taxEnabled);

  const tax =
    calculateTaxBreakdown(
      subtotalAmount,
      taxEnabled
    );

  return {
    ...order,

    id:
      order.id ||
      createId(),

    orderId:
      order.orderId ||
      order.id ||
      '',

    items,

    customerPhone:
      typeof order.customerPhone ===
      'string'
        ? order.customerPhone
        : '',

    orderNote:
      typeof order.orderNote === 'string'
        ? order.orderNote.trim()
        : '',

    cartSubtotal,

    discountAmount,

    offerApplied:
      Boolean(order.offerApplied),

    offerName:
      typeof order.offerName ===
      'string'
        ? order.offerName
        : '',

    subtotalAmount:
      tax.subtotal,

    taxEnabled,

    cgstAmount:
      order.cgstAmount !== undefined
        ? safeNumber(
            order.cgstAmount,
            0
          )
        : tax.cgstAmount,

    sgstAmount:
      order.sgstAmount !== undefined
        ? safeNumber(
            order.sgstAmount,
            0
          )
        : tax.sgstAmount,

    totalAmount:
      order.totalAmount !==
      undefined
        ? safeNumber(
            order.totalAmount,
            0
          )
        : tax.total,

    itemCount:
      safeNumber(
        order.itemCount,
        items.reduce(
          (sum, item) =>
            sum +
            safeNumber(
              item.quantity,
              0
            ),
          0
        )
      ),

    timestamp:
      order.timestamp ||
      new Date().toISOString(),

    isPaid:
      Boolean(order.isPaid),

    isWrongOrder:
      Boolean(order.isWrongOrder),

    isDue:
      Boolean(order.isPaid)
        ? false
        : Boolean(order.isDue),

    isOrderReady:
      Boolean(order.isOrderReady),

    isEdited:
      Boolean(order.isEdited),

    editedAt:
      typeof order.editedAt ===
      'string'
        ? order.editedAt
        : null,

    isTableOrder:
      Boolean(order.isTableOrder),

    tableId:
      order.tableId
        ? String(order.tableId)
        : null,

    tableNumber:
      typeof order.tableNumber ===
      'string'
        ? order.tableNumber
        : '',

    tableSeatsType:
      order.tableSeatsType
        ? normalizeSeatsType(
            order.tableSeatsType
          )
        : '',
  };
};

/* =========================================================
   NORMALIZE INVENTORY ITEM
========================================================= */

const normalizeInventoryItem = (
  item,
  fallbackIndex = 0
) => {
  /*
    IMPORTANT:
    Never allow null inventory items.
  */

  if (
    !item ||
    typeof item !== 'object'
  ) {
    return {
      id: createId(),

      itemNumber:
        fallbackIndex + 1,

      createdAt:
        new Date(0).toISOString(),

      name: '',

      category: '',

      basePrice: 0,

      variants: [],

      addons: [],

      enabled: false,

      isWeightBased: false,

      isVariablePrice: false,

      unit: '',
    };
  }

  const variants =
    Array.isArray(item.variants)
      ? item.variants
          .filter(
            (variant) =>
              variant &&
              typeof variant ===
                'object'
          )
          .map((variant) => ({
            name: String(
              variant.name ?? ''
            ).trim(),

            price: safeNumber(
              variant.price,
              0
            ),
          }))
      : [];

  const addons =
    Array.isArray(item.addons)
      ? item.addons
          .filter(
            (addon) =>
              addon &&
              typeof addon ===
                'object'
          )
          .map((addon) => ({
            name: String(
              addon.name ?? ''
            ).trim(),

            price: safeNumber(
              addon.price,
              0
            ),
          }))
      : [];

  return {
  ...item,

    id:
      item.id
        ? String(item.id)
        : createId(),

    itemNumber:
      safeNumber(
        item.itemNumber,
        fallbackIndex + 1
      ),

    createdAt:
      item.createdAt ||
      new Date(0).toISOString(),

    name:
      typeof item.name ===
      'string'
        ? item.name
        : '',

    category:
      typeof item.category ===
      'string'
        ? item.category
        : '',

    basePrice:
      safeNumber(
        item.basePrice,
        0
      ),

    variants,

    addons,

    enabled:
      item.enabled !== false,

    isWeightBased:
      Boolean(
        item.isWeightBased
      ),

    isVariablePrice:
      Boolean(
        item.isVariablePrice
      ),

    unit:
      normalizeUnit(item.unit),
  };
};

/* =========================================================
   ASSIGN ITEM NUMBERS
========================================================= */

const assignItemNumbers = (
  items
) => {
  let maxNum = 0;

  const safeItems =
    Array.isArray(items)
      ? items.filter(Boolean)
      : [];

  return safeItems.map(
    (item, index) => {
      let itemNumber =
        safeNumber(
          item.itemNumber,
          0
        );

      if (!itemNumber) {
        itemNumber =
          maxNum + 1;
      }

      if (
        itemNumber <= maxNum
      ) {
        itemNumber =
          maxNum + 1;
      }

    maxNum = itemNumber;

      return {
        ...item,
        itemNumber,
      };
    }
  );
};

/* =========================================================
   STORE
========================================================= */

const useStore = create(
  persist(
    (set, get) => ({
      /* ===================================================
         STATE
      =================================================== */

      inventory: [],

      cart: [],

      history: [],

      orderSequence: 0,

      tables:
        createDefaultTables(),

      activeTableId: null,

      waitlist: [],

      shopName: '',

      fssaiNumber: '',

      gstinNumber: '',

      shopLogoUri: '',

      shopLogoStyle: 'normal',

      upiQrUri: '',

      theme: {
        ...DEFAULT_THEME,
      },

      language: 'en',

      showWhatsAppInvoiceButtons:
        true,

      enableTables: true,

      enableWeightBasedPricing:
        false,

      enableVariablePriceItems:
        false,

      enableDueOrders: false,

      shopOffer: {
        ...DEFAULT_SHOP_OFFER,
      },

      menuListView: false,

      appearanceMode: 'light',

      tableBookerTheme: 'light',

      shopWebsite: '',

      menuWebsite: '',

      includeWebsitesInWhatsApp:
        false,

      apiUniqueKey: '',

      apiAppKey: '',

      apiSecretToken: '',

      apiClientToken: '',

      licenseKey: '',

      licenseExpiry: null,

      loginSessionId: '',

      isAuthenticated: false,

      forceUpdateRequired: false,

      forceUpdateInfo: null,

      /* ===================================================
         LOGIN
      =================================================== */

      login: async (
        shopName,
        licenseKey,
        options = {}
      ) => {
        const trimmedShop =
          typeof shopName ===
          'string'
            ? shopName.trim()
            : '';

        const trimmedKey =
          typeof licenseKey ===
          'string'
            ? licenseKey
                .trim()
                .toUpperCase()
            : '';

        const allowTakeover = Boolean(
          options.logoutOtherDevices
        );

        const result = getLicenseAccess(trimmedKey);

        if (!result.allowed) {
          if (result.reason === 'expired') {
            return {
              success: false,
              reason: 'expired',
              error:
                'This license key has expired. Generate a 10-digit renewal code below and send it to your provider.',
            };
          }

          return {
            success: false,
            error:
              'Invalid license key. Please check and try again.',
          };
        }

        let remote = {
          ok: true,
          blocked: false,
          offline: true,
        };

        try {
          remote =
            await verifyAccountAccess({
              shopName: trimmedShop,
              licenseKey: trimmedKey,
              appVersion: APP_VERSION,
              allowTakeover,
            });
        } catch (error) {
          console.error(
            'Remote license check failed:',
            error
          );
        }

        const sessionId = createId();

        if (remote.offline) {
          set({
            shopName: trimmedShop,
            licenseKey: trimmedKey,
            licenseExpiry: result.expiryMs || null,
            loginSessionId: sessionId,
            isAuthenticated: true,
            forceUpdateRequired: false,
            forceUpdateInfo: null,
          });

          return {
            success: true,
            offline: true,
          };
        }

        if (remote.forceUpdate) {
          set({
            forceUpdateRequired: true,
            forceUpdateInfo:
              remote.update || null,
          });

          return {
            success: false,
            reason: 'force_update',
            error:
              remote.error ||
              remote.update?.message ||
              'Please download the latest NAM bill app.',
            downloadUrl:
              remote.update?.downloadUrl,
          };
        }

        if (remote.blocked) {
          return {
            success: false,
            reason:
              remote.reason ||
              'blocked',
            error:
              remote.error ||
              'This account cannot log in.',
          };
        }

        if (remote.row) {
          try {
            // Takeover / fresh login always writes a new session onto the sheet.
            await setAccountLoginState({
              shopName: trimmedShop,
              licenseKey: trimmedKey,
              isLogin: true,
              sessionId,
              row: remote.row || null,
            });
          } catch (error) {
            // Do not block login if sheet write fails — local session still works.
            console.error('Could not update Is Login:', error);
          }
        }

        set({
          shopName: trimmedShop,

          licenseKey: trimmedKey,

          licenseExpiry:
            remote.expiryMs ||
            result.expiryMs,

          loginSessionId: sessionId,

          isAuthenticated: true,

          forceUpdateRequired: false,

          forceUpdateInfo: null,
        });

        return {
          success: true,
          updateAvailable: Boolean(remote.updateAvailable),
          updateMessage: remote.update?.message,
          downloadUrl: remote.update?.downloadUrl,
        };
      },

      /* ===================================================
         LOGOUT
      =================================================== */

      logout: async (options = {}) => {
        const updateSheet = options.updateSheet !== false;
        const {
          shopName,
          licenseKey,
        } = get();

        if (
          updateSheet &&
          shopName &&
          licenseKey
        ) {
          try {
            await setAccountLoginState({
              shopName,
              licenseKey,
              isLogin: false,
              sessionId: '',
            });
          } catch (error) {
            console.error(
              'Could not clear Is Login:',
              error
            );
          }
        }

        set({
          shopName: '',

          licenseKey: '',

          licenseExpiry: null,

          loginSessionId: '',

          isAuthenticated: false,

          forceUpdateRequired: false,

          forceUpdateInfo: null,

          cart: [],
        });
      },

      /* ===================================================
         CHECK LICENSE
      =================================================== */

      checkLicense: () => {
        try {
          const {
            licenseKey,
            isAuthenticated,
            shopName,
            loginSessionId,
          } = get();

          if (
            !isAuthenticated ||
            !licenseKey
          ) {
            return false;
          }

          const access = getLicenseAccess(licenseKey);

          if (!access.allowed) {
            get().logout({ updateSheet: true });

            return false;
          }

          if (
            get().licenseExpiry !==
            access.expiryMs
          ) {
            set({
              licenseExpiry:
                access.expiryMs,
            });
          }

          verifyAccountAccess({
            shopName,
            licenseKey,
            appVersion: APP_VERSION,
            sessionId: loginSessionId,
          })
            .then((remote) => {
              if (remote.offline) {
                return;
              }

              if (
                remote.forceUpdate
              ) {
                set({
                  forceUpdateRequired: true,
                  forceUpdateInfo:
                    remote.update ||
                    null,
                });
                return;
              }

              if (remote.blocked) {
                const kicked =
                  remote.reason ===
                    'session_replaced' ||
                  remote.reason ===
                    'logged_out_remotely';
                get().logout({
                  updateSheet: !kicked,
                });
                return;
              }

              const state = get();
              if (
                remote.ok &&
                !remote.offline &&
                (!remote.alreadyLoggedIn ||
                  !state.loginSessionId)
              ) {
                const sessionId =
                  state.loginSessionId ||
                  createId();
                if (
                  sessionId !==
                  state.loginSessionId
                ) {
                  set({
                    loginSessionId:
                      sessionId,
                  });
                }
                setAccountLoginState({
                  shopName: state.shopName,
                  licenseKey:
                    state.licenseKey,
                  isLogin: true,
                  sessionId,
                  row: remote.row || null,
                }).catch(() => {});
              }
            })
            .catch((error) => {
              console.error(
                'Remote license check failed:',
                error
              );
            });

          return true;
        } catch (error) {
          console.error(
            'License check error:',
            error
          );

          get().logout({ updateSheet: false });

          return false;
        }
      },

      /* ===================================================
         ADD INVENTORY ITEM
      =================================================== */

      addInventoryItem: (
        item
      ) => {
        if (
          !item ||
          typeof item !==
            'object'
        ) {
          return {
            success: false,
            error:
              'invalid_item',
          };
        }

        const inventory =
          Array.isArray(
            get().inventory
          )
            ? get().inventory.filter(
                Boolean
              )
            : [];

        const maxNum =
          inventory.reduce(
            (
              max,
              entry
            ) =>
              Math.max(
                max,
                safeNumber(
                  entry?.itemNumber,
                  0
                )
              ),
            0
          );

        const newItem = {
          id: createId(),

          itemNumber:
            maxNum + 1,

          createdAt:
            new Date().toISOString(),

          name:
            typeof item.name ===
            'string'
              ? item.name.trim()
              : '',

          basePrice:
            safeNumber(
              item.basePrice,
              0
            ),

          category:
            typeof item.category ===
            'string'
              ? item.category.trim()
              : '',

          variants:
            Array.isArray(
              item.variants
            )
              ? item.variants
                  .filter(Boolean)
                  .map(
                    (v) => ({
                      name: String(
                        v?.name ??
                          ''
                      ).trim(),

                      price:
                        safeNumber(
                          v?.price,
                          0
                        ),
                    })
                  )
              : [],

          addons:
            Array.isArray(
              item.addons
            )
              ? item.addons
                  .filter(Boolean)
                  .map(
                    (a) => ({
                      name: String(
                        a?.name ??
                          ''
                      ).trim(),

                      price:
                        safeNumber(
                          a?.price,
                          0
                        ),
                    })
                  )
              : [],

          enabled:
            item.enabled !==
            false,

          isWeightBased:
            Boolean(
              item.isWeightBased
            ),

          isVariablePrice:
            Boolean(
              item.isVariablePrice
            ),

          unit:
            normalizeUnit(
              item.unit
            ),
        };

        set((state) => ({
          inventory: [
            ...state.inventory.filter(
              Boolean
            ),
            newItem,
          ],
        }));

        return {
          success: true,
          item: newItem,
        };
      },

      /* ===================================================
         BULK ADD INVENTORY
      =================================================== */

      bulkAddInventoryItems: (
        items
      ) => {
        if (
          !Array.isArray(items) ||
          items.length === 0
        ) {
          return {
            added: 0,
          };
        }

        const inventory =
          Array.isArray(
            get().inventory
          )
            ? get().inventory.filter(
                Boolean
              )
            : [];

        let maxNum =
          inventory.reduce(
            (
              max,
              entry
            ) =>
              Math.max(
                max,
                safeNumber(
                  entry?.itemNumber,
                  0
                )
              ),
            0
          );

        const newItems =
          items
            .filter(
              (item) =>
                item &&
                typeof item ===
                  'object'
            )
            .map(
              (item) => {
          maxNum += 1;

          return {
            id: createId(),

                  itemNumber:
                    maxNum,

                  createdAt:
                    new Date().toISOString(),

                  name:
                    typeof item.name ===
                    'string'
                      ? item.name.trim()
                      : '',

                  basePrice:
                    safeNumber(
                      item.basePrice,
                      0
                    ),

                  category:
                    typeof item.category ===
                    'string'
                      ? item.category.trim()
                      : '',

                  variants:
                    Array.isArray(
                      item.variants
                    )
                      ? item.variants
                          .filter(
                            Boolean
                          )
                          .map(
                            (v) => ({
                              name: String(
                                v?.name ??
                                  ''
                              ).trim(),

                              price:
                                safeNumber(
                                  v?.price,
                                  0
                                ),
                            })
                          )
                      : [],

                  addons:
                    Array.isArray(
                      item.addons
                    )
                      ? item.addons
                          .filter(
                            Boolean
                          )
                          .map(
                            (a) => ({
                              name: String(
                                a?.name ??
                                  ''
                              ).trim(),

                              price:
                                safeNumber(
                                  a?.price,
                                  0
                                ),
                            })
                          )
                      : [],

                  enabled:
                    item.enabled !==
                    false,

                  isWeightBased:
                    Boolean(
                      item.isWeightBased
                    ),

                  isVariablePrice:
                    Boolean(
                      item.isVariablePrice
                    ),

                  unit:
                    normalizeUnit(
                      item.unit
                    ),
                };
              }
            );

        set((state) => ({
          inventory: [
            ...state.inventory.filter(
              Boolean
            ),
            ...newItems,
          ],
        }));

        return {
          added:
            newItems.length,
        };
      },

      /* ===================================================
         UPDATE INVENTORY ITEM
      =================================================== */

      updateInventoryItem: (
        id,
        updates
      ) => {
        set((state) => ({
          inventory:
            state.inventory
              .filter(Boolean)
              .map((entry) => {
                if (
                  entry.id !== id
                ) {
                  return entry;
                }

            return {
              ...entry,

                  name:
                    typeof updates?.name ===
                    'string'
                      ? updates.name.trim()
                      : entry.name,

              basePrice:
                    updates?.basePrice !==
                    undefined
                      ? safeNumber(
                          updates.basePrice,
                          0
                        )
                      : safeNumber(
                          entry.basePrice,
                          0
                        ),

              category:
                    typeof updates?.category ===
                    'string'
                      ? updates.category.trim()
                      : entry.category ||
                        '',

                  variants:
                    Array.isArray(
                      updates?.variants
                    )
                      ? updates.variants
                          .filter(
                            Boolean
                          )
                          .map(
                            (v) => ({
                              name: String(
                                v?.name ??
                                  ''
                              ).trim(),

                              price:
                                safeNumber(
                                  v?.price,
                                  0
                                ),
                            })
                          )
                      : Array.isArray(
                          entry.variants
                        )
                      ? entry.variants
                      : [],

                  addons:
                    Array.isArray(
                      updates?.addons
                    )
                      ? updates.addons
                          .filter(
                            Boolean
                          )
                          .map(
                            (a) => ({
                              name: String(
                                a?.name ??
                                  ''
                              ).trim(),

                              price:
                                safeNumber(
                                  a?.price,
                                  0
                                ),
                            })
                          )
                      : Array.isArray(
                          entry.addons
                        )
                      ? entry.addons
                      : [],

              enabled:
                    typeof updates?.enabled ===
                    'boolean'
                      ? updates.enabled
                      : entry.enabled !==
                        false,

              isWeightBased:
                    typeof updates?.isWeightBased ===
                    'boolean'
                  ? updates.isWeightBased
                      : Boolean(
                          entry.isWeightBased
                        ),

              isVariablePrice:
                    typeof updates?.isVariablePrice ===
                    'boolean'
                  ? updates.isVariablePrice
                      : Boolean(
                          entry.isVariablePrice
                        ),

              unit:
                    updates?.unit !==
                    undefined
                      ? normalizeUnit(
                          updates.unit
                        )
                      : normalizeUnit(
                          entry.unit
                        ),
            };
          }),
        }));
      },

      /* ===================================================
         ENABLE / DISABLE ITEM
      =================================================== */

      toggleInventoryItemEnabled: (
        id
      ) => {
        set((state) => ({
          inventory:
            state.inventory
              .filter(Boolean)
              .map((entry) => {
                if (
                  entry.id !== id
                ) {
                  return entry;
                }

                const currentlyEnabled =
                  entry.enabled !==
                  false;

                return {
                  ...entry,

                  enabled:
                    !currentlyEnabled,
                };
          }),
        }));
      },

      /* ===================================================
         REMOVE ITEM
      =================================================== */

      removeInventoryItem: (
        id
      ) => {
        set((state) => ({
          inventory:
            state.inventory
              .filter(Boolean)
              .filter(
                (item) =>
                  item.id !== id
              ),
        }));
      },

      /* ===================================================
         ADD TO CART
      =================================================== */

      addToCart: (
        item,
        selectedVariant = null,
        selectedAddons = [],
        quantity = 1,
        options = {}
      ) => {
        /*
          MAIN FIX FOR:
          Cannot read properties of null
          (reading 'basePrice')
        */

        if (
          !item ||
          typeof item !==
            'object'
        ) {
          console.warn(
            'addToCart: invalid item',
            item
          );

          return {
            success: false,
            error:
              'invalid_item',
          };
        }

        if (!item.id) {
          console.warn(
            'addToCart: item has no id',
            item
          );

          return {
            success: false,
            error:
              'invalid_item_id',
          };
        }

        const qty =
          safeNumber(
            quantity,
            0
          );

        if (
          !Number.isFinite(
            qty
          ) ||
          qty <= 0
        ) {
          return {
            success: false,
            error:
              'invalid_quantity',
          };
        }

        const safeVariant =
          selectedVariant &&
          typeof selectedVariant ===
            'object'
            ? selectedVariant
            : null;

        const safeAddons =
          Array.isArray(
            selectedAddons
          )
            ? selectedAddons.filter(
                (addon) =>
                  addon &&
                  typeof addon ===
                    'object'
              )
            : [];

        const priceOverride =
          options?.unitPrice !==
            undefined &&
          options?.unitPrice !==
            null &&
          options?.unitPrice !==
            ''
            ? options.unitPrice
            : null;

        const itemNote =
          typeof options?.note === 'string'
            ? options.note.trim()
            : '';

        const unitPrice =
          calculateItemPrice(
            item,
            safeVariant,
            safeAddons,
            priceOverride
          );

        const lineKey =
          cartLineKey(
            item.id,
            safeVariant,
            safeAddons,
            itemNote
          );

        const isWeightBased =
          Boolean(
            item.isWeightBased
          );

        const isVariablePrice =
          Boolean(
            item.isVariablePrice
          );

        const unit =
          normalizeUnit(
            item.unit
          );

        set((state) => {
          const safeCart =
            Array.isArray(
              state.cart
            )
              ? state.cart.filter(
                  Boolean
                )
              : [];

          const normalizedUnitPrice =
            safeNumber(unitPrice, 0);

          const existingIndex =
            safeCart.findIndex(
              (cartItem) => {
                if (
                  !cartItem ||
                  typeof cartItem !==
                    'object'
                ) {
                  return false;
                }

                const existingKey =
                  typeof cartItem.lineKey ===
                  'string'
                    ? cartItem.lineKey
                    : cartLineKey(
                        cartItem.itemId,
                        cartItem.selectedVariant,
                        cartItem.selectedAddons,
                        cartItem.note
                      );

                return (
                  existingKey ===
                    lineKey &&
                  safeNumber(
                    cartItem.unitPrice,
                    0
                  ) === normalizedUnitPrice
                );
              }
            );

          if (
            existingIndex ===
            -1
          ) {
            const cartItem = {
              id: createId(),

              lineKey,

              itemId:
                String(item.id),

              name:
                typeof item.name ===
                'string'
                  ? item.name
                  : 'Unnamed Item',

              selectedVariant:
                safeVariant,

              selectedAddons:
                safeAddons,

              quantity: qty,

              unitPrice:
                safeNumber(
              unitPrice,
                  0
                ),

              totalPrice:
                safeNumber(
                  unitPrice,
                  0
                ) * qty,

              isWeightBased,

              isVariablePrice,

              unit,

              note: itemNote,
            };

            return {
              cart: [
                ...safeCart,
                cartItem,
              ],
            };
          }

          const existing =
            safeCart[
              existingIndex
            ];

          if (!existing) {
            return {
              cart: safeCart,
            };
          }

          const nextQty =
            safeNumber(
              existing.quantity,
              0
            ) + qty;

          const updated = {
            ...existing,

            quantity:
              nextQty,

            totalPrice:
              safeNumber(
                existing.unitPrice,
                0
              ) * nextQty,

            isWeightBased:
              Boolean(
                existing.isWeightBased
              ) ||
              isWeightBased,

            isVariablePrice:
              Boolean(
                existing.isVariablePrice
              ) ||
              isVariablePrice,

            unit:
              existing.unit ||
              unit,
          };

          const nextCart =
            safeCart.slice();

          nextCart[
            existingIndex
          ] = updated;

          return {
            cart: nextCart,
          };
        });

        return {
          success: true,
        };
      },

      /* ===================================================
         REMOVE FROM CART
      =================================================== */

      removeFromCart: (
        cartItemId
      ) => {
        set((state) => ({
          cart:
            state.cart
              .filter(Boolean)
              .filter(
                (item) =>
                  item.id !==
                  cartItemId
              ),
        }));
      },

      /* ===================================================
         UPDATE CART QUANTITY
      =================================================== */

      updateCartItemQuantity: (
        cartItemId,
        quantity
      ) => {
        const qty =
          safeNumber(
            quantity,
            0
          );

        if (
          !Number.isFinite(
            qty
          ) ||
          qty <= 0
        ) {
          return;
        }

        set((state) => ({
          cart:
            state.cart
              .filter(Boolean)
              .map((item) =>
                item.id ===
                cartItemId
                  ? {
                      ...item,

                      quantity:
                        qty,

                      totalPrice:
                        safeNumber(
                          item.unitPrice,
                          0
                        ) * qty,
                    }
              : item
          ),
        }));
      },

      updateCartItemNote: (
        cartItemId,
        note = ''
      ) => {
        const nextNote =
          typeof note === 'string'
            ? note.trim()
            : '';

        set((state) => ({
          cart: state.cart
            .filter(Boolean)
            .map((item) =>
              item.id === cartItemId
                ? {
                    ...item,
                    note: nextNote,
                  }
                : item
            ),
        }));
      },

      /* ===================================================
         GET CART TOTAL
      =================================================== */

      getCartTotal: () => {
        return (
          Array.isArray(
            get().cart
          )
            ? get().cart
                .filter(Boolean)
                .reduce(
                  (
                    sum,
                    item
                  ) =>
                    sum +
                    safeNumber(
                      item?.totalPrice,
                      0
                    ),
                  0
                )
            : 0
        );
      },

      /* ===================================================
         SHOP SETTINGS
      =================================================== */

      updateShopSettings: ({
        shopName,
        fssaiNumber,
        gstinNumber,
        shopLogoUri,
        shopLogoStyle,
        upiQrUri,
        theme,
        language,
        showWhatsAppInvoiceButtons,
        enableTables,
        enableWeightBasedPricing,
        enableVariablePriceItems,
        enableDueOrders,
        shopOffer,
        menuListView,
        shopWebsite,
        menuWebsite,
        includeWebsitesInWhatsApp,
        apiUniqueKey,
        apiAppKey,
        apiSecretToken,
        apiClientToken,
      } = {}) => {
        const updates = {};

        if (
          typeof shopName ===
          'string'
        ) {
          updates.shopName =
            shopName.trim();
        }

        if (
          typeof fssaiNumber ===
          'string'
        ) {
          updates.fssaiNumber =
            fssaiNumber.trim();
        }

        if (
          typeof gstinNumber ===
          'string'
        ) {
          updates.gstinNumber =
            gstinNumber.trim();
        }

        if (
          typeof shopLogoUri ===
          'string'
        ) {
          updates.shopLogoUri =
            normalizeShopLogoUri(
              shopLogoUri
            );
        }

        if (
          typeof shopLogoStyle ===
          'string'
        ) {
          updates.shopLogoStyle =
            normalizeShopLogoStyle(
              shopLogoStyle
            );
        }

        if (
          typeof upiQrUri ===
          'string'
        ) {
          updates.upiQrUri =
            normalizeUpiQrUri(
              upiQrUri
            );
        }

        if (
          theme &&
          typeof theme ===
            'object'
        ) {
          updates.theme =
            resolveTheme(theme);
        }

        if (
          typeof language ===
          'string'
        ) {
          updates.language =
            language;
        }

        if (
          typeof showWhatsAppInvoiceButtons ===
          'boolean'
        ) {
          updates.showWhatsAppInvoiceButtons =
            showWhatsAppInvoiceButtons;
        }

        if (
          typeof enableTables ===
          'boolean'
        ) {
          updates.enableTables =
            enableTables;

          if (!enableTables) {
            updates.activeTableId =
              null;
          }
        }

        if (
          typeof enableWeightBasedPricing ===
          'boolean'
        ) {
          updates.enableWeightBasedPricing =
            enableWeightBasedPricing;
        }

        if (
          typeof enableVariablePriceItems ===
          'boolean'
        ) {
          updates.enableVariablePriceItems =
            enableVariablePriceItems;
        }

        if (
          typeof enableDueOrders ===
          'boolean'
        ) {
          updates.enableDueOrders =
            enableDueOrders;
        }

        if (
          shopOffer &&
          typeof shopOffer ===
            'object'
        ) {
          updates.shopOffer =
            normalizeShopOffer(
              shopOffer
            );
        }

        if (
          typeof menuListView ===
          'boolean'
        ) {
          updates.menuListView =
            menuListView;
        }

        if (
          typeof shopWebsite ===
          'string'
        ) {
          updates.shopWebsite =
            shopWebsite.trim();
        }

        if (
          typeof menuWebsite ===
          'string'
        ) {
          updates.menuWebsite =
            menuWebsite.trim();
        }

        if (
          typeof includeWebsitesInWhatsApp ===
          'boolean'
        ) {
          updates.includeWebsitesInWhatsApp =
            includeWebsitesInWhatsApp;
        }

        if (
          typeof apiUniqueKey ===
          'string'
        ) {
          updates.apiUniqueKey =
            normalizeAppUniqueKey(
              apiUniqueKey
            );
        }

        if (
          typeof apiAppKey ===
          'string'
        ) {
          updates.apiAppKey =
            normalizeAppKey(
              apiAppKey
            );
        }

        if (
          typeof apiSecretToken ===
          'string'
        ) {
          updates.apiSecretToken =
            normalizeSecretToken(
              apiSecretToken
            );
        }

        if (
          typeof apiClientToken ===
          'string'
        ) {
          updates.apiClientToken =
            normalizeClientToken(
              apiClientToken
            );
        }

        set(updates);
      },

      /* ===================================================
         MENU LIST
      =================================================== */

      setMenuListView: (
        menuListView
      ) => {
        set((state) => ({
          menuListView:
            typeof menuListView ===
            'function'
              ? Boolean(
                  menuListView(
                    state.menuListView
                  )
                )
              : Boolean(
                  menuListView
                ),
        }));
      },

      /* ===================================================
         APPEARANCE
      =================================================== */

      setAppearanceMode: (
        mode
      ) => {
        const appearanceMode =
          mode === 'dark'
            ? 'dark'
            : 'light';

        set({
          appearanceMode,

          tableBookerTheme:
            appearanceMode,
        });
      },

      setTableBookerTheme: (
        mode
      ) => {
        const appearanceMode =
          mode === 'dark'
            ? 'dark'
            : 'light';

        set({
          appearanceMode,

          tableBookerTheme:
            appearanceMode,
        });
      },

      /* ===================================================
         TABLE
      =================================================== */

      setActiveTable: (
        tableId = null
      ) => {
        const id = tableId
          ? String(tableId)
          : null;

        if (!id) {
          set({
            activeTableId:
              null,
          });

          return {
            success: true,
          };
        }

        const table =
          get().tables.find(
            (entry) =>
              entry.id === id
          );

        if (!table) {
          return {
            success: false,
            error:
              'not_found',
          };
        }

        if (
          table.status ===
            'occupied' &&
          table.currentOrderId
        ) {
          return {
            success: false,
            error:
              'occupied',
          };
        }

        set({
          activeTableId: id,
        });

        return {
          success: true,
        };
      },

      clearActiveTable: () =>
        set({
          activeTableId:
            null,
        }),

      resumeTableOrderForBilling: (
        tableId
      ) => {
        const id = tableId
          ? String(tableId)
          : '';

        const table =
          get().tables.find(
            (entry) =>
              entry.id === id
          );

        if (
          !table?.currentOrderId
        ) {
          return {
            success: false,
            error:
              'no_order',
          };
        }

        const order =
          get().history.find(
            (entry) =>
              entry &&
              (entry.id ===
                table.currentOrderId ||
                entry.orderId ===
                  table.currentOrderId)
          );

        if (!order) {
          return {
            success: false,
            error:
              'order_not_found',
          };
        }

        const cart =
          (
            Array.isArray(
              order.items
            )
              ? order.items
              : []
          )
            .map(
              normalizeLineItem
            )
            .filter(Boolean);

        if (
          cart.length === 0
        ) {
          return {
            success: false,
            error:
              'empty_items',
          };
        }

        set({
          activeTableId:
            id,

          cart,
        });

        return {
          success: true,
          order,
        };
      },

      /* ===================================================
         OCCUPY TABLE
      =================================================== */

      occupyTable: (
        tableId,
        guest = {}
      ) => {
        const id = tableId
          ? String(tableId)
          : '';

        const table =
          get().tables.find(
            (entry) =>
              entry.id === id
          );

        if (!table) {
          return {
            success: false,
            error:
              'not_found',
          };
        }

        if (
          table.currentOrderId
        ) {
          return {
            success: false,
            error:
              'has_order',
          };
        }

        const guestName =
          typeof guest.guestName ===
          'string'
            ? guest.guestName.trim()
            : '';

        const guestPhone =
          typeof guest.guestPhone ===
          'string'
            ? guest.guestPhone.trim()
            : '';

        const guestPartySize =
          Math.max(
            0,
            Math.floor(
              safeNumber(
                guest.guestPartySize,
                0
              )
            )
          );

        set((state) => ({
          tables:
            state.tables.map(
              (entry) =>
                entry.id === id
                  ? {
                      ...entry,

                      status:
                        'occupied',

                      currentOrderId:
                        null,

                      guestName:
                        guestName ||
                        entry.guestName ||
                        '',

                      guestPhone:
                        guestPhone ||
                        entry.guestPhone ||
                        '',

                      guestPartySize:
                        guestPartySize ||
                        entry.guestPartySize ||
                        0,
                    }
                  : entry
            ),
        }));

        return {
          success: true,
        };
      },

      /* ===================================================
         WAITLIST
      =================================================== */

      addWaitlistCustomer: ({
        name,
        phone,
        party,
      } = {}) => {
        const entry =
          createWaitlistEntry({
            name,
            phone,
            party,
          });

        if (!entry) {
          return {
            success: false,
            error:
              'invalid',
          };
        }

        set((state) => ({
          waitlist: [
            ...state.waitlist,
            entry,
          ],
        }));

        return {
          success: true,
          entry,
        };
      },

      removeWaitlistCustomer: (
        customerId
      ) => {
        const id = String(
          customerId || ''
        );

        if (!id) {
          return {
            success: false,
            error:
              'not_found',
          };
        }

        set((state) => ({
          waitlist:
            state.waitlist.filter(
              (entry) =>
                entry.id !== id
            ),
        }));

        return {
          success: true,
        };
      },

      seatWaitlistCustomer: (
        customerId,
        tableId
      ) => {
        const customer =
          get().waitlist.find(
            (entry) =>
              entry.id ===
              customerId
          );

        if (!customer) {
          return {
            success: false,
            error:
              'customer_not_found',
          };
        }

        const occupy =
          get().occupyTable(
            tableId,
            {
              guestName:
                customer.name,

              guestPhone:
                customer.phone,

              guestPartySize:
                customer.party,
            }
          );

        if (!occupy?.success) {
          return occupy;
        }

        get().removeWaitlistCustomer(
          customerId
        );

        const table =
          get().tables.find(
            (entry) =>
              entry.id ===
              tableId
          );

        return {
          success: true,
          table,
          customer,
        };
      },

      /* ===================================================
         ADD TABLE
      =================================================== */

      addTable: ({
        number,
        seatsType,
        capacity,
      } = {}) => {
        const cleanedNumber =
          String(
            number || ''
          )
            .trim()
            .toUpperCase();

        if (!cleanedNumber) {
          return {
            success: false,
            error:
              'number_required',
          };
        }

        const exists =
          get().tables.some(
            (entry) =>
              String(
                entry.number
              ).toUpperCase() ===
              cleanedNumber
          );

        if (exists) {
          return {
            success: false,
            error:
              'duplicate_number',
          };
        }

        const type =
          normalizeSeatsType(
            seatsType
          );

        if (
          type === 'customer'
        ) {
          const seats =
            Number(capacity);

          if (
            !Number.isFinite(
              seats
            ) ||
            seats < 1
          ) {
            return {
              success: false,
              error:
                'capacity_required',
            };
          }
        }

        const table =
          createTable({
            number:
              cleanedNumber,

            seatsType: type,

            capacity,
          });

        set((state) => ({
          tables: [
            ...state.tables,
            table,
          ],
        }));

        return {
          success: true,
          table,
        };
      },

      /* ===================================================
         REMOVE TABLE
      =================================================== */

      removeTable: (
        tableId
      ) => {
        const table =
          get().tables.find(
            (entry) =>
              entry.id === tableId
          );

        if (!table) {
          return {
            success: false,
            error:
              'not_found',
          };
        }

        if (
          table.status ===
            'occupied' ||
          table.currentOrderId
        ) {
          return {
            success: false,
            error:
              'occupied',
          };
        }

        set((state) => ({
          tables:
            state.tables.filter(
              (entry) =>
                entry.id !==
                tableId
            ),

          activeTableId:
            state.activeTableId ===
            tableId
              ? null
              : state.activeTableId,
        }));

        return {
          success: true,
        };
      },

      /* ===================================================
         UPDATE TABLE
      =================================================== */

      updateTable: (
        tableId,
        {
          number,
          seatsType,
          capacity,
          guestPhone,
          guestName,
        } = {}
      ) => {
        const table =
          get().tables.find(
            (entry) =>
              entry.id === tableId
          );

        if (!table) {
          return {
            success: false,
            error:
              'not_found',
          };
        }

        const nextNumber =
          typeof number ===
          'string'
            ? number
                .trim()
                .toUpperCase()
            : table.number;

        if (!nextNumber) {
          return {
            success: false,
            error:
              'number_required',
          };
        }

        const duplicate =
          get().tables.some(
            (entry) =>
              entry.id !==
                tableId &&
              String(
                entry.number
              ).toUpperCase() ===
                nextNumber
          );

        if (duplicate) {
          return {
            success: false,
            error:
              'duplicate_number',
          };
        }

        const nextSeatsType =
          seatsType !==
          undefined
            ? normalizeSeatsType(
                seatsType
              )
            : table.seatsType;

        const nextCapacity =
          nextSeatsType ===
          'customer'
            ? (() => {
                const seats =
                  Number(
                    capacity !==
                      undefined
                      ? capacity
                      : table.capacity
                  );

                if (
                  !Number.isFinite(
                    seats
                  ) ||
                  seats < 1
                ) {
                  return null;
                }

                return Math.min(
                  99,
                  Math.floor(
                    seats
                  )
                );
              })()
            : resolveTableCapacity(
                nextSeatsType
              );

        if (
          nextSeatsType ===
            'customer' &&
          nextCapacity ===
            null
        ) {
          return {
            success: false,
            error:
              'capacity_required',
          };
        }

        const nextGuestPhone =
          guestPhone !==
          undefined
            ? String(
                guestPhone ??
                  ''
              ).trim()
            : undefined;

        const nextGuestName =
          guestName !==
          undefined
            ? String(
                guestName ??
                  ''
              ).trim()
            : undefined;

        set((state) => ({
          tables:
            state.tables.map(
              (entry) =>
                entry.id === tableId
                  ? {
                      ...entry,

                      number:
                        nextNumber,

                      seatsType:
                        nextSeatsType,

                      capacity:
                        nextCapacity,

                      guestPhone:
                        nextGuestPhone !==
                        undefined
                          ? nextGuestPhone
                          : entry.guestPhone,

                      guestName:
                        nextGuestName !==
                        undefined
                          ? nextGuestName
                          : entry.guestName,
                    }
                  : entry
            ),

          history:
            state.history.map(
              (order) => {
                if (
                  order.tableId !==
                    tableId ||
                  order.isPaid
                ) {
                  return order;
                }

                const patched = {
                  ...order,

                  tableNumber:
                    nextNumber,

                  tableSeatsType:
                    nextSeatsType,
                };

                if (
                  nextGuestPhone !==
                  undefined
                ) {
                  patched.customerPhone =
                    nextGuestPhone;
                }

                return patched;
              }
            ),
        }));

        return {
          success: true,
        };
      },

      /* ===================================================
         FREE TABLE
      =================================================== */

      freeTable: (
        tableId
      ) => {
        set((state) => ({
          tables:
            state.tables.map(
              (entry) =>
                entry.id ===
                tableId
                  ? {
                      ...entry,

                      currentOrderId:
                        null,

                      status:
                        'available',

                      guestName:
                        '',

                      guestPhone:
                        '',

                      guestPartySize:
                        0,
                    }
                  : entry
            ),

          activeTableId:
            state.activeTableId ===
            tableId
              ? null
              : state.activeTableId,
        }));

        return {
          success: true,
        };
      },

      /* ===================================================
         CHECKOUT
      =================================================== */

      checkout: (
        customerPhone = '',
        {
          taxEnabled = false,
          isPaid = false,
          isDue = false,
          offerApplied = false,
          tableId = null,
          orderNote = '',
        } = {}
      ) => {
        const nextOrderNote =
          typeof orderNote === 'string'
            ? orderNote.trim()
            : '';
        const {
          cart,
          shopOffer,
          tables,
          activeTableId,
        } = get();

        const safeCart =
          Array.isArray(cart)
            ? cart
                .filter(Boolean)
                .map(
                  normalizeLineItem
                )
                .filter(Boolean)
            : [];

        if (
          safeCart.length === 0
        ) {
          return null;
        }

        const resolvedTableId =
          tableId ||
          activeTableId ||
          null;

        const table =
          resolvedTableId
            ? tables.find(
                (entry) =>
                  entry.id ===
                  resolvedTableId
              )
            : null;

        if (
          resolvedTableId &&
          !table
        ) {
          return null;
        }

        const cartSubtotal =
          safeCart.reduce(
            (
              sum,
              item
            ) =>
              sum +
              safeNumber(
                item.totalPrice,
                0
              ),
            0
          );

        if (
          table &&
          table.status ===
            'occupied' &&
          table.currentOrderId
        ) {
          const existingOrder =
            get().history.find(
              (entry) =>
                entry &&
                (entry.id ===
                  table.currentOrderId ||
                  entry.orderId ===
                    table.currentOrderId)
            );

          if (
            !existingOrder ||
            safeCart.length === 0
          ) {
            return null;
          }

          const bill =
            calculateBillTotals(
              cartSubtotal,
              {
                taxEnabled,

                shopOffer,

                offerApplied,
              }
            );

          const due =
            Boolean(isDue) &&
            !Boolean(isPaid);

          const paid =
            Boolean(isPaid) &&
            !due;

          const nextPhone =
            typeof customerPhone ===
            'string'
              ? customerPhone.trim()
              : existingOrder.customerPhone ||
                '';

          const updatedOrder = {
            ...existingOrder,

            items: [
              ...safeCart,
            ],

            cartSubtotal:
              bill.cartSubtotal,

            discountAmount:
              bill.discountAmount,

            offerApplied:
              bill.offerApplied,

            offerName:
              bill.offerName,

            subtotalAmount:
              bill.subtotal,

            taxEnabled,

            cgstAmount:
              bill.cgstAmount,

            sgstAmount:
              bill.sgstAmount,

            totalAmount:
              bill.total,

            itemCount:
              safeCart.reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  safeNumber(
                    item.quantity,
                    0
                  ),
                0
              ),

            customerPhone:
              nextPhone,

            orderNote:
              nextOrderNote ||
              existingOrder.orderNote ||
              '',

            isPaid: paid,

            isDue: due,

            isWrongOrder:
              existingOrder.isWrongOrder,
          };

          set((state) => ({
            history:
              state.history
                .filter(Boolean)
                .map(
                  (entry) =>
                    entry.id ===
                    existingOrder.id
                      ? updatedOrder
                      : entry
                ),

            cart: [],

            activeTableId:
              null,

            tables:
              state.tables.map(
                (entry) =>
                  entry.id ===
                  table.id
                    ? paid
                      ? {
                          ...entry,

                          currentOrderId:
                            null,

                          status:
                            'available',

                          guestName:
                            '',

                          guestPhone:
                            '',

                          guestPartySize:
                            0,
                        }
                      : {
                          ...entry,

                          currentOrderId:
                            updatedOrder.id,

                          status:
                            'occupied',

                          guestPhone:
                            nextPhone ||
                            entry.guestPhone ||
                            '',
                        }
                    : entry
              ),
          }));

          return updatedOrder;
        }

        const bill =
          calculateBillTotals(
            cartSubtotal,
            {
              taxEnabled,

              shopOffer,

              offerApplied,
            }
          );

        const nextSeq =
          safeNumber(
            get().orderSequence,
            0
          ) + 1;

        const due =
          Boolean(isDue) &&
          !Boolean(isPaid);

        const paid =
          Boolean(isPaid) &&
          !due;

        const order = {
          id: createId(),

          orderId:
            createOrderId(
              nextSeq
            ),

          items: [
            ...safeCart,
          ],

          cartSubtotal:
            bill.cartSubtotal,

          discountAmount:
            bill.discountAmount,

          offerApplied:
            bill.offerApplied,

          offerName:
            bill.offerName,

          subtotalAmount:
            bill.subtotal,

          taxEnabled,

          cgstAmount:
            bill.cgstAmount,

          sgstAmount:
            bill.sgstAmount,

          totalAmount:
            bill.total,

          itemCount:
            safeCart.reduce(
              (
                sum,
                item
              ) =>
                sum +
                safeNumber(
                  item.quantity,
                  0
                ),
              0
            ),

          timestamp:
            new Date().toISOString(),

          customerPhone:
            typeof customerPhone ===
            'string'
              ? customerPhone.trim()
              : '',

          orderNote: nextOrderNote,

          isPaid: paid,

          isDue: due,

          isWrongOrder:
            false,

          isOrderReady:
            false,

          isEdited:
            false,

          editedAt:
            null,

          isTableOrder:
            Boolean(table),

          tableId:
            table?.id ||
            null,

          tableNumber:
            table?.number ||
            '',

          tableSeatsType:
            table?.seatsType ||
            '',
        };

        set((state) => ({
          history: [
            order,
            ...state.history.filter(
              Boolean
            ),
          ],

          cart: [],

          orderSequence:
            nextSeq,

          activeTableId:
            null,

          tables: table
            ? state.tables.map(
                (entry) =>
                  entry.id ===
                  table.id
                    ? paid
                      ? {
                          ...entry,

                          currentOrderId:
                            null,

                          status:
                            'available',

                          guestName:
                            '',

                          guestPhone:
                            '',

                          guestPartySize:
                            0,
                        }
                      : {
                          ...entry,

                          currentOrderId:
                            order.id,

                          status:
                            'occupied',
                        }
                    : entry
              )
            : state.tables,
        }));

        return order;
      },

      /* ===================================================
         UPDATE ORDER PHONE
      =================================================== */

      updateOrderCustomerPhone: (
        orderKey,
        customerPhone = ''
      ) => {
        const nextPhone =
          String(
            customerPhone ??
              ''
          ).trim();

        set((state) => ({
          history:
            state.history
              .filter(Boolean)
              .map((order) => {
                const matches =
                  order.id ===
                    orderKey ||
                  order.orderId ===
                    orderKey;

                return matches
                  ? {
                      ...order,

                      customerPhone:
                        nextPhone,
                    }
                  : order;
          }),
        }));
      },

      /* ===================================================
         UPDATE ORDER ITEMS
      =================================================== */

      updateOrderItems: (
        orderKey,
        nextItems = [],
        {
          orderNote,
        } = {}
      ) => {
        const order =
          get().history.find(
            (entry) =>
              entry &&
              (entry.id ===
                orderKey ||
                entry.orderId ===
                  orderKey)
          );

        if (!order) {
          return {
            success: false,
            error:
              'not_found',
          };
        }

        if (order.isPaid) {
          return {
            success: false,
            error:
              'paid_locked',
          };
        }

        const items =
          (
            Array.isArray(
              nextItems
            )
              ? nextItems
              : []
          )
            .map(
              normalizeLineItem
            )
            .filter(Boolean)
            .filter(
              (line) =>
                safeNumber(
                  line.quantity,
                  0
                ) > 0
            )
            .map(
              (line) => ({
                ...line,

                totalPrice:
                  safeNumber(
                    line.unitPrice,
                    0
                  ) *
                  safeNumber(
                    line.quantity,
                    0
                  ),
              })
            );

        if (
          items.length === 0
        ) {
          return {
            success: false,
            error:
              'empty_items',
          };
        }

        const cartSubtotal =
          items.reduce(
            (
              sum,
              line
            ) =>
              sum +
              safeNumber(
                line.totalPrice,
                0
              ),
            0
          );

        const bill =
          calculateBillTotals(
            cartSubtotal,
            {
              taxEnabled:
                Boolean(
                  order.taxEnabled
                ),

              shopOffer:
                get().shopOffer,

              offerApplied:
                Boolean(
                  order.offerApplied
                ),
            }
          );

        set((state) => ({
          history:
            state.history
              .filter(Boolean)
              .map(
                (entry) => {
                  const matches =
                    entry.id ===
                      orderKey ||
                    entry.orderId ===
                      orderKey;

                  if (!matches) {
                    return entry;
                  }

                  return {
                    ...entry,

                    items,

                    cartSubtotal:
                      bill.cartSubtotal,

                    discountAmount:
                      bill.discountAmount,

                    offerApplied:
                      bill.offerApplied,

                    offerName:
                      bill.offerApplied
                        ? bill.offerName
                        : entry.offerName ||
                          '',

                    subtotalAmount:
                      bill.subtotal,

                    cgstAmount:
                      bill.cgstAmount,

                    sgstAmount:
                      bill.sgstAmount,

                    totalAmount:
                      bill.total,

                    itemCount:
                      items.reduce(
                        (
                          sum,
                          line
                        ) =>
                          sum +
                          safeNumber(
                            line.quantity,
                            0
                          ),
                        0
                      ),

                    orderNote:
                      orderNote !== undefined
                        ? String(orderNote || '').trim()
                        : entry.orderNote || '',

                    isEdited:
                      true,

                    editedAt:
                      new Date().toISOString(),
                  };
                }
              ),
        }));

        return {
          success: true,
        };
      },

      /* ===================================================
         PAID
      =================================================== */

      toggleOrderPaid: (
        orderKey
      ) => {
        const order =
          get().history.find(
            (entry) =>
              entry &&
              (entry.id ===
                orderKey ||
                entry.orderId ===
                  orderKey)
          );

        if (
          order?.isPaid
        ) {
          return {
            success: false,
            error:
              'paid_locked',
          };
        }

        if (
          order?.isWrongOrder
        ) {
          return {
            success: false,
            error:
              'wrong_locked',
          };
        }

        set((state) => ({
          history:
            state.history
              .filter(Boolean)
              .map(
                (entry) => {
                  const matches =
                    entry.id ===
                      orderKey ||
                    entry.orderId ===
                      orderKey;

                  return matches
                    ? {
                        ...entry,

                        isPaid:
                          true,

                        isDue:
                          false,
                      }
                    : entry;
                }
              ),

          tables:
            state.tables.map(
              (table) => {
                const linked =
                  (order?.tableId &&
                    table.id ===
                      order.tableId) ||
                  (order?.id &&
                    table.currentOrderId ===
                      order.id);

                if (!linked) {
                  return table;
                }

                return {
                  ...table,

                  currentOrderId:
                    null,

                  status:
                    'available',

                  guestName:
                    '',

                  guestPhone:
                    '',

                  guestPartySize:
                    0,
                };
              }
            ),
        }));

        return {
          success: true,
        };
      },

      /* ===================================================
         WRONG ORDER
      =================================================== */

      markOrderWrong: (
        orderKey,
        nextValue = true
      ) => {
        const order =
          get().history.find(
            (entry) =>
              entry &&
              (entry.id ===
                orderKey ||
                entry.orderId ===
                  orderKey)
          );

        if (!order) {
          return {
            success: false,
            error:
              'not_found',
          };
        }

        if (order.isPaid) {
          return {
            success: false,
            error:
              'paid_locked',
          };
        }

        const isWrong =
          Boolean(nextValue);

        set((state) => ({
          history:
            state.history
              .filter(Boolean)
              .map(
                (entry) => {
                  const matches =
                    entry.id ===
                      orderKey ||
                    entry.orderId ===
                      orderKey;

                  return matches
                    ? {
                        ...entry,
                        isWrongOrder:
                          isWrong,
                      }
                    : entry;
                }
              ),

          tables: isWrong
            ? state.tables.map(
                (table) => {
                  const linked =
                    (order.tableId &&
                      table.id ===
                        order.tableId) ||
                    (order.id &&
                      table.currentOrderId ===
                        order.id);

                  if (!linked) {
                    return table;
                  }

                  return {
                    ...table,
                    currentOrderId:
                      null,
                    status:
                      'available',
                    guestName:
                      '',
                    guestPhone:
                      '',
                    guestPartySize:
                      0,
                  };
                }
              )
            : state.tables,
        }));

        return {
          success: true,
        };
      },

      /* ===================================================
         READY
      =================================================== */

      markOrderReady: (
        orderKey
      ) => {
        set((state) => ({
          history:
            state.history
              .filter(Boolean)
              .map(
                (entry) => {
                  const matches =
                    entry.id ===
                      orderKey ||
                    entry.orderId ===
                      orderKey;

                  return matches
                    ? {
                        ...entry,

                        isOrderReady:
                          true,
                      }
                    : entry;
                }
              ),
        }));

        return {
          success: true,
        };
      },

      /* ===================================================
         CLEAR CART
      =================================================== */

      clearCart: () =>
        set({
          cart: [],
        }),

      /* ===================================================
         SYNC SNAPSHOT
      =================================================== */

      applySyncSnapshot: (
        snapshot
      ) => {
        if (
          !snapshot ||
          typeof snapshot !==
            'object'
        ) {
          return {
            success: false,
          };
        }

        const history =
          Array.isArray(
            snapshot.history
          )
            ? snapshot.history
                .filter(Boolean)
                .map(
                  normalizeOrder
                )
                .filter(Boolean)
            : get().history;

        const tables =
          syncTablesWithHistory(
            Array.isArray(
              snapshot.tables
            )
              ? snapshot.tables
              : get().tables,

            history
          );

        const updates = {
          tables,

          history,

          orderSequence:
            snapshot.orderSequence !==
            undefined
              ? safeNumber(
                  snapshot.orderSequence,
                  0
                )
              : get()
                  .orderSequence,
        };

        if (
          Array.isArray(
            snapshot.inventory
          )
        ) {
          updates.inventory =
            assignItemNumbers(
              snapshot.inventory
                .filter(Boolean)
                .map(
                  (
                    item,
                    index
                  ) =>
                    normalizeInventoryItem(
                      item,
                      index
                    )
                )
            );
        }

        if (
          typeof snapshot.shopName ===
          'string'
        ) {
          updates.shopName =
            snapshot.shopName;
        }

        if (
          typeof snapshot.fssaiNumber ===
          'string'
        ) {
          updates.fssaiNumber =
            snapshot.fssaiNumber;
        }

        if (
          typeof snapshot.gstinNumber ===
          'string'
        ) {
          updates.gstinNumber =
            snapshot.gstinNumber;
        }

        if (
          snapshot.shopOffer &&
          typeof snapshot.shopOffer ===
            'object'
        ) {
          updates.shopOffer =
            normalizeShopOffer(
              snapshot.shopOffer
            );
        }

        if (
          typeof snapshot.enableWeightBasedPricing ===
          'boolean'
        ) {
          updates.enableWeightBasedPricing =
            snapshot.enableWeightBasedPricing;
        }

        if (
          typeof snapshot.enableVariablePriceItems ===
          'boolean'
        ) {
          updates.enableVariablePriceItems =
            snapshot.enableVariablePriceItems;
        }

        if (
          typeof snapshot.enableDueOrders ===
          'boolean'
        ) {
          updates.enableDueOrders =
            snapshot.enableDueOrders;
        }

        if (
          typeof snapshot.menuListView ===
          'boolean'
        ) {
          updates.menuListView =
            snapshot.menuListView;
        }

        if (
          typeof snapshot.showWhatsAppInvoiceButtons ===
          'boolean'
        ) {
          updates.showWhatsAppInvoiceButtons =
            snapshot.showWhatsAppInvoiceButtons;
        }

        if (
          typeof snapshot.enableTables ===
          'boolean'
        ) {
          updates.enableTables =
            snapshot.enableTables;

          if (
            !snapshot.enableTables
          ) {
            updates.activeTableId =
              null;
          }
        }

        set(updates);

        return {
          success: true,
        };
      },

      /* ===================================================
         IMPORT BACKUP
      =================================================== */

      importBackupData: (
        data
      ) => {
        if (
          !data ||
          typeof data !==
            'object'
        ) {
          return {
            success: false,
          };
        }

        const history =
          Array.isArray(
            data.history
          )
            ? data.history
                .filter(Boolean)
                .map(
                  normalizeOrder
                )
                .filter(Boolean)
            : [];

        const inventory =
          Array.isArray(
            data.inventory
          )
            ? assignItemNumbers(
                data.inventory
                  .filter(Boolean)
                  .map(
                    (
                      item,
                      index
                    ) =>
                      normalizeInventoryItem(
                        item,
                        index
                      )
                  )
              )
            : [];

        set({
          shopName:
            typeof data.shopName ===
            'string'
              ? data.shopName.trim()
              : '',

          fssaiNumber:
            typeof data.fssaiNumber ===
            'string'
              ? data.fssaiNumber.trim()
              : '',

          gstinNumber:
            typeof data.gstinNumber ===
            'string'
              ? data.gstinNumber.trim()
              : '',

          shopLogoUri:
            normalizeShopLogoUri(
              data.shopLogoUri
            ),

          shopLogoStyle:
            normalizeShopLogoStyle(
              data.shopLogoStyle
            ),

          upiQrUri:
            normalizeUpiQrUri(
              data.upiQrUri
            ),

          theme:
            resolveTheme(
              data.theme
            ),

          language:
            typeof data.language ===
            'string'
              ? data.language
              : 'en',

          showWhatsAppInvoiceButtons:
            data.showWhatsAppInvoiceButtons !==
            false,

          enableTables:
            data.enableTables !==
            false,

          enableWeightBasedPricing:
            Boolean(
              data.enableWeightBasedPricing
            ),

          enableVariablePriceItems:
            Boolean(
              data.enableVariablePriceItems
            ),

          enableDueOrders:
            Boolean(data.enableDueOrders),

          shopOffer:
            normalizeShopOffer(
              data.shopOffer
            ),

          menuListView:
            Boolean(
              data.menuListView
            ),

          appearanceMode:
            data.appearanceMode ===
            'dark'
              ? 'dark'
              : 'light',

          tableBookerTheme:
            data.appearanceMode ===
            'dark'
              ? 'dark'
              : 'light',

          shopWebsite:
            typeof data.shopWebsite ===
            'string'
              ? data.shopWebsite.trim()
              : '',

          menuWebsite:
            typeof data.menuWebsite ===
            'string'
              ? data.menuWebsite.trim()
              : '',

          includeWebsitesInWhatsApp:
            Boolean(
              data.includeWebsitesInWhatsApp
            ),

          apiUniqueKey:
            normalizeAppUniqueKey(
              data.apiUniqueKey
            ),

          apiAppKey:
            normalizeAppKey(
              data.apiAppKey
            ),

          apiSecretToken:
            normalizeSecretToken(
              data.apiSecretToken
            ),

          apiClientToken:
            normalizeClientToken(
              data.apiClientToken
            ),

          orderSequence:
            safeNumber(
              data.orderSequence,
              0
            ),

          inventory,

          history,

          tables:
            syncTablesWithHistory(
              Array.isArray(
                data.tables
              )
                ? data.tables
                : createDefaultTables(),

              history
            ),

          activeTableId:
            null,

          waitlist:
            normalizeWaitlist(
              data.waitlist
            ),

          cart: [],
        });

        return {
          success: true,
        };
      },

      /* ===================================================
         RESET STORAGE
      =================================================== */

      resetStorage: () => {
        set({
          inventory: [],

          cart: [],

          history: [],

          orderSequence: 0,

          tables:
            createDefaultTables(),

          activeTableId:
            null,

          waitlist: [],

          shopName: '',

          fssaiNumber: '',

          gstinNumber: '',

          shopLogoUri: '',

          shopLogoStyle:
            'normal',

          upiQrUri: '',

          theme: {
            ...DEFAULT_THEME,
          },

          language: 'en',

          showWhatsAppInvoiceButtons:
            true,

          enableTables: true,

          enableWeightBasedPricing:
            false,

          enableVariablePriceItems:
            false,

          enableDueOrders:
            false,

          shopOffer: {
            ...DEFAULT_SHOP_OFFER,
          },

          menuListView:
            false,

          appearanceMode:
            'light',

          tableBookerTheme:
            'light',

          shopWebsite: '',

          menuWebsite: '',

          includeWebsitesInWhatsApp:
            false,

          apiUniqueKey: '',

          apiAppKey: '',

          apiSecretToken: '',

          apiClientToken: '',

          licenseKey: '',

          licenseExpiry: null,

          loginSessionId: '',

          isAuthenticated:
            false,

          forceUpdateRequired: false,

          forceUpdateInfo: null,
        });
      },
    }),

    /* =====================================================
       PERSIST
    ===================================================== */

    {
      name: 'pos-storage',

      storage:
        createJSONStorage(
          () => debouncedPersistStorage
        ),

      partialize: (state) => ({
        inventory:
          Array.isArray(
            state.inventory
          )
            ? state.inventory
                .filter(Boolean)
            : [],

        history:
          Array.isArray(
            state.history
          )
            ? state.history
                .filter(Boolean)
            : [],

        orderSequence:
          state.orderSequence,

        tables:
          state.tables,

        waitlist:
          state.waitlist,

        shopName:
          state.shopName,

        fssaiNumber:
          state.fssaiNumber,

        gstinNumber:
          state.gstinNumber,

        shopLogoUri:
          state.shopLogoUri,

        shopLogoStyle:
          state.shopLogoStyle,

        upiQrUri:
          state.upiQrUri,

        theme:
          state.theme,

        language:
          state.language,

        showWhatsAppInvoiceButtons:
          state.showWhatsAppInvoiceButtons,

        enableTables:
          state.enableTables !==
          false,

        enableWeightBasedPricing:
          state.enableWeightBasedPricing,

        enableVariablePriceItems:
          state.enableVariablePriceItems,

        enableDueOrders:
          state.enableDueOrders,

        shopOffer:
          state.shopOffer,

        menuListView:
          state.menuListView,

        appearanceMode:
          state.appearanceMode ===
          'dark'
            ? 'dark'
            : 'light',

        tableBookerTheme:
          state.appearanceMode ===
          'dark'
            ? 'dark'
            : 'light',

        shopWebsite:
          state.shopWebsite,

        menuWebsite:
          state.menuWebsite,

        includeWebsitesInWhatsApp:
          state.includeWebsitesInWhatsApp,

        apiUniqueKey:
          state.apiUniqueKey,

        apiAppKey:
          state.apiAppKey,

        apiSecretToken:
          state.apiSecretToken,

        apiClientToken:
          state.apiClientToken,

        licenseKey:
          state.licenseKey,

        licenseExpiry:
          state.licenseExpiry,

        loginSessionId:
          state.loginSessionId || '',

        isAuthenticated:
          state.isAuthenticated,
      }),

      /* ===================================================
         MERGE SAVED DATA
      =================================================== */

      merge: (
        persistedState,
        currentState
      ) => {
        try {
          const saved =
            persistedState &&
            typeof persistedState ===
              'object'
              ? persistedState
              : {};

          const savedHistory =
            Array.isArray(
              saved.history
            )
              ? saved.history
                  .filter(Boolean)
                  .map(
                    normalizeOrder
                  )
                  .filter(Boolean)
              : [];

          const savedInventory =
            Array.isArray(
              saved.inventory
            )
              ? assignItemNumbers(
                  saved.inventory
                    .filter(Boolean)
                    .map(
                      (
                        item,
                        index
                      ) =>
                        normalizeInventoryItem(
                          item,
                          index
                        )
                    )
                )
              : [];

          return {
            ...currentState,

            shopName:
              typeof saved.shopName ===
              'string'
                ? saved.shopName
                : '',

            fssaiNumber:
              typeof saved.fssaiNumber ===
              'string'
                ? saved.fssaiNumber
                : '',

            gstinNumber:
              typeof saved.gstinNumber ===
              'string'
                ? saved.gstinNumber
                : '',

            shopLogoUri:
              normalizeShopLogoUri(
                saved.shopLogoUri
              ),

            shopLogoStyle:
              normalizeShopLogoStyle(
                saved.shopLogoStyle
              ),

            upiQrUri:
              normalizeUpiQrUri(
                saved.upiQrUri
              ),

            theme:
              resolveTheme(
                saved.theme
              ),

            language:
              typeof saved.language ===
              'string'
                ? saved.language
                : 'en',

            showWhatsAppInvoiceButtons:
              saved.showWhatsAppInvoiceButtons !==
              undefined
                ? Boolean(
                    saved.showWhatsAppInvoiceButtons
                  )
                : true,

            enableTables:
              saved.enableTables !==
              false,

            enableWeightBasedPricing:
              Boolean(
                saved.enableWeightBasedPricing
              ),

            enableVariablePriceItems:
              Boolean(
                saved.enableVariablePriceItems
              ),

            enableDueOrders:
              Boolean(saved.enableDueOrders),

            shopOffer:
              normalizeShopOffer(
                saved.shopOffer
              ),

            menuListView:
              Boolean(
                saved.menuListView
              ),

            appearanceMode:
              saved.appearanceMode ===
                'dark' ||
              saved.tableBookerTheme ===
                'dark'
                ? 'dark'
                : 'light',

            tableBookerTheme:
              saved.appearanceMode ===
                'dark' ||
              saved.tableBookerTheme ===
                'dark'
                ? 'dark'
                : 'light',

            shopWebsite:
              typeof saved.shopWebsite ===
              'string'
                ? saved.shopWebsite.trim()
                : '',

            menuWebsite:
              typeof saved.menuWebsite ===
              'string'
                ? saved.menuWebsite.trim()
                : '',

            includeWebsitesInWhatsApp:
              Boolean(
                saved.includeWebsitesInWhatsApp
              ),

            apiUniqueKey:
              normalizeAppUniqueKey(
                saved.apiUniqueKey
              ),

            apiAppKey:
              normalizeAppKey(
                saved.apiAppKey
              ),

            apiSecretToken:
              normalizeSecretToken(
                saved.apiSecretToken
              ),

            apiClientToken:
              normalizeClientToken(
                saved.apiClientToken
              ),

            licenseKey:
              typeof saved.licenseKey ===
              'string'
                ? saved.licenseKey
                : '',

            licenseExpiry:
              saved.licenseExpiry ??
              null,

            loginSessionId:
              typeof saved.loginSessionId ===
              'string'
                ? saved.loginSessionId
                : '',

            isAuthenticated:
              Boolean(
                saved.isAuthenticated
              ),

            orderSequence:
              safeNumber(
                saved.orderSequence,
                0
              ),

            inventory:
              savedInventory,

            history:
              savedHistory,

            tables:
              syncTablesWithHistory(
                normalizeTables(
                  saved.tables
                ),
                savedHistory
              ),

            waitlist:
              normalizeWaitlist(
                saved.waitlist
              ),

            activeTableId:
              null,

            /*
              Cart is deliberately cleared
              on app restart.
            */
            cart: [],
          };
        } catch (error) {
          console.error(
            'Failed to merge saved data:',
            error
          );

          return currentState;
        }
      },

      /* ===================================================
         REHYDRATION
      =================================================== */

      onRehydrateStorage:
        () =>
        (
          state,
          error
        ) => {
        if (error) {
            console.error(
              'Failed to restore saved data:',
              error
            );
        }
      },
    }
  )
);

export function flushPersistedStore() {
  return debouncedPersistStorage.flushPending();
}

export default useStore;