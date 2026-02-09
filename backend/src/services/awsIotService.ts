/**
 * AWS IoT Core Service
 * Handles MQTT communication using AWS IoT Core for production deployment
 */

import * as fs from 'fs';
import * as path from 'path';

// AWS IoT Device SDK v2 types - dynamic import for production
let iot: any;
let mqtt: any;

interface AwsIotConfig {
  endpoint: string;
  certPath: string;
  keyPath: string;
  caPath: string;
  clientId: string;
  region: string;
}

type MessageHandler = (topic: string, payload: Buffer) => Promise<void>;

class AwsIotService {
  private connection: any = null;
  private config: AwsIotConfig | null = null;
  private messageHandler: MessageHandler | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private isConnecting = false;
  private subscriptions: string[] = [];

  async initialize(config: AwsIotConfig, messageHandler: MessageHandler): Promise<void> {
    this.config = config;
    this.messageHandler = messageHandler;

    // Validate certificate files exist
    this.validateCertificates();

    // Dynamic import of AWS IoT SDK
    try {
      const awsIotSdk = await import('aws-iot-device-sdk-v2');
      iot = awsIotSdk.iot;
      mqtt = awsIotSdk.mqtt;
    } catch (error) {
      console.error('Failed to import AWS IoT SDK. Make sure aws-iot-device-sdk-v2 is installed.');
      throw error;
    }

    await this.connect();
  }

  private validateCertificates(): void {
    if (!this.config) return;

    const files = [
      { path: this.config.certPath, name: 'Certificate' },
      { path: this.config.keyPath, name: 'Private Key' },
      { path: this.config.caPath, name: 'CA Certificate' }
    ];

    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        throw new Error(`AWS IoT ${file.name} not found at: ${file.path}`);
      }
    }

    console.log('AWS IoT certificates validated');
  }

  private async connect(): Promise<void> {
    if (!this.config || this.isConnecting) return;

    this.isConnecting = true;

    try {
      console.log(`Connecting to AWS IoT Core at ${this.config.endpoint}...`);

      // Create MQTT connection builder
      const configBuilder = iot.AwsIotMqttConnectionConfigBuilder
        .new_mtls_builder_from_path(this.config.certPath, this.config.keyPath);

      configBuilder.with_certificate_authority_from_path(undefined, this.config.caPath);
      configBuilder.with_clean_session(false);
      configBuilder.with_client_id(this.config.clientId);
      configBuilder.with_endpoint(this.config.endpoint);
      configBuilder.with_keep_alive_seconds(30);

      const mqttConfig = configBuilder.build();
      const client = new mqtt.MqttClient();
      this.connection = client.new_connection(mqttConfig);

      // Set up event handlers
      this.connection.on('connect', () => {
        console.log('Connected to AWS IoT Core');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.resubscribe();
      });

      this.connection.on('disconnect', () => {
        console.log('Disconnected from AWS IoT Core');
        this.scheduleReconnect();
      });

      this.connection.on('error', (error: Error) => {
        console.error('AWS IoT Core connection error:', error);
        this.isConnecting = false;
      });

      this.connection.on('interrupt', (error: Error) => {
        console.log('AWS IoT Core connection interrupted:', error.message);
      });

      this.connection.on('resume', (returnCode: number, sessionPresent: boolean) => {
        console.log(`AWS IoT Core connection resumed. Return code: ${returnCode}, Session present: ${sessionPresent}`);
      });

      this.connection.on('message', async (topic: string, payload: ArrayBuffer) => {
        if (this.messageHandler) {
          try {
            const buffer = Buffer.from(payload);
            await this.messageHandler(topic, buffer);
          } catch (error) {
            console.error('Error handling AWS IoT message:', error);
          }
        }
      });

      // Connect
      await this.connection.connect();

    } catch (error) {
      console.error('Failed to connect to AWS IoT Core:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000 // Max 30 seconds
    );

    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private async resubscribe(): Promise<void> {
    for (const topic of this.subscriptions) {
      try {
        await this.subscribe(topic);
      } catch (error) {
        console.error(`Failed to resubscribe to ${topic}:`, error);
      }
    }
  }

  async subscribe(topic: string): Promise<void> {
    if (!this.connection) {
      console.warn('Cannot subscribe: not connected to AWS IoT Core');
      return;
    }

    try {
      await this.connection.subscribe(topic, mqtt.QoS.AtLeastOnce);
      if (!this.subscriptions.includes(topic)) {
        this.subscriptions.push(topic);
      }
      console.log(`Subscribed to AWS IoT topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${topic}:`, error);
      throw error;
    }
  }

  async publish(topic: string, payload: string | object, qos: number = 1): Promise<void> {
    if (!this.connection) {
      console.warn('Cannot publish: not connected to AWS IoT Core');
      return;
    }

    try {
      const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
      await this.connection.publish(topic, message, qos === 0 ? mqtt.QoS.AtMostOnce : mqtt.QoS.AtLeastOnce);
      console.log(`Published to AWS IoT topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to publish to ${topic}:`, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.disconnect();
        this.connection = null;
        console.log('Disconnected from AWS IoT Core');
      } catch (error) {
        console.error('Error disconnecting from AWS IoT Core:', error);
      }
    }
  }
}

// Singleton instance
export const awsIotService = new AwsIotService();

// Export type for use in other files
export type { MessageHandler, AwsIotConfig };
