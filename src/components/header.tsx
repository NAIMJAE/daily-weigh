"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  Users,
  Plus,
  Share2,
  LogOut,
  ChevronDown,
  Check,
  LayoutDashboard,
  Eye,
  Trophy,
} from "lucide-react";
import { Group, GroupMember, UserProfile } from "@/types";
import { Badge } from "./ui/badge";

interface HeaderProps {
  user: UserProfile;
  currentGroup: Group;
  groups: Group[];
  userMemberInfo?: GroupMember;
  onOpenNewGroup: () => void;
  onOpenInvite: () => void;
  onSelectGroup: (group: Group) => void;
  onLogout: () => void;
}

export function Header({
  user,
  currentGroup,
  groups,
  userMemberInfo,
  onOpenNewGroup,
  onOpenInvite,
  onSelectGroup,
  onLogout,
}: HeaderProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const streak = userMemberInfo?.streak_days ?? 0;

  const navLinks = [
    { href: "/", label: "대시보드", icon: LayoutDashboard },
    { href: "/overlay", label: "겹쳐보기", icon: Eye },
    { href: "/leaderboard", label: "리더보드", icon: Trophy },
    { href: "/group", label: "내 그룹", icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5] px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Group Selector */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0 group">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] inline-block shrink-0" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-base sm:text-lg text-[#111111] tracking-tight whitespace-nowrap">
                매일재라
              </span>
              <span className="text-[10px] text-[#999999] font-medium tracking-normal hidden md:inline whitespace-nowrap">
                Daily Weigh
              </span>
            </div>
          </Link>

          <div className="h-4 w-px bg-[#E5E5E5] hidden sm:block shrink-0" />

          {/* Group Switcher */}
          <div className="relative min-w-0 shrink">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-[6px] hover:bg-[#F4F4F5] text-xs font-semibold text-[#111111] transition-colors border border-[#E5E5E5] cursor-pointer max-w-[130px] sm:max-w-[180px]"
            >
              <Users className="w-3.5 h-3.5 text-[#666666] shrink-0" />
              <span className="truncate text-left">{currentGroup.name}</span>
              <ChevronDown className="w-3 h-3 text-[#999999] shrink-0 ml-auto" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setDropdownOpen(false)}
                />
                <div
                  className="absolute left-0 top-full mt-1.5 w-60 sm:w-64 bg-white border border-[#E5E5E5] rounded-[8px] shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold text-[#999999] uppercase tracking-wider">
                    내 그룹 목록
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => onSelectGroup(g)}
                        className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F4F4F5] transition-colors"
                      >
                        <span className="truncate text-[#111111] font-medium">{g.name}</span>
                        {g.id === currentGroup.id && (
                          <Check className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-[#E5E5E5] my-1" />
                  <button
                    onClick={onOpenNewGroup}
                    className="w-full text-left px-3 py-2 text-xs text-[#FF4D00] font-medium hover:bg-[#FFF1EB] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    새 그룹 만들기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Desktop Nav Links (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F4F4F5] p-1 rounded-[8px] border border-[#E5E5E5]">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all ${
                  active
                    ? "bg-white text-[#FF4D00] shadow-2xs"
                    : "text-[#666666] hover:text-[#111111]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-[#FF4D00]" : "text-[#666666]"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Streak & Profile & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Daily Streak */}
          <Badge
            variant={streak > 0 ? "accent" : "default"}
            className="py-1 px-2 sm:px-2.5 whitespace-nowrap shrink-0"
          >
            <Flame className="w-3.5 h-3.5 fill-current text-[#FF4D00] shrink-0" />
            <span className="font-bold text-xs text-[#111111]">
              <span className="inline sm:hidden">{streak}일</span>
              <span className="hidden sm:inline">{streak}일 연속</span>
            </span>
          </Badge>

          {/* User Info */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-[#E5E5E5] shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {user.nickname.slice(0, 1)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-[#111111] leading-tight truncate max-w-[90px]">
                {user.nickname}
              </div>
              <div className="text-[10px] text-[#999999] leading-tight">
                @{user.username}
              </div>
            </div>

            <button
              onClick={onLogout}
              title="로그아웃"
              className="p-1.5 text-[#999999] hover:text-[#111111] hover:bg-[#F4F4F5] rounded-[6px] transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
