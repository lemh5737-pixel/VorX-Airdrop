import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const acceptHeader = request.headers.get('accept') || '';
  const ip = request.headers.get('x-forwarded-for') || 'UNKNOWN';

  // --- IZINKAN API & FILE STATIS ---
  if (
    pathname.startsWith('/api/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.gif')
  ) {
    return NextResponse.next();
  }

  // --- DETEKSI BOT / FETCH / SCRAPER ---
  const botOrFetcherPattern =
    /(axios|node-fetch|curl|python|wget|postman|httpclient|cheerio|go-http|java|okhttp|libwww)/i;

  const looksLikeBrowser = /mozilla|chrome|safari|firefox|edge/i.test(userAgent);

  const isBot =
    !looksLikeBrowser ||
    botOrFetcherPattern.test(userAgent) ||
    !acceptHeader.includes('text/html');

  if (isBot) {

    return new NextResponse(
      JSON.stringify({
        status: 200,
        pesan: '🤓<HTML> ANJAZ TES LAGI DONG ENAK DI MASUKIN </HTML>',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
