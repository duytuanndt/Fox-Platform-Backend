module.exports = {
  apps: [
    {
      name: 'fox-platform-api',
      script: 'dist/main.js',
      cwd: '/home/ubuntu/group-server/Fox-Platform-Backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3668,
        ENABLE_I18N: 'false',
        ENABLE_DATABASE: 'false',
      },
    },
  ],
};
