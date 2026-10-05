import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Weigh (매일재라) — 친구들과 함께하는 다이어트 레이스",
  description: "매일 체중과 눈바디를 기록하고, '겹쳐보기'로 체형 변화를 확인하며 친구들과 자극을 주고받는 친목형 다이어트 플랫폼",
  keywords: ["다이어트", "체중기록", "눈바디", "체중변화", "다이어트앱", "매일재라"],
  authors: [{ name: "Daily Weigh Team" }],
  openGraph: {
    title: "Daily Weigh (매일재라) — 매일 재고 함께 살 뺀다!",
    description: "딱 1개만 올려도 출석 인정! 친구들과 겹쳐보는 체중 그래프와 주간 열정 랭킹, 매콤한 독설로 함께 완주하는 다이어트 웹",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FAFAFA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`h-full ${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-full flex flex-col bg-[#ECEEF2] text-[#111111] font-sans antialiased">
        <div className="w-full max-w-[480px] min-h-screen mx-auto bg-[#FAFAFA] flex flex-col relative sm:shadow-2xl sm:border-x sm:border-[#D4D4D8]">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
