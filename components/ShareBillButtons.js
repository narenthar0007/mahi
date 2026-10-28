import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import {
  shareOrderInvoicePdf,
  shareWhatsAppInvoiceText,
} from '../utils/invoiceExport';

import { isValidCustomerPhone } from '../utils/billShare';
import { showAlert } from '../utils/alert';
import useStore from '../store/store';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { useThemedStyles } from '../utils/uiTheme';

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
  isTableOrder = false,
  tableNumber = '',
  isPaid = false,
  orderNote = '',
}) {
  const { ui, styles } =
    useThemedStyles(createStyles);

  const { t } = useTranslation();

  const showWhatsAppInvoiceButtons =
    useStore(
      (s) => s.showWhatsAppInvoiceButtons
    );

  const shopName = useStore(
    (s) => s.shopName
  );

  const fssaiNumber = useStore(
    (s) => s.fssaiNumber
  );

  const gstinNumber = useStore(
    (s) => s.gstinNumber
  );

  const shopWebsite = useStore(
    (s) => s.shopWebsite
  );

  const menuWebsite = useStore(
    (s) => s.menuWebsite
  );

  const includeWebsitesInWhatsApp =
    useStore(
      (s) =>
        s.includeWebsitesInWhatsApp
    );

  const upiQrUri = useStore(
    (s) => s.upiQrUri
  );

  const theme = useAppTheme();

  const [sharingInvoice, setSharingInvoice] =
    useState(false);

  const [
    sharingWhatsApp,
    setSharingWhatsApp,
  ] = useState(false);

  /*
   * Don't render anything when WhatsApp
   * invoice buttons are disabled.
   */
  if (
    showWhatsAppInvoiceButtons === false
  ) {
    return null;
  }

  /*
   * Keep the payload stable unless one of
   * its actual values changes.
   */
  const invoicePayload = useMemo(
    () => ({
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
      shopWebsite,
      menuWebsite,
      includeWebsitesInWhatsApp,
      upiQrUri,
      title: 'Tax Invoice',
      isTableOrder,
      tableNumber,
      isPaid,
      orderNote,
    }),
    [
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
      shopWebsite,
      menuWebsite,
      includeWebsitesInWhatsApp,
      upiQrUri,
      isTableOrder,
      tableNumber,
      isPaid,
      orderNote,
    ]
  );

  /*
   * Share WhatsApp invoice.
   */
  const handleShareWhatsAppBill =
    useCallback(async () => {
      if (sharingWhatsApp) {
        return;
      }

      if (
        !isValidCustomerPhone(
          customerPhone
        )
      ) {
        showAlert(
          t('noWhatsAppNumber'),
          t('noWhatsAppNumberMsg')
        );
        return;
      }

      setSharingWhatsApp(true);

      try {
        await shareWhatsAppInvoiceText(
          invoicePayload
        );
      } catch (error) {
        console.error(
          'WhatsApp bill failed:',
          error
        );

        showAlert(
          t('whatsAppFailed'),
          t('whatsAppFailedMsg')
        );
      } finally {
        setSharingWhatsApp(false);
      }
    }, [
      sharingWhatsApp,
      customerPhone,
      t,
      invoicePayload,
    ]);

  /*
   * Share PDF invoice.
   */
  const handleSharePdfInvoice =
    useCallback(async () => {
      if (sharingInvoice) {
        return;
      }

      setSharingInvoice(true);

      try {
        const result =
          await shareOrderInvoicePdf({
            ...invoicePayload,
            openWhatsAppChat: false,
            sharePdf: true,
          });

        if (!result?.pdfShared) {
          showAlert(
            t('invoiceFailed'),
            t('invoiceFailedMsg')
          );
        }
      } catch (error) {
        console.error(
          'PDF invoice share failed:',
          error
        );

        showAlert(
          t('invoiceFailed'),
          t('invoiceFailedMsg')
        );
      } finally {
        setSharingInvoice(false);
      }
    }, [
      sharingInvoice,
      invoicePayload,
      t,
    ]);

  return (
    <View
      style={[
        styles.wrapper,
        compact &&
          styles.wrapperCompact,
      ]}
    >
      {/* WhatsApp Button */}
      <TouchableOpacity
        style={[
          styles.whatsAppBtn,
          sharingWhatsApp &&
            styles.btnDisabled,
        ]}
        onPress={
          handleShareWhatsAppBill
        }
        disabled={sharingWhatsApp}
        activeOpacity={0.8}
      >
        {sharingWhatsApp ? (
          <ActivityIndicator
            color={ui.brandWhatsApp}
            size="small"
          />
        ) : (
          <Text
            style={[
              styles.whatsAppBtnText,
            ]}
          >
            {t('sendWhatsAppBill')}
          </Text>
        )}
      </TouchableOpacity>

      {/* PDF Invoice Button */}
      <TouchableOpacity
        style={[
          styles.invoiceBtn,
          {
            backgroundColor:
              theme.buttonColor,
          },
          sharingInvoice &&
            styles.btnDisabled,
        ]}
        onPress={
          handleSharePdfInvoice
        }
        disabled={sharingInvoice}
        activeOpacity={0.8}
      >
        {sharingInvoice ? (
          <ActivityIndicator
            color="#fff"
            size="small"
          />
        ) : (
          <Text
            style={
              styles.invoiceBtnText
            }
          >
            {t('sharePdfInvoice')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Styles                                      */
/* -------------------------------------------------------------------------- */

function createStyles(ui) {
  return {
    wrapper: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
    },

    wrapperCompact: {
      marginTop: 8,
    },

    whatsAppBtn: {
      flex: 1,
      backgroundColor: `${ui.brandWhatsApp}14`,
      borderRadius: ui.radiusMd,
      borderWidth: 1,
      borderColor: ui.brandWhatsApp,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },

    whatsAppBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: ui.brandWhatsApp,
      textAlign: 'center',
    },

    invoiceBtn: {
      flex: 1,
      backgroundColor: ui.textPrimary,
      borderRadius: ui.radiusMd,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },

    btnDisabled: {
      opacity: 0.7,
    },

    invoiceBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
  };
}