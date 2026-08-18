import { useLaserBluetooth } from './useLaserBluetooth';

/**
 * useBluetoothLaser
 * 
 * Adaptador unificado que delega en useLaserBluetooth para soporte universal BLE
 * (Leica DISTO, Bosch GLM, UART genérico, Nordic NUS).
 */
export function useBluetoothLaser() {
  const {
    connect,
    isConnected,
    deviceInfo,
    lastMeasurement,
    clearMeasurement,
    disconnect,
    status,
    error,
    isSupported,
  } = useLaserBluetooth();

  return {
    connect,
    disconnect,
    isConnected,
    deviceInfo,
    lastMeasurement,
    clearMeasurement,
    status,
    error,
    isSupported,
  };
}
