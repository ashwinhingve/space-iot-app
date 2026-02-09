/**
 * PM2 Ecosystem Configuration
 * Production deployment configuration for IoT Space Backend
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 stop iotspace-backend
 *   pm2 delete iotspace-backend
 *
 * Monitor:
 *   pm2 status
 *   pm2 logs iotspace-backend
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'iotspace-backend',
      script: './dist/server.js',
      cwd: '/var/www/iotspace/backend',

      // Cluster mode - uses all available CPU cores
      instances: 'max',
      exec_mode: 'cluster',

      // Memory management
      max_memory_restart: '500M',

      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Logging
      log_file: '/var/log/iotspace/combined.log',
      out_file: '/var/log/iotspace/out.log',
      error_file: '/var/log/iotspace/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ],

  // Deployment configuration (optional - for pm2 deploy)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'api.spaceautotech.com',
      ref: 'origin/main',
      repo: 'git@github.com:ashwinhingve/space-iot-app.git',
      path: '/var/www/iotspace',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
