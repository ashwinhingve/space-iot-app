import React, { useEffect } from 'react';
import mqtt from 'mqtt';
import { useDispatch } from 'react-redux';
import { updateDeviceData } from '@/store/slices/deviceSlice';
import { AppDispatch } from '@/store/store';

interface MQTTConnectorProps {
  deviceId: string;
  mqttTopic: string;
}

export const MQTTConnector: React.FC<MQTTConnectorProps> = ({ deviceId, mqttTopic }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Connect to MQTT broker
    const client = mqtt.connect('ws://localhost:9001');

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      // Subscribe to device data topic
      client.subscribe(`${mqttTopic}/data`);
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        dispatch(updateDeviceData({ deviceId, data }));
      } catch (error) {
        console.error('Error parsing MQTT message:', error);
      }
    });

    client.on('error', (error) => {
      console.error('MQTT error:', error);
    });

    // Cleanup on unmount
    return () => {
      client.end();
    };
  }, [deviceId, mqttTopic, dispatch]);

  return null; // This is a non-visual component
}; 