"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { GhostOverlay } from "@/components/ghost-overlay";
import { DailyLogger } from "@/components/daily-logger";
import { GroupModal } from "@/components/group-modal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/app-context";

export default function OverlayPage() {
  const router = useRouter();
  const {
    user,
    groups,
    currentGroup,
    records,
    loading,
    mounted,
    isConfigured,
    userMemberInfo,
    myTodayRecord,
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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-pulse" />
          <span className="font-extrabold text-base text-[#111111] tracking-tight">매일재라</span>
        </div>
        <p className="text-xs text-[#999999]">겹쳐보기 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (!isConfigured || !user || !currentGroup) {
    if (mounted && !user) {
      router.replace("/auth/login");
      return null;
    }
  }

  const myUserRecords = user ? records.filter((r) => r.user_id === user.id) : [];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {user && currentGroup && (
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
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-28 md:pb-12">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-xs font-semibold shadow-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF4D00] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-1.5 rounded-[6px] hover:bg-[#F4F4F5] text-[#666666] hover:text-[#111111] transition-colors md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#FF4D00]" />
                눈바디 겹쳐보기 & 비교
              </h1>
              <p className="text-xs text-[#666666]">
                과거와 현재의 체형 라인을 1:1로 직접 겹쳐보며 감량 효과를 확인하세요.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setLoggerOpen(true)}
            className="gap-1.5 text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            눈바디 추가
          </Button>
        </div>

        {/* Fullscreen Ghost Overlay Container */}
        <div className="bg-white border border-[#E5E5E5] rounded-[10px] p-4 sm:p-6 shadow-2xs">
          <GhostOverlay records={myUserRecords} />
        </div>
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
          startWeight={user?.start_weight}
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
