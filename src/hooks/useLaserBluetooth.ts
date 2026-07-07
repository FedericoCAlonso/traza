/**
 * useLaserBluetooth
 * 
 * Hook para conectar medidores láser de distancia por BLE desde una PWA.
 * Soporta los protocolos más comunes:
 * 
 * 1. Leica DISTO / Bosch GLM (protocolo compartido): Service 3ab10100-...
 * 2. Genéricos UART (SNDWAY, Lomvum, etc.): Service 0000ffe0-...
 * 3. Nordic UART Service (NUS): Service 6e400001-...
 * 
 * REQUISITOS: Chrome Android (o Chrome Desktop), HTTPS o localhost.
 * NO funciona en Firefox ni Safari iOS por falta de soporte Web Bluetooth.
 */
import { useState, useCallback, useRef } from 'react';

export type LaserStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface LaserReading {
  value: number;    // metros
  raw: string;      // string original recibido
  timestamp: number;
}

interface UseLaserBluetoothReturn {
  status: LaserStatus;
  lastReading: LaserReading | null;
  deviceName: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isSupported: boolean;
}

// ─── Perfiles BLE conocidos ────────────────────────────────────────────────

/** Leica DISTO D series y Bosch GLM series (protocolo común, reverse-engineered) */
const LEICA_BOSCH_PROFILE = {
  name: 'Leica/Bosch',
  serviceUUID:         '3ab10100-f831-4395-b29d-570977d5bf94',
  measureCharUUID:     '3ab10101-f831-4395-b29d-570977d5bf94',
  commandCharUUID:     '3ab10109-f831-4395-b29d-570977d5bf94',
  /** Comando para solicitar medición (hex: c05601001e) */
  measureCommand: new Uint8Array([0xc0, 0x56, 0x01, 0x00, 0x1e]),
  /** Parsea 4 bytes float32 little-endian → metros */
  parse: (data: DataView): number | null => {
    if (data.byteLength < 4) return null;
    const val = data.getFloat32(0, true); // little-endian
    if (!isFinite(val) || val <= 0 || val > 200) return null;
    return Math.round(val * 1000) / 1000;
  }
};

/** Medidores genéricos chinos (SNDWAY, Lomvum, CEM, etc.) vía UART emulado */
const GENERIC_UART_PROFILE = {
  name: 'Genérico (FFE0)',
  serviceUUID:     '0000ffe0-0000-1000-8000-00805f9b34fb',
  measureCharUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
  commandCharUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
  measureCommand: null as Uint8Array | null,
  /** Parsea ASCII como "1.234 m" o "1234 mm" */
  parse: (data: DataView): number | null => {
    const text = new TextDecoder().decode(data.buffer).trim();
    // Formato: "1.234 m", "1234 mm", "123.4cm" etc.
    const mMatch = text.match(/([0-9]+\.?[0-9]*)\s*m(?!m)/i);
    if (mMatch) return parseFloat(mMatch[1]);
    const mmMatch = text.match(/([0-9]+\.?[0-9]*)\s*mm/i);
    if (mmMatch) return Math.round(parseFloat(mmMatch[1])) / 1000;
    const cmMatch = text.match(/([0-9]+\.?[0-9]*)\s*cm/i);
    if (cmMatch) return parseFloat(cmMatch[1]) / 100;
    // Último recurso: buscar número flotante
    const numMatch = text.match(/[0-9]+\.[0-9]+/);
    if (numMatch) {
      const v = parseFloat(numMatch[0]);
      if (v > 0 && v < 200) return v;
    }
    return null;
  }
};

/** Nordic UART Service – usado en algunos kits DIY y medidores modernos */
const NUS_PROFILE = {
  name: 'Nordic UART',
  serviceUUID:     '6e400001-b5ba-f393-e0a9-e50e24dcca9e',
  measureCharUUID: '6e400003-b5ba-f393-e0a9-e50e24dcca9e', // TX (dispositivo → app)
  commandCharUUID: '6e400002-b5ba-f393-e0a9-e50e24dcca9e', // RX (app → dispositivo)
  measureCommand: null as Uint8Array | null,
  parse: GENERIC_UART_PROFILE.parse // mismo parser de texto
};

const ALL_PROFILES = [LEICA_BOSCH_PROFILE, GENERIC_UART_PROFILE, NUS_PROFILE];

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useLaserBluetooth(onReading?: (value: number) => void): UseLaserBluetoothReturn {
  const [status, setStatus] = useState<LaserStatus>('disconnected');
  const [lastReading, setLastReading] = useState<LaserReading | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const charRef   = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  const handleNotification = useCallback((profile: typeof ALL_PROFILES[0]) => (event: Event) => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    if (!char.value) return;

    const meters = profile.parse(char.value);
    if (meters !== null) {
      const raw = new TextDecoder().decode(char.value.buffer).trim() || `${meters}m`;
      const reading: LaserReading = { value: meters, raw, timestamp: Date.now() };
      setLastReading(reading);
      onReading?.(meters);
    }
  }, [onReading]);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('Web Bluetooth no está disponible. Usá Chrome en Android.');
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const device = await (navigator.bluetooth as any).requestDevice({
        // Aceptar cualquier dispositivo y filtrar nosotros
        acceptAllDevices: true,
        optionalServices: ALL_PROFILES.map(p => p.serviceUUID)
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'Medidor Desconocido');

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        setDeviceName(null);
      });

      const server = await device.gatt!.connect();
      
      // Intentar cada perfil hasta que uno funcione
      let connected = false;
      for (const profile of ALL_PROFILES) {
        try {
          const service = await server.getPrimaryService(profile.serviceUUID);
          const measureChar = await service.getCharacteristic(profile.measureCharUUID);

          // Suscribirse a notificaciones
          await measureChar.startNotifications();
          measureChar.addEventListener('characteristicvaluechanged', handleNotification(profile));
          charRef.current = measureChar;

          // Si el perfil tiene un comando de solicitud, enviarlo
          if (profile.commandCharUUID && profile.measureCommand) {
            try {
              const commandChar = await service.getCharacteristic(profile.commandCharUUID);
              await commandChar.writeValue(profile.measureCommand);
            } catch (_) {
              // No crítico si falla el comando inicial
            }
          }

          setStatus('connected');
          console.log(`[Laser BLE] Conectado con perfil: ${profile.name}`);
          connected = true;
          break;
        } catch (_) {
          // Este perfil no es compatible, probar el siguiente
        }
      }

      if (!connected) {
        throw new Error('El dispositivo no expone ningún perfil de medición reconocido. Intentá con nRF Connect para identificar los UUIDs de tu medidor.');
      }

    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        // Usuario canceló el selector – no es un error real
        setStatus('disconnected');
      } else {
        setError(err.message || 'Error desconocido de Bluetooth');
        setStatus('error');
      }
    }
  }, [isSupported, handleNotification]);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    charRef.current = null;
    setStatus('disconnected');
    setDeviceName(null);
    setLastReading(null);
  }, []);

  return { status, lastReading, deviceName, error, connect, disconnect, isSupported };
}
