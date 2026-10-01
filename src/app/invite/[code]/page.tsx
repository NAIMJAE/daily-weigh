"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, ShieldAlert, ArrowRight, CheckCircle2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getSessionUser,
  fetchProfile,
  fetchGroupByInviteCode,
} from "@/lib/supabase/api";
import { useApp } from "@/context/app-context";
import { Group, UserProfile } from "@/types";

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const inviteCode = resolvedParams.code;
  const { joinExistingGroup, refreshAuth } = useApp();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [targetGroup, setTargetGroup] = useState<Group | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured) {
        setErrorMsg("Supabase가 설정되지 않았습니다.");
        setLoading(false);
        return;
      }

      const authUser = await getSessionUser();
      if (!authUser) {
        // 로그인 안 된 상태 → 로그인 후 다시 이 페이지로 리다이렉트
        router.replace(`/auth/login?redirect=/invite/${inviteCode}`);
        return;
      }

      const [profile, group] = await Promise.all([
        fetchProfile(authUser.id),
        fetchGroupByInviteCode(inviteCode),
      ]);

      if (!profile) {
        router.replace("/auth/login");
        return;
      }
      setUser(profile);

      if (!group) {
        setNotFound(true);
      } else {
        setTargetGroup(group);
      }
      setLoading(false);
    }
    init();
  }, [inviteCode, router]);

  const handleJoin = async () => {
    if (!user || !targetGroup) return;
    setJoining(true);
    setErrorMsg("");

    try {
      const success = await joinExistingGroup(targetGroup);
      if (success) {
        setJoined(true);
        setTimeout(() => {
          router.push("/");
        }, 800);
      } else {
        setErrorMsg("그룹 참여 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "그룹 참여 중 오류가 발생했습니다.");
    } finally {
      setJoining(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-[#999999]">
          <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse" />
          초대 링크를 확인하는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-[#FF4D00] shrink-0" />
            <span className="font-extrabold text-xl text-[#111111] tracking-tight">매일재라</span>
            <span className="text-xs text-[#999999] font-medium">Daily Weigh</span>
          </div>
          <Badge variant="accent">그룹 초대장</Badge>
          <h1 className="text-xl font-bold text-[#111111] pt-2">
            {notFound ? "유효하지 않은 초대 코드" : "친구의 다이어트 그룹에 초대되었습니다!"}
          </h1>
          {!notFound && (
            <p className="text-xs text-[#666666]">
              매일 체중 변화를 기록하고 서로 자극을 주고받으세요.
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 bg-white border border-[#E5E5E5] rounded-[10px] space-y-5">
          {notFound ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-[#666666]">
                초대 코드 <code className="bg-[#F4F4F5] px-1.5 py-0.5 rounded text-xs font-mono">{inviteCode}</code> 에 해당하는 그룹을 찾을 수 없습니다.
              </p>
              <p className="text-xs text-[#999999]">링크가 만료되었거나 잘못된 코드일 수 있습니다.</p>
              <Button variant="secondary" onClick={() => router.push("/")} className="gap-1.5">
                <ArrowRight className="w-4 h-4" />
                메인으로 돌아가기
              </Button>
            </div>
          ) : targetGroup ? (
            <>
              <div className="space-y-2 pb-4 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2 text-xs font-mono text-[#999999]">
                  <span>초대 코드: {inviteCode}</span>
                </div>
                <h2 className="text-base font-bold text-[#111111]">{targetGroup.name}</h2>
                {targetGroup.penalty_rule && (
                  <div className="flex items-center gap-1.5 p-2.5 bg-red-50 border border-red-200 rounded-[6px] text-xs text-red-700 font-medium">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>벌칙 룰: {targetGroup.penalty_rule}</span>
                  </div>
                )}
              </div>

              {/* Current User */}
              {user && (
                <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] flex items-center justify-between text-xs">
                  <span className="text-[#666666]">참여할 내 프로필:</span>
                  <span className="font-bold text-[#111111]">
                    {user.nickname} (@{user.username})
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-[6px] text-xs text-red-600">
                  {errorMsg}
                </div>
              )}

              {joined ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[8px] flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  그룹 참여 완료! 대시보드로 이동합니다...
                </div>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full gap-2"
                >
                  {joining ? "참여 중..." : "그룹 참여하기"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </>
          ) : null}
        </div>

        <div className="text-center text-xs text-[#999999]">
          다른 계정으로 참여하고 싶으신가요?{" "}
          <Link href="/auth/login" className="text-[#111111] underline">
            계정 변경
          </Link>
        </div>
      </div>
    </div>
  );
}
