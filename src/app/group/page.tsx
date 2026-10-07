"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Crown,
  User,
  Camera,
  Edit3,
  Ruler,
  Scale,
  Target,
  Activity,
  LogOut,
  UserCheck,
} from "lucide-react";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { DailyLogger } from "@/components/daily-logger";
import { GroupModal } from "@/components/group-modal";
import { KickMemberModal } from "@/components/kick-member-modal";
import { LeaveGroupModal } from "@/components/leave-group-modal";
import { SyncGroupRecordsModal } from "@/components/sync-group-records-modal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/app-context";
import { formatDate, calculateWeeklyPoints, calculateStreakDays } from "@/lib/utils";
import { compressImage } from "@/lib/image-compressor";
import { Group, GroupMember, UserProfile } from "@/types";
import { RefreshCw, Layers } from "lucide-react";

export default function MyPage() {
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
    loggerOpen,
    setLoggerOpen,
    showToast,
    selectGroup,
    saveDailyRecord,
    updateUserProfile,
    uploadAvatar,
    createNewGroup,
    joinExistingGroup,
    kickMember,
    leaveGroup,
    autoSyncGroupIds,
    updateAutoSyncGroupIds,
    syncRecordsToSelectedGroups,
    logout,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [groupModalState, setGroupModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "invite";
  }>({ isOpen: false, mode: "create" });

  // 강퇴 및 퇴장 모달 상태
  const [kickTargetMember, setKickTargetMember] = useState<GroupMember | null>(null);
  const [leaveTargetGroup, setLeaveTargetGroup] = useState<Group | null>(null);

  // 프로필 수정 폼 상태
  const [editNickname, setEditNickname] = useState("");
  const [editHeight, setEditHeight] = useState<string>("");
  const [editStartWeight, setEditStartWeight] = useState<string>("");
  const [editTargetWeight, setEditTargetWeight] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mounted && !loading && !user && isConfigured) {
      router.replace("/auth/login");
    }
  }, [mounted, loading, user, isConfigured, router]);

  // 프로필 수정 모달 열 때 현재 데이터로 초기화
  const handleOpenEditProfile = () => {
    if (!user) return;
    setEditNickname(user.nickname || "");
    setEditHeight(user.height ? String(user.height) : "");
    setEditStartWeight(user.start_weight ? String(user.start_weight) : "");
    setEditTargetWeight(user.target_weight ? String(user.target_weight) : "");
    setAvatarPreview(user.avatar_url || "");
    setAvatarBlob(null);
    setProfileEditOpen(true);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await compressImage(file, 400, 0.85);
      setAvatarPreview(result.dataUrl);
      setAvatarBlob(result.blob);
      showToast("✨ 프로필 사진이 준비되었습니다.", "success");
    } catch (err: any) {
      console.error("Avatar compression error:", err);
      showToast("⚠️ 프로필 사진 처리에 실패했습니다.", "error");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSavingProfile) return;

    if (!editNickname.trim()) {
      showToast("닉네임을 입력해주세요.", "warning");
      return;
    }

    setIsSavingProfile(true);

    try {
      let finalAvatarUrl = user.avatar_url;

      // 새 아바타 파일이 있으면 먼저 업로드
      if (avatarBlob) {
        const uploadedUrl = await uploadAvatar(avatarBlob);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        }
      }

      const updates: Partial<UserProfile> = {
        nickname: editNickname.trim(),
        height: editHeight ? parseFloat(editHeight) : null,
        start_weight: editStartWeight ? parseFloat(editStartWeight) : null,
        target_weight: editTargetWeight ? parseFloat(editTargetWeight) : null,
        avatar_url: finalAvatarUrl,
      };

      const success = await updateUserProfile(updates);
      if (success) {
        setProfileEditOpen(false);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-pulse" />
          <span className="font-extrabold text-base text-[#111111] tracking-tight">매일재라</span>
        </div>
        <p className="text-xs text-[#999999]">마이페이지를 불러오는 중...</p>
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

  // 최근 체중 계산 (가장 최신 기록된 체중 또는 시작 체중)
  const myRecords = records
    .filter((r) => r.user_id === user.id && r.weight !== null)
    .sort((a, b) => b.record_date.localeCompare(a.record_date));
  const latestWeight = myRecords[0]?.weight ?? user.start_weight;
  const weightDiffFromStart =
    latestWeight && user.start_weight
      ? (latestWeight - user.start_weight).toFixed(1)
      : null;

  // BMI 계산: 체중(kg) / (키(m) * 키(m))
  let bmiValue: string | null = null;
  let bmiStatus: { label: string; color: string } | null = null;

  if (user.height && latestWeight) {
    const heightInMeters = user.height / 100;
    const bmi = latestWeight / (heightInMeters * heightInMeters);
    bmiValue = bmi.toFixed(1);

    if (bmi < 18.5) {
      bmiStatus = { label: "저체중", color: "text-blue-500 bg-blue-50 border-blue-200" };
    } else if (bmi < 23) {
      bmiStatus = { label: "정상 체중", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    } else if (bmi < 25) {
      bmiStatus = { label: "과체중", color: "text-amber-600 bg-amber-50 border-amber-200" };
    } else {
      bmiStatus = { label: "비만", color: "text-red-600 bg-red-50 border-red-200" };
    }
  }

  const isOwner = userMemberInfo?.role === "owner";
  const liveWeeklyPoints = Math.max(
    userMemberInfo?.weekly_points ?? 0,
    calculateWeeklyPoints(records, user.id)
  );
  const liveStreakDays = Math.max(
    userMemberInfo?.streak_days ?? 0,
    calculateStreakDays(records, user.id)
  );

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

      <main className="flex-1 w-full p-3.5 space-y-4 pb-28">
        {/* ======================================================== */}
        {/* 1. 내 프로필 & 이 그룹에서의 내 정보 카드 */}
        {/* ======================================================== */}
        <section className="p-4 bg-white border border-[#E5E5E5] rounded-[12px] space-y-4 shadow-2xs">
          {/* Header Row: Avatar, Nickname, Role, Edit Button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Profile Avatar with click-to-edit */}
              <div
                onClick={handleOpenEditProfile}
                className="relative w-14 h-14 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border-2 border-white shadow-sm cursor-pointer group"
              >
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.nickname}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <span>{user.nickname.slice(0, 1)}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base font-extrabold text-[#111111] truncate">
                    {user.nickname}
                  </h2>
                  {isOwner ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> 방장
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#666666] bg-[#F4F4F5] border border-[#E5E5E5] px-1.5 py-0.5 rounded">
                      멤버
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#999999] font-mono mt-0.5">
                  @{user.username} · {currentGroup?.name || "기본 그룹"}
                </p>
              </div>
            </div>

            {/* Edit Button */}
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="px-2.5 py-1.5 bg-[#FFF9F6] border border-[#FFD8CC] hover:bg-[#FFF1EB] rounded-[6px] text-xs font-bold text-[#FF4D00] transition-colors cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>프로필 수정</span>
            </button>
          </div>

          {/* 4-Grid Physical / Weight Stats */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Stat 1: Height */}
            <div className="p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-[#666666]">
                <Ruler className="w-3 h-3 text-[#FF4D00]" />
                <span>등록된 키</span>
              </div>
              <div className="text-sm font-extrabold font-mono text-[#111111]">
                {user.height ? `${user.height} cm` : "미설정"}
              </div>
            </div>

            {/* Stat 2: Latest Weight */}
            <div className="p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-[#666666]">
                <Scale className="w-3 h-3 text-[#FF4D00]" />
                <span>최근 체중</span>
              </div>
              <div className="text-sm font-extrabold font-mono text-[#111111] flex items-center gap-1">
                <span>{latestWeight ? `${latestWeight} kg` : "미입력"}</span>
                {weightDiffFromStart && (
                  <span
                    className={`text-[11px] font-semibold ${
                      parseFloat(weightDiffFromStart) <= 0
                        ? "text-[#FF4D00]"
                        : "text-blue-500"
                    }`}
                  >
                    ({parseFloat(weightDiffFromStart) > 0 ? "+" : ""}
                    {weightDiffFromStart}kg)
                  </span>
                )}
              </div>
            </div>

            {/* Stat 3: Start Weight */}
            <div className="p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-[#666666]">
                <Target className="w-3 h-3 text-[#999999]" />
                <span>시작 체중</span>
              </div>
              <div className="text-sm font-extrabold font-mono text-[#111111]">
                {user.start_weight ? `${user.start_weight} kg` : "미설정"}
              </div>
            </div>

            {/* Stat 4: Target Weight */}
            <div className="p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-[#666666]">
                <Target className="w-3 h-3 text-[#FF4D00]" />
                <span>목표 체중</span>
              </div>
              <div className="text-sm font-extrabold font-mono text-[#FF4D00]">
                {user.target_weight ? `${user.target_weight} kg` : "미설정"}
              </div>
            </div>
          </div>

          {/* BMI Info Banner (키와 체중이 모두 있을 때 표시) */}
          {bmiValue && bmiStatus ? (
            <div className="p-2.5 bg-[#F9F9FA] border border-[#E5E5E5] rounded-[8px] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#666666]">
                <Activity className="w-3.5 h-3.5 text-[#FF4D00]" />
                <span>체질량지수 (BMI):</span>
                <strong className="font-mono text-[#111111]">{bmiValue}</strong>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${bmiStatus.color}`}
              >
                {bmiStatus.label}
              </span>
            </div>
          ) : (
            <div
              onClick={handleOpenEditProfile}
              className="p-2 bg-[#FFF9F6] border border-dashed border-[#FFD8CC] rounded-[8px] text-center text-xs text-[#FF4D00] cursor-pointer hover:bg-[#FFF1EB] transition-colors"
            >
              💡 키와 체중을 등록하면 <strong>BMI 분석 수치</strong>가 자동으로 계산됩니다!
            </div>
          )}

          {/* In-Group Activity Stats */}
          <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-around text-center">
            <div>
              <div className="text-[11px] text-[#666666]">이번 주 획득 포인트</div>
              <div className="text-sm font-extrabold font-mono text-[#111111] mt-0.5">
                {liveWeeklyPoints}P
              </div>
            </div>
            <div className="w-px h-7 bg-[#E5E5E5]" />
            <div>
              <div className="text-[11px] text-[#666666]">연속 출석일</div>
              <div className="text-sm font-extrabold font-mono text-[#FF4D00] flex items-center justify-center gap-0.5 mt-0.5">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{liveStreakDays}일째</span>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. 현재 활성 그룹 정보 & 초대 링크 */}
        {/* ======================================================== */}
        {currentGroup && (
          <section className="p-4 bg-white border border-[#E5E5E5] rounded-[12px] space-y-3.5 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono text-[#999999] uppercase tracking-wider">
                  현재 활성 그룹
                </span>
                <h3 className="text-base font-bold text-[#111111]">{currentGroup.name}</h3>
                <p className="text-xs text-[#666666]">
                  총 <strong>{members.length}명</strong> 참여 중
                </p>
              </div>
              <Badge variant="accent">코드: {currentGroup.invite_code}</Badge>
            </div>

            {/* Penalty Rule */}
            {currentGroup.penalty_rule ? (
              <div className="flex items-start gap-2 p-2.5 bg-red-50/70 border border-red-200 rounded-[8px] text-xs text-red-700">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">그룹 벌칙 룰: </span>
                  <span>{currentGroup.penalty_rule}</span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] text-xs text-[#666666]">
                벌칙 룰이 아직 설정되지 않았습니다.
              </div>
            )}

            {/* Invite Link Box */}
            <div className="space-y-1.5 pt-2 border-t border-[#E5E5E5]">
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-[#FF4D00]" />
                원클릭 초대 링크
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] text-xs font-mono text-[#111111] select-all focus:outline-none"
                />
                <Button
                  type="button"
                  variant={copied ? "primary" : "secondary"}
                  onClick={handleCopyInvite}
                  className="gap-1.5 shrink-0 text-xs py-1.5 px-2.5 h-auto cursor-pointer"
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
                친구가 링크를 누르면 즉시 이 그룹에 합류합니다.
              </p>
            </div>
          </section>
        )}

        {/* ======================================================== */}
        {/* 3. 그룹 멤버 목록 */}
        {/* ======================================================== */}
        <section className="p-4 bg-white border border-[#E5E5E5] rounded-[12px] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5]">
            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FF4D00]" />
              그룹 멤버 ({members.length}명)
            </h3>
            <span className="text-[11px] text-[#999999]">포인트 순</span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
            {members.map((member) => {
              const isMe = member.user_id === user?.id;
              const isMemberOwner = member.role === "owner";
              const livePoints = Math.max(
                member.weekly_points ?? 0,
                calculateWeeklyPoints(records, member.user_id)
              );
              const liveStreak = Math.max(
                member.streak_days ?? 0,
                calculateStreakDays(records, member.user_id)
              );

              return (
                <div
                  key={member.id}
                  className={`p-2.5 rounded-[8px] border flex items-center justify-between gap-2.5 ${
                    isMe
                      ? "bg-[#FFF9F6] border-[#FFD8CC]"
                      : "bg-[#FAFAFA] border-[#E5E5E5]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                      {member.profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.profile.avatar_url}
                          alt={member.profile.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(member.profile?.nickname || "멤").slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#111111] truncate max-w-[110px]">
                          {member.profile?.nickname}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-[#FF4D00] font-bold bg-[#FFF1EB] px-1 rounded">
                            나
                          </span>
                        )}
                        {isMemberOwner && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> 방장
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#999999] font-mono">
                        {member.profile?.height ? `${member.profile.height}cm · ` : ""}
                        시작 {member.profile?.start_weight ?? "-"}kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-[#111111]">
                        {livePoints}P
                      </div>
                      <div className="text-[11px] text-[#FF4D00] flex items-center justify-end gap-0.5 font-semibold">
                        <Flame className="w-2.5 h-2.5 fill-current" />
                        {liveStreak}일
                      </div>
                    </div>

                    {/* 방장 전용 멤버 강퇴 버튼 (본인 제외) */}
                    {isOwner && !isMe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setKickTargetMember(member);
                        }}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-[6px] text-[11px] font-bold transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                        title="그룹에서 강퇴하기"
                      >
                        <UserCheck className="w-3 h-3 text-red-500 hidden" />
                        강퇴
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 현재 그룹에서 나가기 버튼 (본인) */}
          {currentGroup && (
            <div className="pt-2 border-t border-[#E5E5E5] flex justify-end">
              <button
                type="button"
                onClick={() => setLeaveTargetGroup(currentGroup)}
                className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium flex items-center gap-1 cursor-pointer py-1 px-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>이 그룹에서 나가기</span>
              </button>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* 4. 내 참여 그룹 전환 & 관리 */}
        {/* ======================================================== */}
        <section className="p-4 bg-white border border-[#E5E5E5] rounded-[12px] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              참여 중인 그룹 ({groups.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGroupModalState({ isOpen: true, mode: "invite" })}
                className="text-xs font-semibold text-[#666666] hover:text-[#111111] cursor-pointer"
              >
                + 코드 참여
              </button>
              <button
                type="button"
                onClick={() => setGroupModalState({ isOpen: true, mode: "create" })}
                className="text-xs font-semibold text-[#FF4D00] hover:underline cursor-pointer"
              >
                + 새 그룹 만들기
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {groups.map((g) => {
              const isSelected = g.id === currentGroup?.id;
              return (
                <div
                  key={g.id}
                  onClick={() => selectGroup(g)}
                  className={`p-2.5 rounded-[8px] border transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-[#FFF9F6] border-[#FFD8CC]"
                      : "bg-[#FAFAFA] border-[#E5E5E5] hover:border-[#111111]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111111] truncate">{g.name}</div>
                    <div className="text-[11px] text-[#999999] font-mono mt-0.5">
                      코드: {g.invite_code}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected ? (
                      <span className="text-[11px] font-bold text-[#FF4D00] bg-white px-2 py-0.5 rounded border border-[#FFD8CC]">
                        선택됨
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#666666]">전환 →</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLeaveTargetGroup(g);
                      }}
                      className="p-1 text-[#999999] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="그룹 나가기"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 5. 내 기록 다중 그룹 동기화 & 공유 관리 */}
        {/* ======================================================== */}
        <section className="p-4 bg-white border border-[#E5E5E5] rounded-[12px] space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5]">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#FF4D00]" />
                내 기록 다중 그룹 동기화 & 공유
              </h3>
              <p className="text-[11px] text-[#666666]">
                한 번만 기록해도 선택한 그룹들에 자동으로 함께 출석 및 포인트가 공유됩니다.
              </p>
            </div>
          </div>

          {groups.length > 1 ? (
            <div className="space-y-3">
              {/* 자동 동기화 체크박스 목록 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#111111]">
                    자동 공유 그룹 선택 ({autoSyncGroupIds.length}개 선택됨)
                  </label>
                  <span className="text-[10px] text-[#999999]">기록 시 자동 저장</span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {groups.map((g) => {
                    const isCurrent = g.id === currentGroup?.id;
                    const isChecked = autoSyncGroupIds.includes(g.id);

                    const handleToggleSync = () => {
                      if (isChecked) {
                        updateAutoSyncGroupIds(autoSyncGroupIds.filter((id) => id !== g.id));
                      } else {
                        updateAutoSyncGroupIds([...autoSyncGroupIds, g.id]);
                      }
                    };

                    return (
                      <div
                        key={g.id}
                        onClick={handleToggleSync}
                        className={`p-2.5 rounded-[8px] border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? "bg-[#FFF9F6] border-[#FFD8CC]"
                            : "bg-[#FAFAFA] border-[#E5E5E5] hover:border-[#CCCCCC]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={handleToggleSync}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#FF4D00] focus:ring-[#FF4D00] accent-[#FF4D00] rounded cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#111111] truncate max-w-[130px]">
                                {g.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-[#FF4D00] bg-[#FFF1EB] px-1 rounded">
                                  현재 활성
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#999999] font-mono">
                              코드: {g.invite_code}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isChecked
                              ? "text-[#FF4D00] bg-white border border-[#FFD8CC]"
                              : "text-[#999999] bg-[#EFEFEF]"
                          }`}
                        >
                          {isChecked ? "자동 공유 중" : "미공유"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 과거 기록 일괄 동기화 버튼 */}
              <div className="pt-2 border-t border-[#E5E5E5] flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[#666666] min-w-0">
                    현재 그룹(<strong>{currentGroup?.name}</strong>)의 내 과거 기록 <strong>{myRecords.length}건</strong>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setSyncModalOpen(true)}
                    className="text-xs py-1.5 px-3 h-auto font-bold gap-1 shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    기존 기록 일괄 동기화
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#FAFAFA] border border-dashed border-[#E5E5E5] rounded-[8px] text-xs text-[#666666] space-y-1">
              <p className="font-semibold text-[#111111]">
                💡 2개 이상의 그룹에 참여하면 기록 동기화 기능이 활성화됩니다.
              </p>
              <p className="text-[11px] text-[#999999]">
                여러 모임/그룹에 참여하고 계실 경우, 한 번만 기록해도 모든 그룹에 동시에 출석과 체중/눈바디 기록을 공유할 수 있습니다.
              </p>
            </div>
          )}

          {/* Logout button */}
          <div className="pt-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={logout}
              className="w-full py-2 bg-[#FAFAFA] hover:bg-[#F4F4F5] border border-[#E5E5E5] rounded-[8px] text-xs font-semibold text-[#666666] hover:text-[#111111] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* 5. 내 프로필 수정 모달 */}
      {/* ======================================================== */}
      <Modal
        isOpen={profileEditOpen}
        onClose={() => setProfileEditOpen(false)}
        title="내 프로필 정보 수정"
        description="닉네임, 키(cm), 체중 목표 및 프로필 사진을 수정할 수 있습니다."
        maxWidth="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
          {/* Avatar Photo Upload Field */}
          <div className="flex flex-col items-center justify-center gap-2 pb-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-2xl overflow-hidden border-2 border-[#E5E5E5] cursor-pointer group shadow-sm"
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="프로필 미리보기"
                  className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <span>{editNickname ? editNickname.slice(0, 1) : "나"}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                <Camera className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">변경</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-[#FF4D00] hover:underline cursor-pointer"
            >
              프로필 사진 변경
            </button>
          </div>

          {/* Nickname Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#111111]">
              닉네임 <span className="text-[#FF4D00]">*</span>
            </label>
            <input
              type="text"
              required
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
              placeholder="그룹에 표시될 닉네임"
              className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] focus:border-[#111111] rounded-[6px] text-xs text-[#111111] focus:outline-none"
            />
          </div>

          {/* Height (cm) Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#111111]">
              키 (cm) <span className="text-[#999999] font-normal">(BMI 분석용)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="50"
                max="250"
                value={editHeight}
                onChange={(e) => setEditHeight(e.target.value)}
                placeholder="예: 175.5"
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] focus:border-[#111111] rounded-[6px] text-xs text-[#111111] focus:outline-none pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#999999] font-bold">
                cm
              </span>
            </div>
          </div>

          {/* Start Weight & Target Weight */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#111111]">
                시작 체중 (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  value={editStartWeight}
                  onChange={(e) => setEditStartWeight(e.target.value)}
                  placeholder="예: 78.0"
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] focus:border-[#111111] rounded-[6px] text-xs text-[#111111] focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#999999] font-bold">
                  kg
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#111111]">
                목표 체중 (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  value={editTargetWeight}
                  onChange={(e) => setEditTargetWeight(e.target.value)}
                  placeholder="예: 70.0"
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] focus:border-[#111111] rounded-[6px] text-xs text-[#111111] focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#999999] font-bold">
                  kg
                </span>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setProfileEditOpen(false)}
              className="flex-1 text-xs py-2"
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSavingProfile}
              className="flex-1 text-xs py-2 font-bold"
            >
              {isSavingProfile ? "저장 중..." : "저장 완료"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Other Modals */}
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

      {/* 강퇴 확인 모달 */}
      <KickMemberModal
        isOpen={!!kickTargetMember}
        targetMember={kickTargetMember}
        onClose={() => setKickTargetMember(null)}
        onConfirm={kickMember}
      />

      {/* 그룹 나가기 확인 모달 */}
      <LeaveGroupModal
        isOpen={!!leaveTargetGroup}
        group={leaveTargetGroup}
        currentUserMember={userMemberInfo}
        memberCount={members.length}
        onClose={() => setLeaveTargetGroup(null)}
        onConfirm={leaveGroup}
      />

      {/* 내 기록 일괄 동기화 모달 */}
      <SyncGroupRecordsModal
        isOpen={syncModalOpen}
        currentGroup={currentGroup}
        groups={groups}
        recordCount={myRecords.length}
        onClose={() => setSyncModalOpen(false)}
        onSync={syncRecordsToSelectedGroups}
      />

      <BottomNav onOpenLogger={() => setLoggerOpen(true)} />
    </div>
  );
}
