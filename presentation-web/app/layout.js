import "./globals.css";

export const metadata = {
  title: "Statistiky | BK Skokani Brno",
  description: "Přehled týmů, soupisek, hráčů a utkání BK Skokani Brno."
};

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
