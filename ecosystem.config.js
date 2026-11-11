/**
 * ecosystem.config.js — PM2 para INFOSISTEL LAB (réplica de VPS)
 *
 * No contiene secretos: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY y
 * DNI_HMAC_SECRET se exportan desde .env.lab antes de `pm2 start`.
 * `scripts/lab/demo/start-pm2.sh` hace ese trabajo.
 */
module.exports = {
  apps: [
    {
      name: "infosistel-lab",
      script: ".next/standalone/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        // 0.0.0.0 para demo directa; 127.0.0.1 cuando Nginx es el único expuesto.
        HOSTNAME: process.env.LAB_HOST || "0.0.0.0",
      },
    },
  ],
};
