/**
 * LaserButton – Botón para conectar/desconectar un medidor laser BLE.
 * Se coloca junto a un campo de medición para rellenarlo automáticamente.
 */
import { useLaserBluetooth } from '../hooks/useLaserBluetooth';

interface LaserButtonProps {
  /** Callback que recibe el valor medido en metros */
  onValue: (value: number) => void;
  /** Si mostrar solo el ícono (modo compacto para dentro de inputs) */
  compact?: boolean;
}

const STATUS_ICON: Record<string, string> = {
  disconnected: '📡',
  connecting:   '⏳',
  connected:    '🟢',
  error:        '⚠️',
};

const STATUS_COLOR: Record<string, string> = {
  disconnected: 'var(--text3)',
  connecting:   'var(--warning)',
  connected:    'var(--success)',
  error:        'var(--error)',
};

export function LaserButton({ onValue, compact = false }: LaserButtonProps) {
  const { status, lastReading, deviceName, error, connect, disconnect, isSupported } = useLaserBluetooth(onValue);

  if (!isSupported) return null; // Ocultar en browsers sin soporte

  const isConnected = status === 'connected';

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="laser-btn-wrapper">
      <button
        className={`laser-btn ${status}`}
        onClick={handleClick}
        title={
          isConnected
            ? `${deviceName || 'Medidor'} conectado — toca para desconectar`
            : 'Conectar medidor láser BLE'
        }
        style={{ color: STATUS_COLOR[status] }}
        type="button"
      >
        <span className="laser-icon">{STATUS_ICON[status]}</span>
        {!compact && (
          <span className="laser-label">
            {status === 'disconnected' && 'Láser'}
            {status === 'connecting'   && 'Conectando…'}
            {status === 'connected'    && (deviceName || 'BLE')}
            {status === 'error'        && 'Error BLE'}
          </span>
        )}
      </button>

      {/* Última lectura recibida */}
      {lastReading && (
        <div className="laser-reading" title={`Recibido: ${lastReading.raw}`}>
          {lastReading.value.toFixed(3)} m
        </div>
      )}

      {/* Mensaje de error */}
      {error && status === 'error' && (
        <div className="laser-error">{error}</div>
      )}
    </div>
  );
}
