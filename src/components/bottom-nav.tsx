"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Eye, Plus, Trophy, Users } from "lucide-react";

interface BottomNavProps {
  onOpenLogger: () => void;
}

export function BottomNav({ onOpenLogger }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "대시보드",
      icon: LayoutDashboard,
      isActive: pathname === "/",
    },
    {
      href: "/overlay",
      label: "눈바디",
      icon: Eye,
      isActive: pathname === "/overlay",
    },
    // center item is '+' action button
    {
      href: "/leaderboard",
      label: "리더보드",
      icon: Trophy,
      isActive: pathname === "/leaderboard",
    },
    {
      href: "/group",
      label: "내 그룹",
      icon: Users,
      isActive: pathname === "/group",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] px-2 pt-1 pb-[calc(0.4rem+env(safe-area-inset-bottom))] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] select-none">
      <div className="w-full flex items-center justify-around relative">
        {/* 1. 홈 / 대시보드 */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-2 transition-all cursor-pointer min-w-[56px] min-h-[44px] active:scale-95 ${
            pathname === "/" ? "text-[#FF4D00] font-bold" : "text-[#666666] hover:text-[#111111]"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[12px] tracking-tight mt-1">대시보드</span>
        </Link>

        {/* 2. 눈바디 */}
        <Link
          href="/overlay"
          className={`flex flex-col items-center justify-center py-1 px-2 transition-all cursor-pointer min-w-[56px] min-h-[44px] active:scale-95 ${
            pathname?.startsWith("/overlay") ? "text-[#FF4D00] font-bold" : "text-[#666666] hover:text-[#111111]"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span className="text-[12px] tracking-tight mt-1">눈바디</span>
        </Link>

        {/* 3. 중앙 액션: 오늘 1초 기록 (+) */}
        <div className="relative -top-3.5">
          <button
            type="button"
            onClick={onOpenLogger}
            aria-label="오늘 기록하기"
            className="w-13 h-13 rounded-full bg-[#FF4D00] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(255,77,0,0.35)] hover:bg-[#E64500] active:scale-90 transition-all cursor-pointer border-[3px] border-white"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. 리더보드 */}
        <Link
          href="/leaderboard"
          className={`flex flex-col items-center justify-center py-1 px-2 transition-all cursor-pointer min-w-[56px] min-h-[44px] active:scale-95 ${
            pathname === "/leaderboard" ? "text-[#FF4D00] font-bold" : "text-[#666666] hover:text-[#111111]"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span className="text-[12px] tracking-tight mt-1">리더보드</span>
        </Link>

        {/* 5. 마이페이지 */}
        <Link
          href="/group"
          className={`flex flex-col items-center justify-center py-1 px-2 transition-all cursor-pointer min-w-[56px] min-h-[44px] active:scale-95 ${
            pathname === "/group" ? "text-[#FF4D00] font-bold" : "text-[#666666] hover:text-[#111111]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[12px] tracking-tight mt-1">마이페이지</span>
        </Link>
      </div>
    </nav>
  );
}
