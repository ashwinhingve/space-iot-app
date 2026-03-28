import mongoose from 'mongoose';

const gridLayoutSchema = new mongoose.Schema({
  i:      { type: String, required: true },
  x:      { type: Number, required: true },
  y:      { type: Number, required: true },
  w:      { type: Number, required: true },
  h:      { type: Number, required: true },
  minW:   { type: Number, default: 1 },
  minH:   { type: Number, default: 1 },
  maxW:   { type: Number },
  maxH:   { type: Number },
  static: { type: Boolean, default: false },
}, { _id: false });

const dataSourceSchema = new mongoose.Schema({
  path:           { type: String, required: true },
  label:          { type: String },
  unit:           { type: String },
  transform:      { type: String, enum: ['none','multiply','divide','round','toFixed1','toFixed2'], default: 'none' },
  transformValue: { type: Number },
}, { _id: false });

const widgetSchema = new mongoose.Schema({
  widgetId:         { type: String, required: true },
  type:             { type: String, required: true, enum: ['gauge','value','chart','button','switch','slider','led','terminal'] },
  label:            { type: String, default: '' },
  color:            { type: String, default: '#00e5ff' },
  backgroundColor:  { type: String },
  dataSource:       { type: dataSourceSchema },
  chartMaxPoints:   { type: Number, default: 50 },
  min:              { type: Number, default: 0 },
  max:              { type: Number, default: 100 },
  unit:             { type: String, default: '' },
  warningThreshold:  { type: Number },
  criticalThreshold: { type: Number },
  trueColor:  { type: String, default: '#22c55e' },
  falseColor: { type: String, default: '#ef4444' },
  onValue:    { type: mongoose.Schema.Types.Mixed },
  onPress: {
    apiType:      { type: String, enum: ['mqtt','ttn-downlink','valve','none'], default: 'none' },
    mqttDeviceId: { type: String },
    pressValue:   { type: Number, default: 1 },
    releaseValue: { type: Number, default: 0 },
    ttnAppId:     { type: String },
    ttnDeviceId:  { type: String },
    fPort:        { type: Number, default: 1 },
    valveId:      { type: String },
    valveAction:  { type: String, enum: ['ON','OFF','PULSE'] },
  },
  sliderMin:  { type: Number, default: 0 },
  sliderMax:  { type: Number, default: 100 },
  sliderStep: { type: Number, default: 1 },
  layout:     { type: gridLayoutSchema, required: true },
}, { _id: false });

const deviceRefSchema = new mongoose.Schema({
  deviceType:        { type: String, required: true, enum: ['ttn','wifi','manifold','mqtt'] },
  ttnApplicationId:  { type: String },
  ttnDeviceId:       { type: String },
  deviceId:          { type: String },
  manifoldId:        { type: String },
  deviceName:        { type: String },
}, { _id: false });

export interface IConsoleDashboard extends mongoose.Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  deviceRef: {
    deviceType: 'ttn' | 'wifi' | 'manifold' | 'mqtt';
    ttnApplicationId?: string;
    ttnDeviceId?: string;
    deviceId?: string;
    manifoldId?: string;
    deviceName?: string;
  };
  widgets: any[];
  isPublic: boolean;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const consoleDashboardSchema = new mongoose.Schema<IConsoleDashboard>({
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 300 },
  icon:        { type: String, default: 'LayoutDashboard' },
  color:       { type: String, default: '#00e5ff' },
  deviceRef:   { type: deviceRefSchema, required: true },
  widgets:     { type: [widgetSchema] as unknown as typeof mongoose.Schema.Types.Mixed, default: [] },
  isPublic:    { type: Boolean, default: false },
  templateId:  { type: String },
}, { timestamps: true });

consoleDashboardSchema.index({ owner: 1, createdAt: -1 });

export const ConsoleDashboard = mongoose.model<IConsoleDashboard>('ConsoleDashboard', consoleDashboardSchema);
