/**
 * Environment Variable Validation Module
 * Validates all required environment variables at startup
 * Exits with clear error messages if any are missing or invalid
 */

interface EnvConfig {
  required: boolean;
  minLength?: number;
  pattern?: RegExp;
  description: string;
}

const envSchema: Record<string, EnvConfig> = {
  NODE_ENV: {
    required: false,
    description: 'Environment mode (development/production)'
  },
  PORT: {
    required: false,
    description: 'Server port'
  },
  MONGODB_URI: {
    required: true,
    description: 'MongoDB connection string'
  },
  JWT_SECRET: {
    required: true,
    minLength: 64,
    description: 'JWT signing secret (minimum 64 characters)'
  },
  WIFI_ENCRYPTION_KEY: {
    required: true,
    minLength: 64,
    pattern: /^[0-9a-fA-F]{64}$/,
    description: 'WiFi encryption key (exactly 64 hex characters for AES-256)'
  },
  GOOGLE_CLIENT_ID: {
    required: true,
    description: 'Google OAuth Client ID'
  },
  FRONTEND_URL: {
    required: true,
    description: 'Frontend URL for CORS'
  }
};

// Production-only required variables
const productionEnvSchema: Record<string, EnvConfig> = {
  AWS_REGION: {
    required: true,
    description: 'AWS region for IoT Core'
  },
  AWS_IOT_ENDPOINT: {
    required: true,
    pattern: /^[a-z0-9-]+\.iot\.[a-z0-9-]+\.amazonaws\.com$/,
    description: 'AWS IoT Core endpoint'
  },
  AWS_IOT_CERT_PATH: {
    required: true,
    description: 'Path to AWS IoT certificate file'
  },
  AWS_IOT_KEY_PATH: {
    required: true,
    description: 'Path to AWS IoT private key file'
  },
  AWS_IOT_CA_PATH: {
    required: true,
    description: 'Path to AWS IoT CA certificate file'
  }
};

interface ValidationError {
  variable: string;
  message: string;
}

export function validateEnv(): void {
  const errors: ValidationError[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Combine base schema with production schema if in production
  const schema = isProduction
    ? { ...envSchema, ...productionEnvSchema }
    : envSchema;

  for (const [name, config] of Object.entries(schema)) {
    const value = process.env[name];

    // Check required
    if (config.required && !value) {
      errors.push({
        variable: name,
        message: `Missing required environment variable: ${name} - ${config.description}`
      });
      continue;
    }

    // Skip optional vars that aren't set
    if (!value) continue;

    // Check minimum length
    if (config.minLength && value.length < config.minLength) {
      errors.push({
        variable: name,
        message: `${name} must be at least ${config.minLength} characters (got ${value.length}) - ${config.description}`
      });
    }

    // Check pattern
    if (config.pattern && !config.pattern.test(value)) {
      errors.push({
        variable: name,
        message: `${name} has invalid format - ${config.description}`
      });
    }
  }

  // If there are errors, print them all and exit
  if (errors.length > 0) {
    console.error('\n========================================');
    console.error('  ENVIRONMENT VALIDATION FAILED');
    console.error('========================================\n');

    for (const error of errors) {
      console.error(`  [ERROR] ${error.message}`);
    }

    console.error('\n----------------------------------------');
    console.error('  Please set the required environment variables');
    console.error('  See .env.production.example for reference');
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  console.log('Environment validation passed');
}

export function getEnvConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    port: parseInt(process.env.PORT || '5000', 10),
    mongodbUri: process.env.MONGODB_URI!,
    jwtSecret: process.env.JWT_SECRET!,
    wifiEncryptionKey: process.env.WIFI_ENCRYPTION_KEY!,
    googleClientId: process.env.GOOGLE_CLIENT_ID!,
    frontendUrl: process.env.FRONTEND_URL!,
    mqttPort: parseInt(process.env.MQTT_PORT || '1883', 10),
    // AWS IoT Core (production only)
    awsRegion: process.env.AWS_REGION,
    awsIotEndpoint: process.env.AWS_IOT_ENDPOINT,
    awsIotCertPath: process.env.AWS_IOT_CERT_PATH,
    awsIotKeyPath: process.env.AWS_IOT_KEY_PATH,
    awsIotCaPath: process.env.AWS_IOT_CA_PATH
  };
}
