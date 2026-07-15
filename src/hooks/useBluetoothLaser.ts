import { useState, useCallback } from 'react';

// Bosch GLM typical services (GLM 50 C / 120 C)
// Se intentará conectar a un dispositivo con nombre "BOSCH" o "GLM"
// Y suscribirse a cualquier característica que emita notificaciones (usualmente envía la distancia medida)

export function useBluetoothLaser() {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<string | null>(null);
  const [lastMeasurement, setLastMeasurement] = useState<number | null>(null);

  const connect = useCallback(async () => {
    try {
      if (!navigator.bluetooth) {
        alert('Web Bluetooth API no está soportada en este navegador. Usá Chrome, Edge o un navegador compatible.');
        return;
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          // Algunos UUID conocidos de Bosch (GATT custom)
          '00005301-0000-0041-4c50-574953450000'
        ]
      });

      console.log('Dispositivo conectado:', device.name);
      setDeviceInfo(device.name || 'Dispositivo Desconocido');

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setDeviceInfo(null);
        console.log('Bluetooth desconectado');
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('No se pudo conectar al GATT server');

      setIsConnected(true);

      // Buscar todos los servicios disponibles
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.notify || char.properties.indicate) {
            try {
              await char.startNotifications();
              char.addEventListener('characteristicvaluechanged', (e: any) => {
                const view = e.target.value as DataView;
                // Parseo básico: los Bosch suelen enviar floats o strings en ciertas características
                // Intentaremos extraer un float si el buffer tiene al menos 4 bytes
                try {
                  if (view.byteLength >= 4) {
                    const value = view.getFloat32(0, true); // Little endian
                    if (value > 0 && value < 100) { // Rango razonable en metros
                      console.log('Medición Bluetooth recibida (float32):', value);
                      setLastMeasurement(value);
                    }
                  } else {
                    // Si es ASCII string
                    const decoder = new TextDecoder('utf-8');
                    const text = decoder.decode(view.buffer);
                    const parsed = parseFloat(text);
                    if (!isNaN(parsed) && parsed > 0) {
                      console.log('Medición Bluetooth recibida (string):', parsed);
                      setLastMeasurement(parsed);
                    }
                  }
                } catch (err) {
                  console.warn('No se pudo parsear la medición del buffer', err);
                }
              });
              console.log('Suscrito a notificaciones en', char.uuid);
            } catch (e) {
              console.warn('No se pudo suscribir a', char.uuid, e);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error conectando a Bluetooth:', error);
      setIsConnected(false);
    }
  }, []);

  const clearMeasurement = useCallback(() => setLastMeasurement(null), []);

  return { connect, isConnected, deviceInfo, lastMeasurement, clearMeasurement };
}
