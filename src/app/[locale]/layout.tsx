import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import '../globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-en',
    display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['arabic'],
    variable: '--font-ar',
    display: 'swap',
});

export const metadata = {
    title: 'THABAT — Stability Intelligence',
    description: 'C-Suite SME Stability Intelligence Dashboard. Real-time stability scoring and driver analysis.',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const messages = await getMessages();
    const isRTL = locale === 'ar';
    const fontClass = isRTL ? ibmPlexArabic.variable : inter.variable;

    return (
        <html
            lang={locale}
            dir={isRTL ? 'rtl' : 'ltr'}
            data-theme="dark"
            suppressHydrationWarning
        >
            <head>
                {/* Theme-color for mobile browser chrome */}
                <meta name="theme-color" content="#1E2130" />
                {/* Inline script to prevent theme flicker */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              (function() {
                try {
                  var t = localStorage.getItem('thabat-theme');
                  if (t === 'light' || t === 'dark') {
                    document.documentElement.setAttribute('data-theme', t);
                  }
                  // Default is dark (set in HTML attribute), no system preference override
                } catch(e) {}
              })();
            `,
                    }}
                />
            </head>
            <body
                className={fontClass}
                style={{
                    fontFamily: isRTL
                        ? 'var(--font-ar), "IBM Plex Sans Arabic", sans-serif'
                        : 'var(--font-en), "Inter", sans-serif',
                }}
            >
                <NextIntlClientProvider messages={messages}>
                    <ThemeProvider>
                        <AuthProvider>
                            {children}
                        </AuthProvider>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
