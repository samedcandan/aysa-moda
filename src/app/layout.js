import './globals.css';

export const metadata = {
  title: 'AI Moda Stüdyosu — Kıyafet Fotoğraflarını Videoya Dönüştür',
  description: 'E-ticaret siteleri ve butikler için statik kıyafet fotoğraflarını saniyeler içinde canlı yapay zeka manken videolarına dönüştüren jeneratif AI çözümü.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AI Moda Stüdyosu',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#d4a017',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(event) {
                var div = document.getElementById('debug-error-banner');
                if (!div) {
                  div = document.createElement('div');
                  div.id = 'debug-error-banner';
                  div.style.position = 'fixed';
                  div.style.top = '0';
                  div.style.left = '0';
                  div.style.width = '100%';
                  div.style.backgroundColor = '#dc3545';
                  div.style.color = '#fff';
                  div.style.zIndex = '999999';
                  div.style.padding = '16px';
                  div.style.fontFamily = 'monospace';
                  div.style.fontSize = '14px';
                  div.style.whiteSpace = 'pre-wrap';
                  div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                  document.body.appendChild(div);
                }
                div.innerText += 'Uncaught Error: ' + event.message + '\\nSource: ' + event.filename + ':' + event.lineno + '\\n\\n';
              });
              window.addEventListener('unhandledrejection', function(event) {
                var div = document.getElementById('debug-error-banner');
                if (!div) {
                  div = document.createElement('div');
                  div.id = 'debug-error-banner';
                  div.style.position = 'fixed';
                  div.style.top = '0';
                  div.style.left = '0';
                  div.style.width = '100%';
                  div.style.backgroundColor = '#85144b';
                  div.style.color = '#fff';
                  div.style.zIndex = '999999';
                  div.style.padding = '16px';
                  div.style.fontFamily = 'monospace';
                  div.style.fontSize = '14px';
                  div.style.whiteSpace = 'pre-wrap';
                  div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                  document.body.appendChild(div);
                }
                div.innerText += 'Unhandled Promise Rejection: ' + event.reason + '\\n\\n';
              });
            `
          }}
        />
        {children}
      </body>
    </html>
  );
}
