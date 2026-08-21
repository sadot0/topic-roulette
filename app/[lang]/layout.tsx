import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { display, ui } from '../fonts';
import { getDict, isLang, LANGS } from '@/i18n/config';
import type { Lang } from '@/lib/topics/types';
import { isRtl } from '@/lib/topics/types';
import '../globals.css';

/* Один источник адреса на весь проект */
const SITE = process.env.CUSTOM_DOMAIN
  ? `https://${process.env.CUSTOM_DOMAIN}`
  : 'https://sadot0.github.io/topic-roulette';

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: '#0E1016',
  colorScheme: 'dark',
  /* Без cover все env(safe-area-inset-*) в CSS равны 0px */
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const d = getDict(lang);

  return {
    /* Абсолютные адреса: относительные в OG-тегах не работают —
       мессенджер не знает, от какого хоста их считать */
    metadataBase: new URL(SITE),
    title: d.brand,
    description: d.tagline,
    /* Без этого ссылка в Telegram разворачивается голым текстом */
    openGraph: {
      title: d.brand,
      description: d.tagline,
      type: 'website',
      url: `/${lang}/`,
      siteName: d.brand,
      locale: lang === 'uz' ? 'uz_Latn' : lang,
    },
    twitter: { card: 'summary_large_image', title: d.brand, description: d.tagline },
    alternates: {
      canonical: `/${lang}/`,
      languages: {
        ru: '/ru/',
        uz: '/uz/',
        kk: '/kk/',
        tr: '/tr/',
        en: '/en/',
        es: '/es/',
        pt: '/pt/',
        ar: '/ar/',
        'x-default': '/ru/',
      },
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    /* Узбекский помечаем uz-Latn: тексты на латинице */
    <html
      lang={lang === 'uz' ? 'uz-Latn' : lang}
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
    >
      <body className={`${display.variable} ${ui.variable}`}>
        {/* Фильтр обязан существовать до первого кадра спина,
            поэтому живёт в layout, а не в клиентском островке */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
          <filter id="vblur" x="-5%" y="-25%" width="110%" height="150%">
            <feGaussianBlur id="vblur-g" in="SourceGraphic" stdDeviation="0 0" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
