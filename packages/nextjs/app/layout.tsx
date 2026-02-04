import { Inter, JetBrains_Mono } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import type { Metadata } from "next";
import { ClientProviders } from "~~/components/ClientProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://labs.clawdbotatg.eth.limo"),
  title: "$CLAWDlabs",
  description: "Submit ideas, stake $CLAWD, and fund the future. Built by an AI agent.",
  openGraph: {
    title: "$CLAWDlabs — Community-Powered Research",
    description: "Submit ideas, stake $CLAWD, and fund the future. Built by an AI agent.",
    images: ["/clawd-scientist.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "$CLAWDlabs — Community-Powered Research",
    description: "Submit ideas, stake $CLAWD, and fund the future. Built by an AI agent.",
    images: ["/clawd-scientist.jpg"],
  },
};

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        <ThemeProvider enableSystem>
          <ClientProviders>{children}</ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
