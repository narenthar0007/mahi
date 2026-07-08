import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { shareOrderInvoicePdf, shareWhatsAppInvoiceText } from '../utils/invoiceExport';
import { isValidCustomerPhone } from '../utils/billShare';
import { showAlert } from '../utils/alert';
import useStore from '../store/store';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { UI } from '../utils/uiTheme';

export default function ShareBillButtons({
  items,
  totalAmount,
  subtotalAmount,
  cartSubtotal,
  discountAmount = 0,
  offerApplied = false,
  offerName = '',
  taxEnabled = false,
  cgstAmount = 0,
  sgstAmount = 0,
  timestamp,
  orderId,
  title = 'POS Bill',
  compact = false,
  customerPhone = '',
}) {
  const { t } = useTranslation();
  const showWhatsAppInvoiceButtons = useStore((s) => s.showWhatsAppInvoiceButtons);
  const shopName = useStore((s) => s.shopName);
  const fssaiNumber = useStore((s) => s.fssaiNumber);
  const gstinNumber = useStore((s) => s.gstinNumber);
  const theme = useAppTheme();
  const [sharingInvoice, setSharingInvoice] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);

  if (showWhatsAppInvoiceButtons === false) {
    return null;
  }

  const invoicePayload = {
    items,
    totalAmount,
    subtotalAmount,
    cartSubtotal,
    discountAmount,
    offerApplied,
    offerName,
    taxEnabled,
    cgstAmount,
    sgstAmount,
    timestamp,
    orderId,
    shopName,
    fssaiNumber,
    gstinNumber,
    customerPhone,
    title: 'Tax Invoice',
  };

  const handleShareWhatsAppBill = async () => {
    if (sharingWhatsApp) return;

    if (!isValidCustomerPhone(customerPhone)) {
      showAlert(t('noWhatsAppNumber'), t('noWhatsAppNumberMsg'));
      return;
    }

    setSharingWhatsApp(true);
    try {
      await shareWhatsAppInvoiceText(invoicePayload);
    } catch (error) {
      console.error('WhatsApp bill failed:', error);
      showAlert(t('whatsAppFailed'), t('whatsAppFailedMsg'));
    } finally {
      setSharingWhatsApp(false);
    }
  };

  const handleSharePdfInvoice = async () => {
    if (sharingInvoice) return;

    setSharingInvoice(true);
    try {
      const result = await shareOrderInvoicePdf({
        ...invoicePayload,
        openWhatsAppChat: false,
        sharePdf: true,
      });

      if (!result.pdfShared) {
        showAlert(t('invoiceFailed'), t('invoiceFailedMsg'));
      }
    } catch (error) {
      console.error('PDF invoice share failed:', error);
      showAlert(t('invoiceFailed'), t('invoiceFailedMsg'));
    } finally {
      setSharingInvoice(false);
    }
  };

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <TouchableOpacity
        style={[
          styles.whatsAppBtn,
          { borderColor: theme.buttonColor },
          sharingWhatsApp && styles.btnDisabled,
        ]}
        onPress={handleShareWhatsAppBill}
        disabled={sharingWhatsApp}
      >
        {sharingWhatsApp ? (
          <ActivityIndicator color={theme.buttonColor} size="small" />
        ) : (
          <Text style={[styles.whatsAppBtnText, { color: theme.buttonColor }]}>
            {t('sendWhatsAppBill')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.invoiceBtn,
          { backgroundColor: theme.headerColor },
          sharingInvoice && styles.btnDisabled,
        ]}
        onPress={handleSharePdfInvoice}
        disabled={sharingInvoice}
      >
        {sharingInvoice ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.invoiceBtnText}>{t('sharePdfInvoice')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    gap: 8,
  },
  wrapperCompact: {
    marginTop: 8,
  },
  whatsAppBtn: {
    backgroundColor: UI.surface,
    borderRadius: UI.radiusMd,
    borderWidth: 1,
    borderColor: UI.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  whatsAppBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceBtn: {
    backgroundColor: '#111827',
    borderRadius: UI.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  invoiceBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
