/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        // 商品图里有 Pexels 直链（坏图替换时引入）
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  /**
   * Apple Pay 域名验证文件。
   *
   * Apple 会在注册域名时抓取 https://lowflame.store/.well-known/apple-developer-merchantid-domain-association，
   * 要求：HTTPS、200、无 3xx 跳转、内容与 PayPal 后台下载的一致。
   *
   * 这个文件是「每个 PayPal 账号一份」，不能写死在仓库里，所以放到 gitignore 掉的 data/ 目录，
   * 由 API 路由按需读出。Apple 抓的是 /.well-known/... 这个路径，因此在这里做 rewrite。
   */
  async rewrites() {
    return [
      {
        source: '/.well-known/apple-developer-merchantid-domain-association',
        destination: '/api/paypal/applepay-domain-file',
      },
    ]
  },
}

module.exports = nextConfig
