import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nBoot } from "@/components/i18n-boot";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Maxfiy — Private Vault",
  description: "A private, zero-knowledge encrypted vault for one owner.",
  robots: { index: false, follow: false },
  applicationName: "Maxfiy",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const themeScript = `(function(){try{var t=localStorage.getItem('mx_theme')||'dark';var r=document.documentElement;if(t==='light'){r.classList.remove('dark');}else{r.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          // Applies the saved theme before first paint to prevent a flash.
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body>
        <ThemeProvider>
          <I18nBoot />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
