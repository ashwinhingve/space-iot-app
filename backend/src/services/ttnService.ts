/**
 * The Things Network (TTN) Integration Service
 * Handles all interactions with TTN REST API
 */

import crypto from 'crypto';

// TTN-specific error classes
export class TTNAuthError extends Error {
  constructor(message: string = 'Invalid or expired API key') {
    super(message);
    this.name = 'TTNAuthError';
  }
}

export class TTNRateLimitError extends Error {
  constructor(message: string = 'TTN rate limit exceeded') {
    super(message);
    this.name = 'TTNRateLimitError';
  }
}

export class TTNNetworkError extends Error {
  constructor(message: string = 'Cannot reach TTN API') {
    super(message);
    this.name = 'TTNNetworkError';
  }
}

/**
 * Parse TTN API response errors into specific error types
 */
function parseTTNError(status: number, body: Record<string, unknown>): Error {
  const detail = (body?.message as string) || (body?.error as string) || '';

  if (status === 401 || status === 403) {
    return new TTNAuthError(detail || 'Invalid or expired API key');
  }
  if (status === 429) {
    return new TTNRateLimitError(detail || 'TTN rate limit exceeded, please retry later');
  }
  if (status >= 500) {
    return new TTNNetworkError(detail || 'TTN service unavailable');
  }
  return new Error(`TTN API error: ${status} - ${detail || JSON.stringify(body)}`);
}

export interface TTNConfig {
  region: string; // eu1, nam1, au1
  applicationId: string;
  apiKey: string;
}

export interface TTNDeviceInfo {
  ids: {
    device_id: string;
    application_ids: { application_id: string };
    dev_eui: string;
    join_eui?: string;
    dev_addr?: string;
  };
  name?: string;
  description?: string;
  attributes?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface TTNDownlinkRequest {
  deviceId: string;
  fPort: number;
  payload: string; // Base64 encoded
  confirmed?: boolean;
  priority?: 'LOWEST' | 'LOW' | 'BELOW_NORMAL' | 'NORMAL' | 'ABOVE_NORMAL' | 'HIGH' | 'HIGHEST';
  correlationId?: string;
}

export interface TTNWebhookConfig {
  webhookId: string;
  baseUrl: string;
  secret?: string;
  uplinkMessage?: boolean;
  downlinkAck?: boolean;
  downlinkNack?: boolean;
  downlinkSent?: boolean;
  downlinkFailed?: boolean;
  downlinkQueued?: boolean;
  joinAccept?: boolean;
  locationSolved?: boolean;
  serviceData?: boolean;
}

class TTNService {
  private config: TTNConfig | null = null;

  /**
   * Initialize the TTN service with credentials
   */
  initialize(config: TTNConfig): void {
    this.config = config;
    console.log(`TTN Service initialized for application: ${config.applicationId} in region: ${config.region}`);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Get the base URL for TTN API
   */
  private getBaseUrl(): string {
    if (!this.config) throw new Error('TTN Service not initialized');
    return `https://${this.config.region}.cloud.thethings.network/api/v3`;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): Record<string, string> {
    if (!this.config) throw new Error('TTN Service not initialized');
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch all devices in the application
   */
  async getDevices(): Promise<TTNDeviceInfo[]> {
    if (!this.config) throw new Error('TTN Service not initialized');

    const url = `${this.getBaseUrl()}/applications/${this.config.applicationId}/devices`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw parseTTNError(response.status, body);
      }

      const data = await response.json();
      return data.end_devices || [];
    } catch (error) {
      if (error instanceof TTNAuthError || error instanceof TTNRateLimitError || error instanceof TTNNetworkError) throw error;
      if (error instanceof TypeError) throw new TTNNetworkError('Cannot reach TTN API');
      console.error('Error fetching TTN devices:', error);
      throw error;
    }
  }

