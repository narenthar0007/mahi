import { Platform } from 'react-native';

/** True for private LAN / hotspot IPv4 addresses other devices can reach. */
export function isUsableLanIp(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const value = ip.trim();
  if (!value || value === '0.0.0.0' || value === '127.0.0.1') return false;

  const parts = value.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 192.168.0.0/16 (home Wi‑Fi + most phone hotspots)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // Android USB tether / some hotspots
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return false;

  return false;
}

function pushUnique(list, ip) {
  if (!isUsableLanIp(ip)) return;
  if (!list.includes(ip)) list.push(ip);
}

/**
 * Collect candidate LAN IPs for the master QR.
 * Prefer Wi‑Fi / hotspot private addresses; never advertise 0.0.0.0.
 */
export async function discoverLanIpCandidates() {
  const candidates = [];

  if (Platform.OS === 'web') {
    return candidates;
  }

  try {
    const Network = require('expo-network');
    if (Network.getIpAddressAsync) {
      const ip = await Network.getIpAddressAsync();
      pushUnique(candidates, ip);
    }
  } catch {
    // continue
  }

  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    const state = await NetInfo.fetch();
    const details = state?.details || {};
    pushUnique(candidates, details.ipAddress);
    // Some Android builds expose nested wifi details.
    pushUnique(candidates, details.wifi?.ipAddress);
  } catch {
    // continue
  }

  // Offline-friendly probe: briefly open sockets toward common LAN gateways
  // and read the local interface the OS picks (no internet required).
  try {
    const TcpSocket = require('react-native-tcp-socket');
    const probeTargets = [
      '192.168.43.1', // Android hotspot host
      '192.168.0.1',
      '192.168.1.1',
      '10.0.0.1',
      '172.20.10.1', // iPhone hotspot
    ];

    for (const host of probeTargets) {
      // Skip if we already have a solid LAN IP.
      if (candidates.length) break;
      const probed = await new Promise((resolve) => {
        let settled = false;
        let client;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          try {
            client?.destroy();
          } catch {
            // ignore
          }
          resolve(value || '');
        };

        try {
          client = TcpSocket.createConnection({ port: 80, host, timeout: 700 }, () => {
            try {
              finish(client.address?.()?.address || '');
            } catch {
              finish('');
            }
          });
          client.on('error', () => {
            try {
              finish(client.address?.()?.address || '');
            } catch {
              finish('');
            }
          });
          client.on('timeout', () => finish(''));
        } catch {
          finish('');
          return;
        }
        setTimeout(() => finish(''), 800);
      });
      pushUnique(candidates, probed);
    }
  } catch {
    // tcp probe unavailable
  }

  return candidates;
}

export async function getPreferredLanIp() {
  const candidates = await discoverLanIpCandidates();
  return candidates[0] || '';
}
