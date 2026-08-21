import type { NextConfig } from 'next';

/* GitHub Pages раздаёт статику: серверных функций и middleware
   там нет, поэтому экспортируем всё в HTML. Для нашего продукта
   это ничего не стоит — весь рантайм и так на клиенте */
const isPages = process.env.DEPLOY_TARGET === 'pages';

/* На своём домене префикса в пути нет — сайт лежит в корне.
   Оставить '/topic-roulette' значит сломать все ссылки, стили
   и шрифты разом: они начнут искаться на уровень глубже */
const BASE = process.env.CUSTOM_DOMAIN ? '' : '/topic-roulette';

const nextConfig: NextConfig = {
  ...(isPages
    ? {
        output: 'export',
        ...(BASE ? { basePath: BASE } : {}),
        images: { unoptimized: true },
        /* Каждая страница становится папкой с index.html —
           иначе Pages отдаёт 404 на /ru */
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
