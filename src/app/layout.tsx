import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

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
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-[#111111]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
