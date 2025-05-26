import './globals.css';

export const metadata = {
  title: 'AIOStreams',
  description: 'The all in one addon for Stremio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
