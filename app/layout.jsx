import "./globals.css";

export const metadata = {
  title: "Global Cup Draft 2026",
  description: "Собери сборную мечты из участников чемпионата мира 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
