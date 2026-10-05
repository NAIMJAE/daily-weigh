"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Eye,
  Trophy,
  Users,
  Sparkles,
  ArrowRight,
  Flame,
  Scale,
  TrendingDown,
  Camera,
} from "lucide-react";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { DailyLogger } from "@/components/daily-logger";
import { GroupWeightChart } from "@/components/group-weight-chart";
import { GroupModal } from "@/components/group-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/context/app-context";
import { UserProfile } from "@/types";

// "그룹 없음" 빈 상태 UI
function NoGroupView({
  user,
  onOpenNewGroup,
  onLogout,
}: {
  user: UserProfile;
  onOpenNewGroup: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5] px-4 py-2.5">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] shrink-0" />
            <span className="font-extrabold text-base text-[#111111] tracking-tight">
              매일재라
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-semibold">
              {user.nickname.slice(0, 1)}
            </div>
            <button
              onClick={onLogout}
              className="text-xs text-[#999999] hover:text-[#111111] px-2 py-1 rounded-[6px] hover:bg-[#F4F4F5] cursor-pointer"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#FFF1EB] border border-[#FFD8CC] flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-[#FF4D00]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[#111111]">
              아직 소속된 그룹이 없습니다
            </h1>
            <p className="text-sm text-[#666666] leading-relaxed">
              그룹을 만들거나 친구의 초대 링크를 통해 참여하면
              <br />
              함께 체중 변화를 기록하고 서로 자극을 줄 수 있습니다.
            </p>
          </div>

          <div className="space-y-2.5">
            <Button
              variant="primary"
              className="w-full gap-2"
              onClick={onOpenNewGroup}
            >
              <Plus className="w-4 h-4" />
              새 그룹 만들기
            </Button>
            <p className="text-[13px] text-[#999999]">
              또는 친구에게 초대 링크를 받아 참여하세요.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    groups,
    currentGroup,
    members,
    records,
    loading,
    mounted,
    isConfigured,
    userMemberInfo,
    myTodayRecord,
    myPhotoRecords,
    loggerOpen,
    setLoggerOpen,
    toastMsg,
    selectGroup,
    saveDailyRecord,
    createNewGroup,
    logout,
  } = useApp();

  const [groupModalState, setGroupModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "invite";
  }>({ isOpen: false, mode: "create" });

  useEffect(() => {
    if (mounted && !loading && !user && isConfigured) {
      router.replace("/auth/login");
    }
  }, [mounted, loading, user, isConfigured, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-pulse" />
          <span className="font-extrabold text-base text-[#111111] tracking-tight">매일재라</span>
        </div>
        <p className="text-xs text-[#999999]">대시보드를 불러오는 중...</p>
      </div>
    );
  }

  // Supabase 미설정 안내
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
          <h1 className="text-lg font-bold text-[#111111]">Supabase 연결 필요</h1>
          <p className="text-sm text-[#666666]">
            Netlify 환경 변수 또는 <code className="bg-[#F4F4F5] px-1.5 py-0.5 rounded text-xs">.env.local</code> 파일에
            Supabase URL과 Anon Key를 설정해주세요.
          </p>
          <p className="text-xs text-[#999999]">SUPABASE_GUIDE.md를 참고하세요.</p>
        </div>
      </div>
    );
  }

  // 유저 없음 → 로그인 페이지로 이동 중
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-pulse" />
          <span className="font-extrabold text-base text-[#111111] tracking-tight">매일재라</span>
        </div>
        <p className="text-xs text-[#999999]">로그인 페이지로 이동 중...</p>
      </div>
    );
  }

  // 그룹 없음 → 빈 상태 UI
  if (!currentGroup) {
    return (
      <>
        <NoGroupView
          user={user}
          onOpenNewGroup={() => setGroupModalState({ isOpen: true, mode: "create" })}
          onLogout={logout}
        />
        <GroupModal
          isOpen={groupModalState.isOpen}
          mode="create"
          currentGroup={null}
          onClose={() => setGroupModalState({ ...groupModalState, isOpen: false })}
          onCreateGroup={createNewGroup}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header
        user={user}
        currentGroup={currentGroup}
        groups={groups}
        userMemberInfo={userMemberInfo}
        onOpenNewGroup={() => setGroupModalState({ isOpen: true, mode: "create" })}
        onOpenInvite={() => setGroupModalState({ isOpen: true, mode: "invite" })}
        onSelectGroup={selectGroup}
        onLogout={logout}
      />

      <main className="flex-1 w-full p-3.5 space-y-4 pb-28">
        {/* Top CTA Banner */}
        <section className="p-4 bg-white border border-[#E5E5E5] rounded-[10px] space-y-3 shadow-2xs">
          {/* 1행: 현재 선택된 그룹 이름 크게 표시 */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] shrink-0" />
            <h2 className="text-lg font-extrabold text-[#111111] tracking-tight">
              {currentGroup.name}
            </h2>
          </div>

          {/* 2행: 멘트만 (뱃지 없이) */}
          <p className="text-sm text-[#666666] font-medium">
            {myTodayRecord ? "오늘의 출석 완료! 🎉" : "오늘도 가볍게 1개만 올려볼까요?"}
          </p>

          {/* 3행: 오늘 기록하기 버튼만 표시 */}
          <div className="pt-0.5">
            <Button
              variant="primary"
              onClick={() => setLoggerOpen(true)}
              className="gap-2 px-5 py-2.5 text-sm font-semibold w-full"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {myTodayRecord ? "기록 수정하기" : "오늘 기록하기"}
            </Button>
          </div>
        </section>

        {/* Feature Navigation Cards (1행 3칸 모바일 최적화) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Card 1: 눈바디 */}
          <Link
            href="/overlay"
            className="p-3 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-[10px] transition-all group flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-[#FFF1EB] border border-[#FFD8CC] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Eye className="w-4 h-4 text-[#FF4D00]" />
            </div>
            <span className="text-xs font-bold text-[#111111] group-hover:text-[#FF4D00] transition-colors truncate">
              눈바디
            </span>
          </Link>

          {/* Card 2: 리더보드 */}
          <Link
            href="/leaderboard"
            className="p-3 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-[10px] transition-all group flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-[#111111] group-hover:text-[#FF4D00] transition-colors truncate">
              리더보드
            </span>
          </Link>

          {/* Card 3: 마이페이지 */}
          <Link
            href="/group"
            className="p-3 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-[10px] transition-all group flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-[#111111] group-hover:text-[#FF4D00] transition-colors truncate">
              마이페이지
            </span>
          </Link>
        </div>

        {/* Group Weight Change Multi-line Chart */}
        <section className="space-y-3">
          <GroupWeightChart members={members} records={records} />
        </section>
      </main>

      {/* Modals */}
      <Modal
        isOpen={loggerOpen}
        onClose={() => setLoggerOpen(false)}
        title="오늘의 기록"
        description="체중, 눈바디, 운동 중 원하는 것 1개만 입력해도 오늘 출석이 인정됩니다."
        maxWidth="md"
      >
        <DailyLogger
          currentRecord={myTodayRecord}
          startWeight={user.start_weight}
          groupName={currentGroup.name}
          onSave={saveDailyRecord}
          onClose={() => setLoggerOpen(false)}
        />
      </Modal>

      <GroupModal
        isOpen={groupModalState.isOpen}
        mode={groupModalState.mode}
        currentGroup={currentGroup}
        onClose={() => setGroupModalState({ ...groupModalState, isOpen: false })}
        onCreateGroup={createNewGroup}
      />

      <BottomNav onOpenLogger={() => setLoggerOpen(true)} />
    </div>
  );
}
