import './globals.css';

export const metadata = {
  title: 'CV Filter',
  description: 'استخراج وفرز السير الذاتية ',
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
