import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Votações IFRS", template: "%s · Votações IFRS" },
  description: "Sistema de votações escolares: docentes criam votações, estudantes votam.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#237a32",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-brand-700 focus:shadow-[var(--shadow-overlay)]"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
