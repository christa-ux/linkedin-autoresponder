module.exports = {
  apps: [
    {
      name: 'linkedin-bot',
      script: 'src/index.ts',
      cwd: __dirname,
      interpreter: 'node',
      interpreter_args: '--import tsx',
      autorestart: true,
      max_restarts: 50,
      restart_delay: 3000,
      exp_backoff_restart_delay: 1000,
      kill_timeout: 8000,
      max_memory_restart: '1500M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
