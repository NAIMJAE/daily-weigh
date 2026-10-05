"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { GhostOverlay } from "@/components/ghost-overlay";
import { DailyLogger } from "@/components/daily-logger";
import { GroupModal } from "@/components/group-modal";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/context/app-context";

export default function CompareOverlayPage() {
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
        <p className="text-xs text-[#999999]">겹쳐보기 데이터를 불러오는 중...</p>
      </div>
    );
  }

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

      <main className="flex-1 w-full p-3.5 space-y-3 pb-28">
        <GhostOverlay
          records={myUserRecords}
          onOpenAddPhoto={() => setLoggerOpen(true)}
        />
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
          groupName={currentGroup?.name}
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
