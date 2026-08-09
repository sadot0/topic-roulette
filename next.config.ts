import type { NextConfig } from 'next';

/* GitHub Pages раздаёт статику: серверных функций и middleware
   там нет, поэтому экспортируем всё в HTML. Для нашего продукта
   это ничего не стоит — весь рантайм и так на клиенте */
const isPages = process.env.DEPLOY_TARGET === 'pages';

const nextConfig: NextConfig = {
  ...(isPages
    ? {
        output: 'export',
        basePath: '/topic-roulette',
        images: { unoptimized: true },
        /* Каждая страница становится папкой с index.html —
           иначе Pages отдаёт 404 на /ru */
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
