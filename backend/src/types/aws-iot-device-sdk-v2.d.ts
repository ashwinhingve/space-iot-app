// Type declarations for aws-iot-device-sdk-v2
// This file provides basic type support until the actual package is installed

declare module 'aws-iot-device-sdk-v2' {
  export namespace iot {
    class AwsIotMqttConnectionConfigBuilder {
      static new_mtls_builder_from_path(certPath: string, keyPath: string): AwsIotMqttConnectionConfigBuilder;
      with_certificate_authority_from_path(ca: undefined, caPath: string): AwsIotMqttConnectionConfigBuilder;
      with_clean_session(cleanSession: boolean): AwsIotMqttConnectionConfigBuilder;
      with_client_id(clientId: string): AwsIotMqttConnectionConfigBuilder;
      with_endpoint(endpoint: string): AwsIotMqttConnectionConfigBuilder;
      with_keep_alive_seconds(keepAlive: number): AwsIotMqttConnectionConfigBuilder;
      build(): any;
    }
  }

  export namespace mqtt {
    enum QoS {
      AtMostOnce = 0,
      AtLeastOnce = 1,
      ExactlyOnce = 2
    }

    class MqttClient {
      new_connection(config: any): MqttClientConnection;
    }

    interface MqttClientConnection {
      on(event: string, callback: (...args: any[]) => void): void;
      connect(): Promise<boolean>;
      disconnect(): Promise<void>;
      subscribe(topic: string, qos: QoS): Promise<any>;
      publish(topic: string, payload: string, qos: QoS): Promise<any>;
    }
  }
}
