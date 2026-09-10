import "./globals.css";
import Header from "./components/Header";
import DemoBanner from "./components/DemoBanner";
import { AuthProvider } from "./components/AuthProvider";

export const metadata = {
  title: "Open Challenge ULHN × HAROPA Port",
};

// Mêmes polices que la maquette (Archivo + JetBrains Mono via Google Fonts).
export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DemoBanner />
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
