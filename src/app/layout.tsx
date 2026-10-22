import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedShield AI — Cyber Mirror Engine | Healthcare Cyber Defense',
  description:
    'Graph-based hospital cybersecurity simulation framework. Emulates medical device networks, visualizes VLAN topology, runs confined lateral movement attacks, and normalizes multi-sensor telemetry.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-[#040a07] text-[#e1f3ec] antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
