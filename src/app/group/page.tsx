"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Users,
  Copy,
  Check,
  Plus,
  Share2,
  ShieldAlert,
  Flame,
  ArrowLeft,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { DailyLogger } from "@/components/daily-logger";
import { GroupModal } from "@/components/group-modal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/app-context";
import { formatDate } from "@/lib/utils";

export default function GroupPage() {
  const router = useRouter();
  const {
    user,
    groups,
    currentGroup,
    members,
    loading,
    mounted,
    isConfigured,
    userMemberInfo,
    myTodayRecord,
    loggerOpen,
    setLoggerOpen,
    toastMsg,
    showToast,
    selectGroup,
    saveDailyRecord,
    createNewGroup,
    logout,
  } = useApp();

  const [copied, setCopied] = useState(false);
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
        <p className="text-xs text-[#999999]">그룹 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!isConfigured || !user || !currentGroup) {
    if (mounted && !user) {
      router.replace("/auth/login");
      return null;
    }
  }

  const inviteUrl =
    currentGroup && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${currentGroup.invite_code}`
      : `https://dailyweigh.app/invite/${currentGroup?.invite_code || ""}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    showToast("📋 초대 링크가 클립보드에 복사되었습니다!");
    setTimeout(() => setCopied(false), 2500);
  };

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
                <Users className="w-4 h-4 text-[#FF4D00]" />
                내 그룹 & 친구 초대
              </h1>
              <p className="text-xs text-[#666666]">
                현재 그룹의 규칙을 확인하고 초대 링크를 단톡방에 공유하세요.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setGroupModalState({ isOpen: true, mode: "create" })}
            className="gap-1.5 text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF4D00]" />
            새 그룹
          </Button>
        </div>

        {/* Current Group Banner & Invite Card */}
        {currentGroup && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Left: Group Info & Invite Link (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-5 bg-white border border-[#E5E5E5] rounded-[10px] space-y-4 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-[#999999] uppercase tracking-wider">
                      현재 활성 그룹
                    </span>
                    <h2 className="text-lg font-bold text-[#111111]">{currentGroup.name}</h2>
                    <p className="text-xs text-[#666666]">
                      총 <strong>{members.length}명</strong>의 멤버가 함께 감량 중입니다.
                    </p>
                  </div>
                  <Badge variant="accent">코드: {currentGroup.invite_code}</Badge>
                </div>

                {/* Penalty Rule */}
                {currentGroup.penalty_rule ? (
                  <div className="flex items-start gap-2 p-3 bg-red-50/70 border border-red-200 rounded-[8px] text-xs text-red-700">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">그룹 벌칙 룰: </span>
                      <span>{currentGroup.penalty_rule}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] text-xs text-[#666666]">
                    벌칙 룰이 아직 설정되지 않았습니다.
                  </div>
                )}

                {/* Invite Link Box */}
                <div className="space-y-2 pt-2 border-t border-[#E5E5E5]">
                  <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-[#FF4D00]" />
                    원클릭 초대 링크
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] text-xs font-mono text-[#111111] select-all focus:outline-none"
                    />
                    <Button
                      type="button"
                      variant={copied ? "primary" : "secondary"}
                      onClick={handleCopyInvite}
                      className="gap-1.5 shrink-0 text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          복사완료
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          링크 복사
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-[#999999]">
                    친구가 링크를 누르면 복잡한 인증 없이 즉시 5초 만에 이 그룹에 합류합니다.
                  </p>
                </div>
              </div>

              {/* My Groups Switcher Card */}
              <div className="p-4 sm:p-5 bg-white border border-[#E5E5E5] rounded-[10px] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    내가 참여 중인 그룹 ({groups.length})
                  </h3>
                  <button
                    onClick={() => setGroupModalState({ isOpen: true, mode: "create" })}
                    className="text-xs font-semibold text-[#FF4D00] hover:underline cursor-pointer"
                  >
                    + 새 그룹
                  </button>
                </div>

                <div className="space-y-2">
                  {groups.map((g) => {
                    const isSelected = g.id === currentGroup.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => selectGroup(g)}
                        className={`p-3 rounded-[8px] border transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-[#FFF9F6] border-[#FFD8CC]"
                            : "bg-[#FAFAFA] border-[#E5E5E5] hover:border-[#111111]"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#111111] truncate">{g.name}</div>
                          <div className="text-[10px] text-[#999999] font-mono mt-0.5">
                            코드: {g.invite_code}
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-[#FF4D00] bg-white px-2 py-0.5 rounded border border-[#FFD8CC]">
                            현재 선택됨
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#666666]">전환하기 →</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Members List (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-5 bg-white border border-[#E5E5E5] rounded-[10px] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5]">
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#FF4D00]" />
                    그룹 멤버 목록 ({members.length}명)
                  </h3>
                  <span className="text-[11px] text-[#999999]">열정 포인트 순</span>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {members.map((member) => {
                    const isMe = member.user_id === user?.id;
                    const isOwner = member.role === "owner";
                    return (
                      <div
                        key={member.id}
                        className={`p-3 rounded-[8px] border flex items-center justify-between gap-3 ${
                          isMe
                            ? "bg-[#FFF9F6] border-[#FFD8CC]"
                            : "bg-[#FAFAFA] border-[#E5E5E5]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                            {(member.profile?.nickname || "멤").slice(0, 1)}
                          </div>
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#111111] truncate max-w-[120px]">
                                {member.profile?.nickname}
                              </span>
                              {isMe && (
                                <span className="text-[10px] text-[#FF4D00] font-semibold bg-[#FFF1EB] px-1.5 rounded">
                                  나
                                </span>
                              )}
                              {isOwner && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5" /> 방장
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#999999]">
                              @{member.profile?.username} · 시작 {member.profile?.start_weight ?? "-"}kg
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold font-mono text-[#111111]">
                              {member.weekly_points}P
                            </div>
                            <div className="text-[10px] text-[#FF4D00] flex items-center justify-end gap-0.5 font-semibold">
                              <Flame className="w-2.5 h-2.5 fill-current" />
                              {member.streak_days}일 연속
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
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