  /**
   * Fetch a specific device
   */
  async getDevice(deviceId: string): Promise<TTNDeviceInfo | null> {
    if (!this.config) throw new Error('TTN Service not initialized');

    const url = `${this.getBaseUrl()}/applications/${this.config.applicationId}/devices/${deviceId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw parseTTNError(response.status, body);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TTNAuthError || error instanceof TTNRateLimitError || error instanceof TTNNetworkError) throw error;
      if (error instanceof TypeError) throw new TTNNetworkError('Cannot reach TTN API');
      console.error(`Error fetching TTN device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch application information
   */
  async getApplication(): Promise<Record<string, unknown> | null> {
    if (!this.config) throw new Error('TTN Service not initialized');

    const url = `${this.getBaseUrl()}/applications/${this.config.applicationId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw parseTTNError(response.status, body);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TTNAuthError || error instanceof TTNRateLimitError || error instanceof TTNNetworkError) throw error;
      if (error instanceof TypeError) throw new TTNNetworkError('Cannot reach TTN API');
      console.error('Error fetching TTN application:', error);
      throw error;
    }
  }

  /**
   * Send a downlink message to a device
   */
  async sendDownlink(request: TTNDownlinkRequest): Promise<{ success: boolean; correlationId: string }> {
    if (!this.config) throw new Error('TTN Service not initialized');

    const correlationId = request.correlationId || `dl-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Use the Application Server API for downlinks
    const url = `${this.getBaseUrl()}/as/applications/${this.config.applicationId}/devices/${request.deviceId}/down/push`;

    const downlinkPayload = {
      downlinks: [{
        f_port: request.fPort,
        frm_payload: request.payload, // Base64 encoded
        confirmed: request.confirmed || false,
        priority: request.priority || 'NORMAL',
        correlation_ids: [correlationId],
      }]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(downlinkPayload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw parseTTNError(response.status, body);
      }

      console.log(`Downlink sent to ${request.deviceId} with correlation ID: ${correlationId}`);
      return { success: true, correlationId };
    } catch (error) {
      if (error instanceof TTNAuthError || error instanceof TTNRateLimitError || error instanceof TTNNetworkError) throw error;
      if (error instanceof TypeError) throw new TTNNetworkError('Cannot reach TTN API');
      console.error(`Error sending downlink to ${request.deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Replace (clear and set) downlink queue for a device
   */
  async replaceDownlinkQueue(deviceId: string, downlinks: TTNDownlinkRequest[]): Promise<boolean> {
    if (!this.config) throw new Error('TTN Service not initialized');

    const url = `${this.getBaseUrl()}/as/applications/${this.config.applicationId}/devices/${deviceId}/down/replace`;

    const payload = {
      downlinks: downlinks.map(dl => ({
        f_port: dl.fPort,
        frm_payload: dl.payload,
        confirmed: dl.confirmed || false,
        priority: dl.priority || 'NORMAL',
        correlation_ids: [dl.correlationId || `dl-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`],
      }))
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw parseTTNError(response.status, body);
      }

      return true;
    } catch (error) {
      if (error instanceof TTNAuthError || error instanceof TTNRateLimitError || error instanceof TTNNetworkError) throw error;
      if (error instanceof TypeError) throw new TTNNetworkError('Cannot reach TTN API');
      console.error(`Error replacing downlink queue for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Create a webhook for the application
   */
  async createWebhook(config: TTNWebhookConfig): Promise<boolean> {
    if (!this.config) throw new Error('TTN Service not initialized');

    const url = `${this.getBaseUrl()}/applications/${this.config.applicationId}/webhooks`;

    const webhookPayload: Record<string, unknown> = {
      webhook: {
        ids: {
          webhook_id: config.webhookId,
          application_ids: { application_id: this.config.applicationId }
        },
        base_url: config.baseUrl,
        format: 'json',
        ...(config.uplinkMessage && { uplink_message: {} }),
        ...(config.downlinkAck && { downlink_ack: {} }),
        ...(config.downlinkNack && { downlink_nack: {} }),
        ...(config.downlinkSent && { downlink_sent: {} }),
        ...(config.downlinkFailed && { downlink_failed: {} }),
        ...(config.downlinkQueued && { downlink_queued: {} }),
        ...(config.joinAccept && { join_accept: {} }),
        ...(config.locationSolved && { location_solved: {} }),
        ...(config.serviceData && { service_data: {} }),
      }
    };

    // Add secret header if provided
    if (config.secret) {
      (webhookPayload.webhook as Record<string, unknown>).headers = {
        'X-Webhook-Secret': config.secret
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw parseTTNError(response.status, body);
      }

      console.log(`Webhook ${config.webhookId} created successfully`);
      return true;
    } catch (error) {
      if (error instanceof TTNAuthError || error instanceof TTNRateLimitError || error instanceof TTNNetworkError) throw error;
      if (error instanceof TypeError) throw new TTNNetworkError('Cannot reach TTN API');
      console.error('Error creating TTN webhook:', error);
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    if (!this.config) throw new Error('TTN Service not initialized');

    const url = `${this.getBaseUrl()}/applications/${this.config.applicationId}/webhooks/${webhookId}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok && response.status !== 404) {
        const body = await response.json().catch(() => ({}));
        throw parseTTNError(response.status, body);
      }

      console.log(`Webhook ${webhookId} deleted`);
      return true;
    } catch (error) {
      if (error instanceof TTNAuthError || error instanceof TTNRateLimitError || error instanceof TTNNetworkError) throw error;
      if (error instanceof TypeError) throw new TTNNetworkError('Cannot reach TTN API');
      console.error(`Error deleting TTN webhook ${webhookId}:`, error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate a webhook secret
   */
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Parse uplink message from webhook payload
   */
  parseUplinkMessage(payload: Record<string, unknown>): {
    deviceId: string;
    applicationId: string;
    devEui: string;
    devAddr?: string;
    fPort: number;
    fCnt: number;
    rawPayload: string;
    decodedPayload?: Record<string, unknown>;
    rssi: number;
    snr: number;
    spreadingFactor: number;
    bandwidth: number;
    frequency: number;
    codingRate?: string;
    gatewayId: string;
    gatewayEui?: string;
    gatewayLocation?: { latitude: number; longitude: number; altitude?: number };
    receivedAt: Date;
    confirmed: boolean;
  } {
    const endDeviceIds = payload.end_device_ids as Record<string, unknown>;
    const uplinkMessage = payload.uplink_message as Record<string, unknown>;
    const rxMetadata = (uplinkMessage.rx_metadata as unknown[])?.[0] as Record<string, unknown>;
    const settings = uplinkMessage.settings as Record<string, unknown>;
    const dataRate = settings?.data_rate as Record<string, unknown>;
    const lora = dataRate?.lora as Record<string, unknown>;
    const gatewayIds = rxMetadata?.gateway_ids as Record<string, unknown>;
    const location = rxMetadata?.location as Record<string, unknown>;

    return {
      deviceId: endDeviceIds.device_id as string,
      applicationId: (endDeviceIds.application_ids as Record<string, unknown>).application_id as string,
      devEui: endDeviceIds.dev_eui as string,
      devAddr: endDeviceIds.dev_addr as string | undefined,
      fPort: uplinkMessage.f_port as number,
      fCnt: uplinkMessage.f_cnt as number,
      rawPayload: uplinkMessage.frm_payload as string,
      decodedPayload: uplinkMessage.decoded_payload as Record<string, unknown> | undefined,
      rssi: rxMetadata?.rssi as number,
      snr: rxMetadata?.snr as number,
      spreadingFactor: lora?.spreading_factor as number,
      bandwidth: lora?.bandwidth as number,
      frequency: (settings?.frequency as number) || 0,
      codingRate: lora?.coding_rate as string | undefined,
      gatewayId: gatewayIds?.gateway_id as string,
      gatewayEui: gatewayIds?.eui as string | undefined,
      gatewayLocation: location ? {
        latitude: location.latitude as number,
        longitude: location.longitude as number,
        altitude: location.altitude as number | undefined,
      } : undefined,
      receivedAt: new Date(uplinkMessage.received_at as string),
      confirmed: uplinkMessage.confirmed as boolean || false,
    };
  }

  /**
   * Parse downlink event from webhook payload
   */
  parseDownlinkEvent(payload: Record<string, unknown>, eventType: 'ack' | 'nack' | 'sent' | 'failed' | 'queued'): {
    deviceId: string;
    applicationId: string;
    correlationIds: string[];
    eventType: string;
    timestamp: Date;
    failureReason?: string;
  } {
    const endDeviceIds = payload.end_device_ids as Record<string, unknown>;
    const downlinkMessage = (payload[`downlink_${eventType}`] || payload.downlink_message) as Record<string, unknown>;

    return {
      deviceId: endDeviceIds.device_id as string,
      applicationId: (endDeviceIds.application_ids as Record<string, unknown>).application_id as string,
      correlationIds: downlinkMessage?.correlation_ids as string[] || [],
      eventType,
      timestamp: new Date(),
      failureReason: eventType === 'failed' ?
        ((payload.downlink_failed as Record<string, unknown>)?.error as Record<string, unknown>)?.message as string :
        undefined,
    };
  }
}

// Singleton instance
export const ttnService = new TTNService();
