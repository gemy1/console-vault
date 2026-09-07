import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Early inline bootstrap script to prevent any white/dark flash or LTR/RTL shift */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('console_vault_user_theme');
                  var lang = localStorage.getItem('vault_app_language_v1');
                  var isLight = theme === 'light';
                  var bg = isLight ? '#F5F7FB' : '#080C16';
                  document.documentElement.style.backgroundColor = bg;
                  if (document.body) {
                    document.body.style.backgroundColor = bg;
                  }
                  if (lang === 'ar') {
                    document.documentElement.dir = 'rtl';
                    document.documentElement.lang = 'ar';
                    document.documentElement.classList.add('rtl-mode');
                  } else {
                    document.documentElement.dir = 'ltr';
                    document.documentElement.lang = 'en';
                    document.documentElement.classList.remove('rtl-mode');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Preconnect & Load Cairo Font for Arabic Mode */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

html, body {
  background-color: #080C16;
}
@media (prefers-color-scheme: light) {
  html, body {
    background-color: #F5F7FB;
  }
}

/* UNIVERSAL CAIRO FONT FOR RTL & ARABIC MODE */
html[dir="rtl"],
html[lang="ar"],
body[dir="rtl"],
.rtl-mode,
[dir="rtl"],
html[dir="rtl"] *,
body[dir="rtl"] *,
.rtl-mode *,
[dir="rtl"] *,
[dir="rtl"] [class*="css-text"],
.rtl-mode [class*="css-text"],
[dir="rtl"] div[dir="auto"],
.rtl-mode div[dir="auto"],
[dir="rtl"] [class*="r-fontFamily"],
.rtl-mode [class*="r-fontFamily"],
[dir="rtl"] input,
.rtl-mode input,
[dir="rtl"] textarea,
.rtl-mode textarea {
  font-family: 'Cairo', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

[dir="rtl"] .monospace-code,
[dir="rtl"] code,
[dir="rtl"] pre,
.rtl-mode .monospace-code,
.rtl-mode code,
.rtl-mode pre {
  direction: ltr !important;
  text-align: left !important;
  font-family: monospace, Courier, monospace !important;
}
`;
