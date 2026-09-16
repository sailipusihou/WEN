/**
 * ecosystem.config.js —— PM2 进程配置。
 *
 * 为什么需要这个文件（服务器反复"假死"的预防措施之一）：
 *
 *   这台机器只有 2GB 内存。Next.js 应用长期运行（全站 force-dynamic、无缓存，
 *   每个请求都跑数据库）内存会缓慢上涨。涨到一定程度后：
 *     内存耗尽 → 疯狂 swap → 磁盘 IO 打满 → 所有进程卡在 D 状态
 *     → sshd 和 nginx 都拿不到响应 → 只能去控制台重启（已经发生多次）
 *
 *   PM2 默认**不会**因为内存超限重启进程。加上 max_memory_restart 之后，
 *   应用涨到阈值就先自己重启掉，把内存还回去，不会拖死整台机器。
 *
 *   阈值取 700M：
 *     · 应用正常占用约 150–300M，700M 已经明显异常
 *     · 留出余量给 nginx / sshd / 系统本身（总共 2GB）
 *
 * 用法（服务器上，在 /var/www/lowflame 目录）：
 *   pm2 delete lowflame 2>/dev/null
 *   pm2 start ecosystem.config.js
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'lowflame',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/lowflame',
      instances: 1,
      exec_mode: 'fork',

      // 内存超限自动重启（关键：防止应用拖死整台机器）
      max_memory_restart: '700M',

      // 崩溃后的重启策略：指数退避，避免疯狂重启把 CPU 打满
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 15,
      min_uptime: '20s',
      exp_backoff_restart_delay: 2000,

      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // 限制 Node 堆上限，超过就 GC 而不是无限涨到把机器换死
        NODE_OPTIONS: '--max-old-space-size=700',
        NEXT_TELEMETRY_DISABLED: '1',
      },

      // 日志：出问题时才有得查
      error_file: '/var/log/lowflame-error.log',
      out_file: '/var/log/lowflame-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
