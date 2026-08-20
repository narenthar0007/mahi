import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import useStore from '../store/store';
import deviceSync from '../utils/deviceSync';
import { showAlert } from '../utils/alert';
import { useTranslation } from '../utils/i18n';
import { useLayoutInsets } from '../hooks/useLayoutInsets';
import { useThemedStyles } from '../utils/uiTheme';
import DeviceSyncQrScanner from './DeviceSyncQrScanner';

let QRCode = null;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch (error) {
  console.warn('QRCode unavailable', error);
}

export default function DeviceSyncModal({
 visible, onClose }) {
  const { ui, styles } = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const { bottom: bottomInset } = useLayoutInsets();
  const shopName = useStore((s) => s.shopName);
  const [status, setStatus] = useState(() => deviceSync.getStatus());
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('home'); // home | master | scan | manual
  const [manualCode, setManualCode] = useState('');
  const [hostIp, setHostIp] = useState('');
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    setStatus(deviceSync.getStatus());
    const unsub = deviceSync.subscribe(setStatus);
    return unsub;
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setMode('home');
      setScanned(false);
      setManualCode('');
      setHostIp('');
    }
  }, [visible]);

  useEffect(() => {
    setHostIp(status?.host || '');
  }, [status?.host]);

  const handleClose = () => {
    onClose?.();
  };

  const startMaster = async () => {
    if (!status.canHost) {
      showAlert(t('syncHostUnsupportedTitle'), t('syncHostUnsupportedMsg'));
      return;
    }
    setBusy(true);
    try {
      const next = await deviceSync.startMaster({
        shopName,
        deviceName: shopName || t('syncMasterDefaultName'),
        // Only force an IP when the user typed one; otherwise auto-detect LAN IP.
        hostOverride: hostIp.trim() || undefined,
      });
      setStatus(next);
      setHostIp(next.host || '');
      setMode('master');
    } catch (error) {
      console.error('startMaster failed', error);
      let key = 'syncStartFailed';
      if (error?.message === 'master_requires_native_or_electron') key = 'syncHostUnsupportedMsg';
      else if (error?.message === 'lan_ip_unavailable') key = 'syncLanIpUnavailable';
      else if (error?.message === 'invalid_lan_ip') key = 'syncInvalidLanIp';
      showAlert(t('syncErrorTitle'), t(key));
    } finally {
      setBusy(false);
    }
  };

  const refreshMasterIp = async () => {
    setBusy(true);
    try {
      const next = await deviceSync.refreshMasterHost({
        shopName,
        hostOverride: hostIp.trim() || undefined,
      });
      setStatus(next);
      setHostIp(next.host || '');
    } catch (error) {
      console.error('refreshMasterHost failed', error);
      const key =
        error?.message === 'invalid_lan_ip'
          ? 'syncInvalidLanIp'
          : error?.message === 'lan_ip_unavailable'
            ? 'syncLanIpUnavailable'
            : 'syncStartFailed';
      showAlert(t('syncErrorTitle'), t(key));
    } finally {
      setBusy(false);
    }
  };

  const stopSync = async () => {
    setBusy(true);
    try {
      await deviceSync.stop();
      setStatus(deviceSync.getStatus());
      setMode('home');
    } finally {
      setBusy(false);
    }
  };

  const joinWithCode = async (raw) => {
    setBusy(true);
    try {
      const next = await deviceSync.joinAsChild(raw, {
        deviceName: shopName || t('syncChildDefaultName'),
      });
      setStatus(next);
      setMode('home');
      showAlert(t('syncJoinedTitle'), t('syncJoinedMsg'));
    } catch (error) {
      console.error('join failed', error);
      const hostHint = (() => {
        try {
          const parsed = require('../utils/deviceSync/protocol').parseQrPayload(raw);
          if (parsed?.ok) return parsed.payload.host;
        } catch {
          // ignore
        }
        return '';
      })();
      showAlert(
        t('syncErrorTitle'),
        hostHint
          ? t('syncJoinFailedDetail', { host: hostHint })
          : t('syncJoinFailed')
      );
    } finally {
      setBusy(false);
      setScanned(false);
    }
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') {
      setMode('manual');
      return;
    }
    setScanned(false);
    setMode('scan');
  };

  const sheetStyle = useMemo(
    () => ({ paddingBottom: Math.max(bottomInset, 16) }),
    [bottomInset]
  );

  const roleLabel =
    status.role === 'master'
      ? t('syncRoleMaster')
      : status.role === 'child'
        ? t('syncRoleChild')
        : t('syncRoleSolo');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, sheetStyle]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('deviceSync')}</Text>
              <Text style={styles.subtitle}>{t('deviceSyncHint')}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Text style={styles.closeText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>{t('syncStatus')}</Text>
              <Text style={styles.statusValue}>{roleLabel}</Text>
              {status.connected ? (
                <Text style={styles.statusMeta}>
                  {t('syncPeersConnected', { count: status.peerCount || status.peers?.length || 0 })}
                </Text>
              ) : (
                <Text style={styles.statusMeta}>{t('syncNotLinked')}</Text>
              )}
              {status.role === 'master' && status.host ? (
                <Text style={styles.statusMeta}>
                  {status.host}:{status.port}
                </Text>
              ) : null}
            </View>

            {mode === 'master' && status.qrPayload ? (
              <View style={styles.qrCard}>
                <Text style={styles.sectionTitle}>{t('syncShowQrTitle')}</Text>
                <Text style={styles.sectionHint}>{t('syncShowQrHint')}</Text>
                <Text style={styles.hostLabel}>{t('syncHostIpLabel')}</Text>
                <Text style={styles.sectionHint}>{t('syncHostIpHint')}</Text>
                <TextInput
                  style={styles.hostInput}
                  value={hostIp}
                  onChangeText={setHostIp}
                  placeholder="192.168.1.20"
                  placeholderTextColor={ui.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity style={styles.secondaryBtn} onPress={refreshMasterIp} disabled={busy}>
                  <Text style={styles.secondaryBtnText}>{t('syncRefreshIp')}</Text>
                </TouchableOpacity>
                <View style={styles.qrWrap}>
                  {QRCode ? (
                    <QRCode value={status.qrPayload} size={220} backgroundColor="#fff" color="#111827" />
                  ) : (
                    <Text style={styles.sectionHint}>{status.qrPayload}</Text>
                  )}
                </View>
                <Text style={styles.wifiNote}>
                  {status.host}:{status.port}
                </Text>
                <Text style={styles.wifiNote}>{t('syncWifiOnlyNote')}</Text>
                <TouchableOpacity style={styles.dangerBtn} onPress={stopSync} disabled={busy}>
                  <Text style={styles.dangerBtnText}>{t('syncStopMaster')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {mode === 'scan' ? (
              <View style={styles.scanCard}>
                <Text style={styles.sectionTitle}>{t('syncScanTitle')}</Text>
                <DeviceSyncQrScanner
                  disabled={scanned || busy}
                  onScan={(data) => {
                    setScanned(true);
                    joinWithCode(data);
                  }}
                />
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('manual')}>
                  <Text style={styles.secondaryBtnText}>{t('syncEnterCodeInstead')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('home')}>
                  <Text style={styles.secondaryBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {mode === 'manual' ? (
              <View style={styles.manualCard}>
                <Text style={styles.sectionTitle}>{t('syncManualTitle')}</Text>
                <Text style={styles.sectionHint}>{t('syncManualHint')}</Text>
                <TextInput
                  style={styles.input}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder={t('syncManualPlaceholder')}
                  placeholderTextColor={ui.textMuted}
                  multiline
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.primaryBtn}
                  disabled={busy || !manualCode.trim()}
                  onPress={() => joinWithCode(manualCode.trim())}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>{t('syncConnect')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('home')}>
                  <Text style={styles.secondaryBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {mode === 'home' ? (
              <View style={styles.actions}>
                {status.role === 'solo' ? (
                  <>
                    <TouchableOpacity style={styles.primaryBtn} onPress={startMaster} disabled={busy}>
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>{t('syncBecomeMaster')}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={openScanner} disabled={busy}>
                      <Text style={styles.secondaryBtnText}>{t('syncScanToJoin')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.dangerBtn} onPress={stopSync} disabled={busy}>
                    <Text style={styles.dangerBtnText}>
                      {status.role === 'master' ? t('syncStopMaster') : t('syncLeave')}
                    </Text>
                  </TouchableOpacity>
                )}
                {status.role === 'master' ? (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('master')}>
                    <Text style={styles.secondaryBtnText}>{t('syncShowQrAgain')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <View style={styles.legendCard}>
              <Text style={styles.sectionTitle}>{t('syncHowTitle')}</Text>
              <Text style={styles.bullet}>1. {t('syncHow1')}</Text>
              <Text style={styles.bullet}>2. {t('syncHow2')}</Text>
              <Text style={styles.bullet}>3. {t('syncHow3')}</Text>
              <Text style={styles.bullet}>4. {t('syncHow4')}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(ui) {
  return {
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: '92%',
    backgroundColor: ui.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: ui.textSecondary,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: ui.info,
    marginTop: 4,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  statusCard: {
    backgroundColor: ui.surface,
    borderRadius: ui.radiusLg,
    borderWidth: 1,
    borderColor: ui.borderLight,
    padding: 14,
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.textMuted,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  statusMeta: {
    fontSize: 13,
    color: ui.textSecondary,
  },
  qrCard: {
    backgroundColor: ui.surface,
    borderRadius: ui.radiusLg,
    borderWidth: 1,
    borderColor: ui.borderLight,
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  qrWrap: {
    padding: 16,
    backgroundColor: ui.surface,
    borderRadius: 12,
    maxWidth: '100%',
  },
  wifiNote: {
    fontSize: 12,
    color: ui.textSecondary,
    textAlign: 'center',
  },
  hostLabel: {
    alignSelf: 'stretch',
    fontSize: 13,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  hostInput: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: ui.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: ui.textPrimary,
    backgroundColor: ui.surface,
  },
  scanCard: {
    gap: 10,
  },
  manualCard: {
    gap: 10,
    backgroundColor: ui.surface,
    borderRadius: ui.radiusLg,
    borderWidth: 1,
    borderColor: ui.borderLight,
    padding: 14,
  },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: ui.radiusMd,
    padding: 12,
    textAlignVertical: 'top',
    color: ui.textPrimary,
    backgroundColor: ui.surface,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: ui.textPrimary,
    borderRadius: ui.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: ui.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: ui.surface,
  },
  secondaryBtnText: {
    color: ui.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  dangerBtn: {
    backgroundColor: '#dc2626',
    borderRadius: ui.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  legendCard: {
    backgroundColor: ui.surface,
    borderRadius: ui.radiusLg,
    borderWidth: 1,
    borderColor: ui.borderLight,
    padding: 14,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  sectionHint: {
    fontSize: 12,
    color: ui.textSecondary,
  },
  bullet: {
    fontSize: 13,
    color: ui.textSecondary,
    lineHeight: 20,
  },
};
}