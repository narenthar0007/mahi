import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { resolveTheme } from './theme';
import { normalizeShopOffer } from './offers';

export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = 'geet-pos';

export function buildBackupPayload(state) {
  return {
    backupVersion: BACKUP_VERSION,
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    shopName: state.shopName || '',
    fssaiNumber: state.fssaiNumber || '',
    gstinNumber: state.gstinNumber || '',
    theme: state.theme || {},
    language: state.language || 'en',
    showWhatsAppInvoiceButtons: state.showWhatsAppInvoiceButtons !== false,
    shopOffer: state.shopOffer || {},
    menuListView: Boolean(state.menuListView),
    ownerToken: state.ownerToken || '',
    orderSequence: Number(state.orderSequence) || 0,
    inventory: Array.isArray(state.inventory) ? state.inventory : [],
    history: Array.isArray(state.history) ? state.history : [],
  };
}

export function validateBackupPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup: not a JSON object.');
  }
  if (raw.app !== BACKUP_APP_ID) {
    throw new Error('Invalid backup: not a GEET app backup file.');
  }
  if (Number(raw.backupVersion) !== BACKUP_VERSION) {
    throw new Error('Unsupported backup version. Update the app and try again.');
  }
  if (!Array.isArray(raw.inventory) || !Array.isArray(raw.history)) {
    throw new Error('Invalid backup: missing inventory or order history.');
  }
  return raw;
}

export function parseBackupText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('Paste backup JSON first.');
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Invalid JSON. Copy the full backup file contents.');
  }
  return validateBackupPayload(parsed);
}

export function normalizeImportedBackup(raw) {
  const data = validateBackupPayload(raw);
  return {
    shopName: String(data.shopName || '').trim(),
    fssaiNumber: String(data.fssaiNumber || '').trim(),
    gstinNumber: String(data.gstinNumber || '').trim(),
    theme: resolveTheme(data.theme),
    language: typeof data.language === 'string' ? data.language : 'en',
    showWhatsAppInvoiceButtons: data.showWhatsAppInvoiceButtons !== false,
    shopOffer: normalizeShopOffer(data.shopOffer),
    menuListView: Boolean(data.menuListView),
    ownerToken: typeof data.ownerToken === 'string' ? data.ownerToken.trim() : '',
    orderSequence: Number(data.orderSequence) || 0,
    inventory: data.inventory,
    history: data.history,
  };
}

async function downloadOnWeb(content, fileName) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareBackupFile(payload) {
  const json = JSON.stringify(payload, null, 2);
  const fileName = `geet-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    await downloadOnWeb(json, fileName);
    return { shared: true };
  }

  try {
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');
    const uri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(uri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export NAM bill backup',
      });
      return { shared: true };
    }
  } catch {
    // fall through to Share API
  }

  await Share.share({ message: json, title: 'NAM bill backup' });
  return { shared: true };
}

export async function readBackupFromClipboard() {
  const text = await Clipboard.getStringAsync();
  return parseBackupText(text);
}
