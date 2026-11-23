import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";

// Serifa só nos títulos; baixada no build e servida pelo próprio app.
const serifa = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--fonte-serifa-carregada",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: { default: "Votações IFRS", template: "%s · Votações IFRS" },
  description: "Sistema de votações escolares: docentes criam votações, estudantes votam.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4f2c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={serifa.variable}>
      <body>
        <a href="#conteudo" className={styles.pular}>
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
