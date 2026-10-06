"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  Users,
  Plus,
  LogOut,
  ChevronDown,
  Check,
  Eye,
  Trophy,
  ArrowLeft,
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

const PAGE_CONFIG: Record<string, { title: string; icon: React.ElementType; backHref?: string }> = {
  "/overlay": { title: "눈바디", icon: Eye, backHref: "/" },
  "/overlay/compare": { title: "눈바디 겹쳐보기", icon: Eye, backHref: "/overlay" },
  "/leaderboard": { title: "리더보드", icon: Trophy, backHref: "/" },
  "/group": { title: "마이페이지", icon: Users, backHref: "/" },
};

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
  const isSubpage = pathname !== "/" && !!PAGE_CONFIG[pathname];
  const currentPage = PAGE_CONFIG[pathname];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5] px-3.5 py-2.5">
      <div className="w-full flex items-center justify-between gap-2">
        {/* Left Section */}
        {isSubpage ? (
          /* Subpage Header: Back Button + Page Title */
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={currentPage?.backHref || "/"}
              className="p-1 -ml-1 rounded-[6px] hover:bg-[#F4F4F5] text-[#111111] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="돌아가기"
            >
              <ArrowLeft className="w-5 h-5 text-[#111111]" />
            </Link>
            <div className="flex items-center gap-1.5 min-w-0">
              {currentPage?.icon && (
                <currentPage.icon className="w-4 h-4 text-[#FF4D00] shrink-0" />
              )}
              <h1 className="text-base font-bold text-[#111111] truncate">
                {currentPage?.title}
              </h1>
              {currentGroup && (
                <span className="text-[11px] font-semibold text-[#666666] bg-[#F4F4F5] px-1.5 py-0.5 rounded-[4px] truncate max-w-[80px]">
                  {currentGroup.name}
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Dashboard Brand & Group Selector */
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-1.5 shrink-0 group">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] inline-block shrink-0" />
              <span className="font-extrabold text-base text-[#111111] tracking-tight whitespace-nowrap">
                매일재라
              </span>
            </Link>

            <div className="relative min-w-0 shrink">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] hover:bg-[#F4F4F5] text-xs font-semibold text-[#111111] transition-colors border border-[#E5E5E5] cursor-pointer max-w-[130px]"
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
                    className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-[#E5E5E5] rounded-[8px] shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[12px] font-semibold text-[#999999] uppercase tracking-wider">
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
        )}

        {/* Right Section: Streak & User Avatar & Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Daily Streak */}
          <Badge
            variant={streak > 0 ? "accent" : "default"}
            className="py-1 px-2 whitespace-nowrap shrink-0"
          >
            <Flame className="w-3.5 h-3.5 fill-current text-[#FF4D00] shrink-0" />
            <span className="font-bold text-xs text-[#111111]">
              {streak}일
            </span>
          </Badge>

          {/* User Avatar */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#E5E5E5] shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden border border-[#E5E5E5]">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.nickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user.nickname.slice(0, 1)}</span>
              )}
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
