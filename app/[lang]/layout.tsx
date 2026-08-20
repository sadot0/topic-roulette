import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { display, ui } from '../fonts';
import { getDict, isLang, LANGS } from '@/i18n/config';
import type { Lang } from '@/lib/topics/types';
import '../globals.css';

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
    title: d.brand,
    description: d.tagline,
    /* Без этого ссылка в Telegram разворачивается голым текстом */
    openGraph: {
      title: d.brand,
      description: d.tagline,
      type: 'website',
      locale: lang === 'uz' ? 'uz_Latn' : lang,
    },
    twitter: { card: 'summary_large_image', title: d.brand, description: d.tagline },
    alternates: {
      languages: {
        ru: '/ru',
        en: '/en',
        'uz-Latn': '/uz',
        'x-default': '/ru',
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
    <html lang={lang === 'uz' ? 'uz-Latn' : (lang as Lang)}>
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
