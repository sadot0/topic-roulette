import { NextResponse, type NextRequest } from 'next/server';
import { negotiate } from '@/i18n/config';

/** Только корень: matcher узкий, чтобы middleware не висел
    на каждом запросе за статикой */
export const config = { matcher: ['/'] };

export function middleware(req: NextRequest) {
  const lang = negotiate(req.headers.get('accept-language'));
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}`;
  return NextResponse.redirect(url);
}
