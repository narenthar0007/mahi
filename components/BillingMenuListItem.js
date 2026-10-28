import React, { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import useStore from '../store/store';
import { formatCurrency } from '../utils/currency';

function getMenuItemHighlight(item) {
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
}

function BillingMenuListItem({
  item,
  menuListView,
  onPress,
  theme,
  styles,
  t,
  formatItemMetaLine,
}) {
  const itemId = String(item.id);

  const cartQty = useStore(
    useCallback(
      (state) => {
        const cart = state.cart;
        if (!Array.isArray(cart) || cart.length === 0) {
          return 0;
        }

        let sum = 0;
        for (let i = 0; i < cart.length; i += 1) {
          const line = cart[i];
          if (line && String(line.itemId) === itemId) {
            sum += Number(line.quantity) || 0;
          }
        }
        return sum;
      },
      [itemId]
    )
  );

  const highlight = getMenuItemHighlight(item);
  const inCart = cartQty > 0;
  const priceLabel = item.isVariablePrice
    ? t('variablePriceShort')
    : `${formatCurrency(item.basePrice ?? 0)}${
        item.isWeightBased && item.unit ? `/${item.unit}` : ''
      }`;

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

  const handlePress = () => onPress(item);

  if (menuListView) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.menuRowItem,
          highlight && styles.menuRowItemHighlight,
          inCart && styles.menuRowItemInCart,
          pressed && styles.menuRowItemPressed,
        ]}
        onPress={handlePress}
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
      onPress={handlePress}
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
        <Text style={[styles.menuPrice, { color: theme.buttonColor }]}>{priceLabel}</Text>
      </View>
    </Pressable>
  );
}

export default memo(BillingMenuListItem);
