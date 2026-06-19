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
        <div className="glow-container">
          <div className="glow-blob-1"></div>
          <div className="glow-blob-2"></div>
          <div className="glow-blob-3"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
