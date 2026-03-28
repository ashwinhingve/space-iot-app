import { z } from 'zod';

// ─── Reusable primitives ──────────────────────────────────────────────────────

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex value e.g. #00e5ff')
  .optional();

export const dotPath = z
  .string()
  .regex(/^[a-zA-Z0-9_.]+$/, 'Path may only contain letters, numbers, dots and underscores')
  .max(100)
  .optional();

// ─── Console Dashboard ────────────────────────────────────────────────────────

export const createDashboardSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(80).trim(),
  description: z.string().max(300).trim().optional(),
  icon:        z.string().max(50).optional(),
  color:       hexColor,
  deviceRef: z.object({
    deviceType:       z.enum(['ttn', 'wifi', 'manifold', 'mqtt']),
    ttnApplicationId: z.string().max(200).optional(),
    ttnDeviceId:      z.string().max(200).optional(),
    deviceId:         z.string().max(200).optional(),
    manifoldId:       z.string().max(200).optional(),
    deviceName:       z.string().max(100).optional(),
  }),
  templateId: z.string().max(80).optional(),
});

export const updateDashboardSchema = z.object({
  name:        z.string().min(1).max(80).trim().optional(),
  description: z.string().max(300).trim().optional(),
  icon:        z.string().max(50).optional(),
  color:       hexColor,
});

const dataSourceSchema = z.object({
  path:           z.string().regex(/^[a-zA-Z0-9_.]+$/).max(100),
  label:          z.string().max(80).optional(),
  unit:           z.string().max(20).optional(),
  transform:      z.enum(['none', 'multiply', 'divide', 'round', 'toFixed1', 'toFixed2']).optional(),
  transformValue: z.number().optional(),
});

const onPressSchema = z.object({
  apiType:     z.enum(['mqtt', 'ttn-downlink', 'valve', 'none']),
  mqttDeviceId: z.string().max(200).optional(),
  pressValue:  z.number().optional(),
  releaseValue: z.number().optional(),
  ttnAppId:    z.string().max(200).optional(),
  ttnDeviceId: z.string().max(200).optional(),
  fPort:       z.number().int().min(1).max(223).optional(),
  valveId:     z.string().max(200).optional(),
  valveAction: z.enum(['ON', 'OFF', 'PULSE']).optional(),
});

export const addWidgetSchema = z.object({
  type:     z.enum(['gauge', 'value', 'chart', 'button', 'switch', 'slider', 'led', 'terminal']),
  label:    z.string().max(80).optional(),
  color:    hexColor,
  backgroundColor: hexColor,
  unit:     z.string().max(20).optional(),
  min:      z.number().optional(),
  max:      z.number().optional(),
  warningThreshold:  z.number().optional(),
  criticalThreshold: z.number().optional(),
  trueColor:  z.string().max(20).optional(),
  falseColor: z.string().max(20).optional(),
  chartMaxPoints: z.number().int().min(5).max(500).optional(),
  sliderMin:  z.number().optional(),
  sliderMax:  z.number().optional(),
  sliderStep: z.number().positive().optional(),
  dataSource: dataSourceSchema.optional(),
  onPress:    onPressSchema.optional(),
  layout: z.object({
    i: z.string().optional(),
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(20),
    minW: z.number().int().min(1).optional(),
    minH: z.number().int().min(1).optional(),
    maxW: z.number().int().optional(),
    maxH: z.number().int().optional(),
  }),
});

export const updateWidgetSchema = addWidgetSchema.partial().omit({ type: true, layout: true }).extend({
  layout: z.object({
    i: z.string().optional(),
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(20),
    minW: z.number().int().min(1).optional(),
    minH: z.number().int().min(1).optional(),
  }).optional(),
});

// ─── Helper: parse or return 400 ─────────────────────────────────────────────

import { Response } from 'express';

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
  res: Response
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    });
    return null;
  }
  return result.data;
}
