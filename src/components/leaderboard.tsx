"use client";

import React, { useState, useMemo } from "react";
import {
  Trophy,
  Flame,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Check,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { DailyRecord, Group, GroupMember } from "@/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  getTodayDateString,
  getWeekPeriodInfo,
  getMonthPeriodInfo,
  getYearPeriodInfo,
  calculatePeriodPoints,
  calculatePeriodAttendanceDays,
  calculateStreakDays,
} from "@/lib/utils";

interface LeaderboardProps {
  currentGroup: Group;
  members: GroupMember[];
  records: DailyRecord[];
  currentUserId: string;
  onOpenPoke: (targetMember: GroupMember) => void;
}

type PeriodType = "weekly" | "monthly" | "yearly";

export function Leaderboard({
  currentGroup,
  members,
  records,
  currentUserId,
  onOpenPoke,
}: LeaderboardProps) {
  const todayStr = getTodayDateString();

  // 1. 기간 타입 상태 (주간 / 월간 / 연간)
  const [periodType, setPeriodType] = useState<PeriodType>("weekly");

  // 2. 각 기간별 과거 이동 오프셋 (0 = 현재, -1 = 1주/월/년 전, ...)
  const [offsetWeeks, setOffsetWeeks] = useState<number>(0);
  const [offsetMonths, setOffsetMonths] = useState<number>(0);
  const [offsetYears, setOffsetYears] = useState<number>(0);

  // 3. 현재 선택된 기간 정보 계산
  const periodInfo = useMemo(() => {
    if (periodType === "weekly") {
      return getWeekPeriodInfo(offsetWeeks);
    } else if (periodType === "monthly") {
      return getMonthPeriodInfo(offsetMonths);
    } else {
      return getYearPeriodInfo(offsetYears);
    }
  }, [periodType, offsetWeeks, offsetMonths, offsetYears]);

  // 이전 기간으로 이동
  const handlePrevPeriod = () => {
    if (periodType === "weekly") setOffsetWeeks((w) => w - 1);
    else if (periodType === "monthly") setOffsetMonths((m) => m - 1);
    else setOffsetYears((y) => y - 1);
  };

  // 다음 기간으로 이동 (미래 기간은 방지)
  const handleNextPeriod = () => {
    if (periodType === "weekly") setOffsetWeeks((w) => Math.min(0, w + 1));
    else if (periodType === "monthly") setOffsetMonths((m) => Math.min(0, m + 1));
    else setOffsetYears((y) => Math.min(0, y + 1));
  };

  // 현재 기간으로 즉시 리셋
  const handleResetToCurrent = () => {
    if (periodType === "weekly") setOffsetWeeks(0);
    else if (periodType === "monthly") setOffsetMonths(0);
    else setOffsetYears(0);
  };

  // 4. 선택된 기간 기준으로 멤버별 포인트 및 출석 일수 계산
  const enrichedMembers = useMemo(() => {
    return members.map((member) => {
      // 선택된 기간 내 적립 포인트 계산
      const periodPoints = calculatePeriodPoints(
        records,
        member.user_id,
        periodInfo.startStr,
        periodInfo.endStr
      );

      // 선택된 기간 내 실제 출석 일수
      const attendanceDays = calculatePeriodAttendanceDays(
        records,
        member.user_id,
        periodInfo.startStr,
        periodInfo.endStr
      );

      // 연속 출석 일수
      const liveStreak = calculateStreakDays(records, member.user_id);

      return {
        ...member,
        periodPoints,
        attendanceDays,
        liveStreak,
      };
    });
  }, [members, records, periodInfo]);

  // 포인트 내림차순 정렬 (동점 시 출석 일수 순)
  const sortedMembers = useMemo(() => {
    return [...enrichedMembers].sort((a, b) => {
      if (b.periodPoints !== a.periodPoints) {
        return b.periodPoints - a.periodPoints;
      }
      return b.attendanceDays - a.attendanceDays;
    });
  }, [enrichedMembers]);

  return (
    <div id="leaderboard-section" className="space-y-3">
      {/* 1. 기간 선택 탭 (주간 / 월간 / 연간) */}
      <div className="flex items-center justify-between gap-2 p-1 bg-[#F4F4F5] border border-[#E5E5E5] rounded-[8px]">
        {(
          [
            { key: "weekly", label: "주간 랭킹" },
            { key: "monthly", label: "월간 랭킹" },
            { key: "yearly", label: "연간 랭킹" },
          ] as const
        ).map((tab) => {
          const isActive = periodType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setPeriodType(tab.key);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-[6px] transition-all cursor-pointer text-center ${
                isActive
                  ? "bg-white text-[#FF4D00] shadow-2xs border border-[#E5E5E5]"
                  : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2. 주차/월/연도 이동 네비게이션 컨트롤러 (< 26년 10월 1주차 >) */}
      <div className="p-3 bg-white border border-[#E5E5E5] rounded-[10px] space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          {/* 이전 버튼 */}
          <button
            type="button"
            onClick={handlePrevPeriod}
            title="이전 기간"
            className="p-1.5 rounded-[6px] hover:bg-[#F4F4F5] active:bg-[#E5E5E5] text-[#111111] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 중앙 기간 레이블 */}
          <div className="text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-base font-extrabold text-[#111111] tracking-tight">
                {periodInfo.label}
              </span>
              {periodInfo.isCurrent && (
                <span className="text-[11px] font-bold text-[#FF4D00] bg-[#FFF1EB] border border-[#FFD8CC] px-1.5 py-0.2 rounded-[4px]">
                  {periodType === "weekly"
                    ? "이번 주"
                    : periodType === "monthly"
                    ? "이번 달"
                    : "올해"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#999999] font-mono mt-0.5">
              {periodInfo.rangeText}
            </p>
          </div>

          {/* 다음 버튼 (미래는 비활성화) */}
          <button
            type="button"
            onClick={handleNextPeriod}
            disabled={periodInfo.isCurrent}
            title="다음 기간"
            className={`p-1.5 rounded-[6px] transition-colors ${
              periodInfo.isCurrent
                ? "text-[#D4D4D8] cursor-not-allowed"
                : "text-[#111111] hover:bg-[#F4F4F5] active:bg-[#E5E5E5] cursor-pointer"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 과거 기간 조회 중일 때 '현재로 돌아가기' 버튼 */}
        {!periodInfo.isCurrent && (
          <div className="pt-1 text-center border-t border-[#E5E5E5]/60">
            <button
              type="button"
              onClick={handleResetToCurrent}
              className="text-xs font-semibold text-[#FF4D00] hover:underline inline-flex items-center gap-1 cursor-pointer py-0.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>
                {periodType === "weekly"
                  ? "이번 주로 돌아가기"
                  : periodType === "monthly"
                  ? "이번 달로 돌아가기"
                  : "올해로 돌아가기"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 3. 벌칙 안내 (주간 랭킹이고 벌칙이 있을 때만 표시) */}
      {periodType === "weekly" && currentGroup.penalty_rule && (
        <div className="flex items-center gap-2 p-3 bg-red-50/80 border border-red-200 rounded-[10px] text-xs text-red-700 font-medium shadow-2xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold shrink-0">이번 주 벌칙:</span>
            <span className="truncate">{currentGroup.penalty_rule}</span>
          </div>
        </div>
      )}

      {/* 4. 회원 순위 카드 목록 */}
      <div className="space-y-2.5">
        {sortedMembers.map((member, index) => {
          const isCurrentUser = member.user_id === currentUserId;
          const isFirst = index === 0 && member.periodPoints > 0;
          const isLast =
            index === sortedMembers.length - 1 &&
            sortedMembers.length > 1 &&
            periodType === "weekly";

          // 오늘의 기록 (실시간 주간 뷰에서만 사용)
          const todayRecord = records.find(
            (r) => r.user_id === member.user_id && r.record_date === todayStr
          );

          const hasWeight = Boolean(todayRecord?.weight);
          const hasPhoto = Boolean(todayRecord?.photo_url);
          const hasWorkout = Boolean(
            todayRecord?.workout_tags && todayRecord.workout_tags.length > 0
          );
          const hasAnyTodayRecord = hasWeight || hasPhoto || hasWorkout;

          return (
            <div
              key={member.id}
              className={`p-3.5 rounded-[10px] border transition-all flex flex-col gap-2.5 shadow-2xs ${
                isCurrentUser
                  ? "bg-[#FFF9F6] border-[#FFD8CC]"
                  : "bg-white border-[#E5E5E5] hover:border-[#D4D4D8]"
              }`}
            >
              {/* Row 1: 등수 & 프로필 & 총 포인트 */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      index === 0
                        ? "bg-[#FF4D00] text-white shadow-xs"
                        : index === 1
                        ? "bg-zinc-800 text-white"
                        : index === 2
                        ? "bg-zinc-500 text-white"
                        : "bg-[#F4F4F5] text-[#71717A]"
                    }`}
                  >
                    {index + 1}
                  </span>

                  {/* 프로필 사진 아바타 */}
                  <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-[#E5E5E5]">
                    {member.profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.profile.avatar_url}
                        alt={member.profile.nickname || "멤버"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{(member.profile?.nickname || "멤").slice(0, 1)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-bold text-[#111111] truncate max-w-[120px]">
                      {member.profile?.nickname}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[11px] text-[#FF4D00] font-bold bg-[#FFF1EB] border border-[#FFD8CC] px-1.5 py-0.5 rounded-[4px] whitespace-nowrap shrink-0">
                        나
                      </span>
                    )}
                    {isFirst && (
                      <Badge
                        variant="accent"
                        className="text-[11px] py-0.5 px-1.5 whitespace-nowrap shrink-0"
                      >
                        🔥 1위
                      </Badge>
                    )}
                    {isLast && (
                      <Badge
                        variant="danger"
                        className="text-[11px] py-0.5 px-1.5 whitespace-nowrap shrink-0"
                      >
                        ☠️ 벌칙후보
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 스트릭 & 포인트 */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="flex items-center gap-0.5 text-xs text-[#666666] font-semibold">
                    <Flame className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                    {member.liveStreak}일
                  </span>
                  <div className="text-right font-mono font-extrabold text-sm text-[#111111]">
                    {member.periodPoints}P
                  </div>
                </div>
              </div>

              {/* Row 2: 출석 현황 및 액션 버튼 */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5E5E5]/70">
                {/* 주간 현재 주차일 때는 오늘의 3대 체크 현황 표시 */}
                {periodType === "weekly" && periodInfo.isCurrent ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      {/* 체중 */}
                      <span
                        title={hasWeight ? "체중 기록 완료 (+10P)" : "체중 미기록"}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-semibold whitespace-nowrap transition-colors ${
                          hasWeight
                            ? "bg-[#111111] text-white"
                            : "bg-[#FAFAFA] text-[#A1A1AA] border border-[#E5E5E5]"
                        }`}
                      >
                        ⚖️ {hasWeight ? "체중✓" : "체중"}
                      </span>

                      {/* 눈바디 */}
                      <span
                        title={hasPhoto ? "눈바디 완료 (+15P)" : "눈바디 미기록"}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-semibold whitespace-nowrap transition-colors ${
                          hasPhoto
                            ? "bg-[#FF4D00] text-white"
                            : "bg-[#FAFAFA] text-[#A1A1AA] border border-[#E5E5E5]"
                        }`}
                      >
                        📸 {hasPhoto ? "눈바디✓" : "눈바디"}
                      </span>

                      {/* 운동 */}
                      <span
                        title={hasWorkout ? "운동 완료 (+20~25P)" : "운동 미기록"}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-semibold whitespace-nowrap transition-colors ${
                          hasWorkout
                            ? "bg-[#2563EB] text-white"
                            : "bg-[#FAFAFA] text-[#A1A1AA] border border-[#E5E5E5]"
                        }`}
                      >
                        🏃 {hasWorkout ? "운동✓" : "운동"}
                      </span>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="shrink-0">
                      {!isCurrentUser ? (
                        !hasAnyTodayRecord ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onOpenPoke(member)}
                            className="text-xs py-1 px-2.5 h-auto text-[#FF4D00] border-[#FFD8CC] hover:bg-[#FFF1EB] active:scale-95 whitespace-nowrap font-bold cursor-pointer"
                          >
                            👉 콕 찌르기
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-700 font-semibold px-2 py-0.5 bg-emerald-50 rounded-[4px] border border-emerald-200 whitespace-nowrap flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            출석완료
                          </span>
                        )
                      ) : hasAnyTodayRecord ? (
                        <span className="text-xs text-[#FF4D00] font-semibold px-2 py-0.5 bg-[#FFF1EB] rounded-[4px] border border-[#FFD8CC] whitespace-nowrap">
                          오늘 기록완료
                        </span>
                      ) : (
                        <span className="text-xs text-[#999999] px-2 py-0.5 bg-[#FAFAFA] rounded-[4px] border border-[#E5E5E5] whitespace-nowrap">
                          오늘 미기록
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  /* 과거 주차 또는 월간/연간 뷰: 해당 기간 출석 일수 요약 표시 */
                  <div className="w-full flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#666666]">
                      <Calendar className="w-3.5 h-3.5 text-[#999999]" />
                      <span>
                        해당 기간 출석:{" "}
                        <strong className="text-[#111111]">
                          {member.attendanceDays}일
                        </strong>
                      </span>
                    </div>
                    <span className="text-xs text-[#999999] font-medium">
                      획득 포인트: {member.periodPoints}P
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
