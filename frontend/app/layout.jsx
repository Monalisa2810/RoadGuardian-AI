import './globals.css';

export const metadata = {
  title: 'RoadGuardian AI',
  description: 'AI-Powered Road Damage Assessment',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
