"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trophy, MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { Leaderboard } from "@/components/leaderboard";
import { PokeModal } from "@/components/poke-modal";
import { DailyLogger } from "@/components/daily-logger";
import { GroupModal } from "@/components/group-modal";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/context/app-context";
import { GroupMember } from "@/types";

export default function LeaderboardPage() {
  const router = useRouter();
  const {
    user,
    groups,
    currentGroup,
    members,
    records,
    pokes,
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
    sendPokeMessage,
    createNewGroup,
    logout,
  } = useApp();

  const [pokeTarget, setPokeTarget] = useState<GroupMember | null>(null);
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
        <p className="text-xs text-[#999999]">리더보드를 불러오는 중...</p>
      </div>
    );
  }

  if (!isConfigured || !user || !currentGroup) {
    if (mounted && !user) {
      router.replace("/auth/login");
      return null;
    }
  }

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

      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 pb-28 md:pb-12">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-xs font-semibold shadow-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF4D00] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-1.5 rounded-[6px] hover:bg-[#F4F4F5] text-[#666666] hover:text-[#111111] transition-colors md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#FF4D00]" />
                주간 열정 리더보드 & 독설 피드
              </h1>
              <p className="text-xs text-[#666666]">
                기록 활동으로 획득한 포인트 순위와 친구들의 매콤한 찌르기를 확인하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Grid: Left Leaderboard, Right Poke Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left: Leaderboard (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {currentGroup && user && (
              <Leaderboard
                currentGroup={currentGroup}
                members={members}
                records={records}
                currentUserId={user.id}
                onOpenPoke={(target) => setPokeTarget(target)}
              />
            )}
          </div>

          {/* Right: Tough Love Poke Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 sm:p-5 bg-white border border-[#E5E5E5] rounded-[8px] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                  실시간 독설 피드 ({pokes.length})
                </h4>
                <span className="text-[10px] text-[#999999] font-mono">Tough Love 🔥</span>
              </div>

              {pokes.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#999999] bg-[#FAFAFA] rounded-[8px] border border-[#E5E5E5] space-y-1">
                  <p className="font-medium text-[#111111]">아직 전송된 독설이 없습니다</p>
                  <p className="text-[11px] text-[#999999]">
                    왼쪽 순위표에서 오늘 미기록자 친구를 콕 찔러 자극을 보내보세요!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {pokes.map((poke) => {
                    const isMySent = poke.sender_id === user?.id;
                    const isMyReceived = poke.receiver_id === user?.id;
                    return (
                      <div
                        key={poke.id}
                        className={`p-3 rounded-[8px] border text-xs space-y-1.5 transition-colors ${
                          isMyReceived
                            ? "bg-red-50/70 border-red-200"
                            : isMySent
                            ? "bg-[#FFF9F6] border-[#FFD8CC]"
                            : "bg-[#FAFAFA] border-[#E5E5E5]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-semibold text-[#111111]">
                            <span className="w-4 h-4 rounded-full bg-[#111111] text-white flex items-center justify-center text-[9px]">
                              {(poke.sender_profile?.nickname || "친").slice(0, 1)}
                            </span>
                            <span>{poke.sender_profile?.nickname || "친구"}</span>
                            <span className="text-[#999999] font-normal">👉</span>
                            <span>{poke.receiver_profile?.nickname || "친구"}</span>
                            {isMyReceived && (
                              <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold">
                                나에게 온 독설!
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#999999]">
                            {new Date(poke.created_at).toLocaleDateString("ko-KR", {
                              month: "numeric",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="pl-5">
                          <p className="text-[#111111] font-medium leading-relaxed bg-white/80 p-2 rounded-[6px] border border-black/5 shadow-2xs">
                            "{poke.message}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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

      <PokeModal
        isOpen={Boolean(pokeTarget)}
        onClose={() => setPokeTarget(null)}
        targetMember={pokeTarget}
        onSendPoke={sendPokeMessage}
      />

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
