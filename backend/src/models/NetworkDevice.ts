import mongoose from 'mongoose';

export interface INetworkDevice extends mongoose.Document {
  name: string;
  description?: string;
  protocol: 'lorawan' | 'wifi' | 'bluetooth' | 'gsm';
  status: 'online' | 'offline' | 'error' | 'provisioning';
  signalStrength?: number;
  lastSeen?: Date;
  owner: mongoose.Types.ObjectId;
  tags: string[];
  mqttDeviceId?: string;  // Auto-linked MQTT topic segment for Wi-Fi & GSM devices
  lorawan?: {
    devEui?: string;
    appId?: string;
    activationMode?: 'OTAA' | 'ABP';
    deviceClass?: 'A' | 'B' | 'C';
    appKey?: string;
    devAddr?: string;
  };
  wifi?: {
    macAddress?: string;
    ipAddress?: string;
    ssid?: string;
    chipset?: string;
    firmwareVersion?: string;
  };
  bluetooth?: {
    macAddress?: string;
    protocol?: 'BLE' | 'Classic';
    manufacturer?: string;
    firmwareVersion?: string;
    batteryLevel?: number;
    rssi?: number;
  };
  gsm?: {
    imei?: string;
    iccid?: string;
    apn?: string;
    networkType?: '2G' | '3G' | '4G' | 'LTE';
    location?: {
      lat: number;
      lng: number;
      altitude?: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const networkDeviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    protocol: {
      type: String,
      enum: ['lorawan', 'wifi', 'bluetooth', 'gsm'],
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'error', 'provisioning'],
      default: 'offline',
    },
    signalStrength: {
      type: Number,
      min: 0,
      max: 100,
    },
    lastSeen: {
      type: Date,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    mqttDeviceId: {
      type: String,
      trim: true,
      // e.g. 'my-sensor-01' → publishes to devices/my-sensor-01/data
    },
    lorawan: {
      devEui: { type: String, trim: true },
      appId: { type: String, trim: true },
      activationMode: { type: String, enum: ['OTAA', 'ABP'] },
      deviceClass: { type: String, enum: ['A', 'B', 'C'] },
      appKey: { type: String, trim: true },
      devAddr: { type: String, trim: true },
    },
    wifi: {
      macAddress: { type: String, trim: true },
      ipAddress: { type: String, trim: true },
      ssid: { type: String, trim: true },
      chipset: { type: String, trim: true },
      firmwareVersion: { type: String, trim: true },
    },
    bluetooth: {
      macAddress: { type: String, trim: true },
      protocol: { type: String, enum: ['BLE', 'Classic'] },
      manufacturer: { type: String, trim: true },
      firmwareVersion: { type: String, trim: true },
      batteryLevel: { type: Number, min: 0, max: 100 },
      rssi: { type: Number },
    },
    gsm: {
      imei: { type: String, trim: true },
      iccid: { type: String, trim: true },
      apn: { type: String, trim: true },
      networkType: { type: String, enum: ['2G', '3G', '4G', 'LTE'] },
      location: {
        lat: { type: Number },
        lng: { type: Number },
        altitude: { type: Number },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
networkDeviceSchema.index({ owner: 1 });
networkDeviceSchema.index({ owner: 1, protocol: 1 });
networkDeviceSchema.index({ 'lorawan.devEui': 1 }, { sparse: true });
networkDeviceSchema.index({ 'gsm.imei': 1 }, { sparse: true });

export const NetworkDevice = mongoose.model<INetworkDevice>('NetworkDevice', networkDeviceSchema);
