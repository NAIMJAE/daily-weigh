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
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] shrink-0" />
            <span className="font-extrabold text-base sm:text-lg text-[#111111] tracking-tight">
              매일재라
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-semibold">
              {user.nickname.slice(0, 1)}
            </div>
            <span className="text-xs text-[#666666] hidden sm:block">
              {user.nickname}
            </span>
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
            <p className="text-[11px] text-[#999999]">
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

      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-28 md:pb-12">
        {/* Top CTA Banner */}
        <section className="p-4 sm:p-5 bg-white border border-[#E5E5E5] rounded-[10px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-[#FF4D00] shrink-0" />
              <h2 className="text-sm font-bold text-[#111111]">
                {myTodayRecord ? "오늘의 출석 완료! 🎉" : "오늘도 가볍게 1개만 올려볼까요?"}
              </h2>
              <span className="text-[11px] font-bold text-[#FF4D00] bg-[#FFF1EB] border border-[#FFD8CC] px-2 py-0.5 rounded-[4px]">
                {currentGroup.name}
              </span>
              {myTodayRecord ? (
                <Badge variant="success">기록 완료 (+{myTodayRecord.points_earned}P)</Badge>
              ) : (
                <Badge variant="accent">당일 미완료</Badge>
              )}
            </div>
            <p className="text-xs text-[#666666]">
              {myTodayRecord
                ? `[${currentGroup.name}] 언제든 추가 항목을 수정할 수 있어요 · 연속 ${userMemberInfo?.streak_days ?? 0}일째 스트릭 유지 중!`
                : `[${currentGroup.name}] 체중, 눈바디, 운동 중 딱 1개만 입력해도 오늘 출석이 인정됩니다.`}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link
              href="/overlay"
              className="gap-1.5 flex-1 sm:flex-none inline-flex items-center justify-center font-medium transition-colors rounded-[8px] bg-white text-[#111111] border border-[#E5E5E5] hover:bg-[#F4F4F5] px-3.5 py-2 text-xs"
            >
              <Eye className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
              겹쳐보기 ({myPhotoRecords.length}장)
            </Link>
            <Button
              variant="primary"
              onClick={() => setLoggerOpen(true)}
              className="gap-1.5 flex-1 sm:flex-none whitespace-nowrap text-xs px-4"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              {myTodayRecord ? "기록 수정" : "오늘 기록"}
            </Button>
          </div>
        </section>

        {/* Feature Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: 겹쳐보기 */}
          <Link
            href="/overlay"
            className="p-4 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-[10px] transition-all group flex flex-col justify-between space-y-3 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-[#FFF1EB] border border-[#FFD8CC] flex items-center justify-center">
                <Eye className="w-4 h-4 text-[#FF4D00]" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#FF4D00] bg-[#FFF1EB] px-2 py-0.5 rounded">
                사진 {myPhotoRecords.length}장
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#111111] group-hover:text-[#FF4D00] transition-colors flex items-center gap-1">
                눈바디 겹쳐보기 & 스플릿
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-[11px] text-[#666666] mt-0.5">
                과거와 현재 사진을 슬라이더로 직접 겹쳐서 비교
              </p>
            </div>
          </Link>

          {/* Card 2: 리더보드 */}
          <Link
            href="/leaderboard"
            className="p-4 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-[10px] transition-all group flex flex-col justify-between space-y-3 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#111111] bg-[#F4F4F5] px-2 py-0.5 rounded">
                내 점수 {userMemberInfo?.weekly_points ?? 0}P
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#111111] group-hover:text-[#FF4D00] transition-colors flex items-center gap-1">
                주간 랭킹 & 매콤 독설 피드
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-[11px] text-[#666666] mt-0.5">
                노력 포인트 순위 확인 및 미기록자 친구 콕 찌르기
              </p>
            </div>
          </Link>

          {/* Card 3: 내 그룹 & 친구 초대 */}
          <Link
            href="/group"
            className="p-4 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-[10px] transition-all group flex flex-col justify-between space-y-3 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                멤버 {members.length}명
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#111111] group-hover:text-[#FF4D00] transition-colors flex items-center gap-1">
                그룹 관리 & 초대 링크
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-[11px] text-[#666666] mt-0.5">
                벌칙 룰 확인 및 카카오톡 단톡방 초대 링크 복사
              </p>
            </div>
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
