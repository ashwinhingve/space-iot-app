import type { ConsoleWidget } from '@/store/slices/consoleSlice';
import { API_ENDPOINTS } from '@/lib/config';

/**
 * Sends a control command for a widget based on its onPress configuration.
 * Handles mqtt, ttn-downlink, and valve API types.
 * Throws on API error so callers can display feedback.
 */
export async function sendWidgetControl(
  widget: ConsoleWidget,
  value: number | boolean
): Promise<void> {
  const op = widget.onPress;
  if (!op || op.apiType === 'none') return;

  const token =
    typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (op.apiType === 'mqtt' && op.mqttDeviceId) {
    const res = await fetch(API_ENDPOINTS.DEVICE_CONTROL(op.mqttDeviceId), {
      method: 'POST',
      headers,
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`MQTT command failed: ${msg}`);
    }
    return;
  }

  if (op.apiType === 'ttn-downlink' && op.ttnAppId && op.ttnDeviceId) {
    // Clamp value to valid single-byte range (0-255) before btoa encoding
    const byteVal = Math.max(0, Math.min(255, Math.round(Number(value))));
    const payload = btoa(String.fromCharCode(byteVal));
    const res = await fetch(
      API_ENDPOINTS.TTN_SEND_DOWNLINK(op.ttnAppId, op.ttnDeviceId),
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ fPort: op.fPort ?? 1, payload }),
      }
    );
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`TTN downlink failed: ${msg}`);
    }
    return;
  }

  if (op.apiType === 'valve' && op.valveId) {
    const res = await fetch(API_ENDPOINTS.VALVE_COMMAND(op.valveId), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: op.valveAction ?? 'ON' }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Valve command failed: ${msg}`);
    }
  }
}
