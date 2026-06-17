import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { sendViaMessage, sendViaWhatsApp, formatBillText } from '../utils/billShare';
import useStore from '../store/store';

export default function ShareBillButtons({
  items,
  totalAmount,
  timestamp,
  orderId,
  title = 'POS Bill',
  compact = false,
  customerPhone = '',
  disabled = false,
}) {
  const shopName = useStore((s) => s.shopName);

  const billText = formatBillText({
    items,
    totalAmount,
    timestamp,
    orderId,
    title,
    shopName,
  });

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <TouchableOpacity
        style={[styles.btn, styles.whatsappBtn, disabled && styles.btnDisabled]}
        onPress={() => sendViaWhatsApp(billText, customerPhone)}
        disabled={disabled}
      >
        <Text style={[styles.btnText, disabled && styles.btnTextDisabled]}>WhatsApp</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.messageBtn, disabled && styles.btnDisabled]}
        onPress={() => sendViaMessage(billText, customerPhone)}
        disabled={disabled}
      >
        <Text style={[styles.btnText, disabled && styles.btnTextDisabled]}>Message</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  rowCompact: {
    marginTop: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    minHeight: 42,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  messageBtn: {
    backgroundColor: '#228be6',
  },
  btnDisabled: {
    backgroundColor: '#ced4da',
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnTextDisabled: {
    color: '#6c757d',
  },
});
