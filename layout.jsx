import './globals.css';

export const metadata = {
  description: 'استخراج وفرز السير الذاتية مجانًا',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
