"use client";

import React from "react";
import { Trophy, Flame, AlertCircle, ArrowRight, Check, X, ShieldAlert } from "lucide-react";
import { DailyRecord, Group, GroupMember } from "@/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { getTodayDateString, calculateWeeklyPoints, calculateStreakDays } from "@/lib/utils";

interface LeaderboardProps {
  currentGroup: Group;
  members: GroupMember[];
  records: DailyRecord[];
  currentUserId: string;
  onOpenPoke: (targetMember: GroupMember) => void;
}

export function Leaderboard({
  currentGroup,
  members,
  records,
  currentUserId,
  onOpenPoke,
}: LeaderboardProps) {
  const todayStr = getTodayDateString();

  // 각 멤버별 실시간 주간 포인트 및 스트릭 계산 (records와 member.weekly_points 중 최신값 적용)
  const enrichedMembers = members.map((member) => {
    const computedWeeklyPoints = calculateWeeklyPoints(records, member.user_id);
    const computedStreakDays = calculateStreakDays(records, member.user_id);

    return {
      ...member,
      liveWeeklyPoints: Math.max(member.weekly_points ?? 0, computedWeeklyPoints),
      liveStreakDays: Math.max(member.streak_days ?? 0, computedStreakDays),
    };
  });

  // 주간 열정 포인트 순 정렬 (내림차순)
  const sortedMembers = [...enrichedMembers].sort(
    (a, b) => b.liveWeeklyPoints - a.liveWeeklyPoints
  );

  return (
    <div id="leaderboard-section" className="p-4 sm:p-5 bg-white border border-[#E5E5E5] rounded-[8px] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#111111] flex items-center gap-1.5 whitespace-nowrap">
              <Trophy className="w-4 h-4 text-[#FF4D00] shrink-0" />
              주간 열정 리더보드
            </h3>
            <Badge variant="accent">Weekly Score</Badge>
          </div>
          <p className="text-xs text-[#666666] mt-0.5">
            체중, 눈바디, 운동 기록으로 적립한 순수 노력 포인트 순위입니다.
          </p>
        </div>

        {/* Penalty Notice */}
        {currentGroup.penalty_rule && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-[6px] text-xs text-red-700 font-medium shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[220px]">
              벌칙: {currentGroup.penalty_rule}
            </span>
          </div>
        )}
      </div>

      {/* Table / List */}
      <div className="space-y-2.5">
        {sortedMembers.map((member, index) => {
          const isCurrentUser = member.user_id === currentUserId;
          const isFirst = index === 0;
          const isLast = index === sortedMembers.length - 1 && sortedMembers.length > 1;

          // 오늘의 기록 조회
          const todayRecord = records.find(
            (r) => r.user_id === member.user_id && r.record_date === todayStr
          );

          const hasWeight = Boolean(todayRecord?.weight);
          const hasPhoto = Boolean(todayRecord?.photo_url);
          const hasWorkout = Boolean(todayRecord?.workout_tags && todayRecord.workout_tags.length > 0);
          const hasAnyRecord = hasWeight || hasPhoto || hasWorkout;

          return (
            <div
              key={member.id}
              className={`p-3 sm:p-3.5 rounded-[8px] border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCurrentUser
                  ? "bg-[#FFF9F6] border-[#FFD8CC]"
                  : "bg-white border-[#E5E5E5] hover:border-[#D4D4D8]"
              }`}
            >
              {/* Member Profile & Rank */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isFirst
                      ? "bg-[#FF4D00] text-white"
                      : "bg-[#F4F4F5] text-[#666666]"
                  }`}
                >
                  {index + 1}
                </span>

                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#111111] truncate max-w-[110px] sm:max-w-[140px]">
                      {member.profile?.nickname}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] text-[#FF4D00] font-semibold bg-[#FFF1EB] px-1.5 rounded whitespace-nowrap shrink-0">
                        나
                      </span>
                    )}
                    {isFirst && (
                      <Badge variant="accent" className="text-[10px] py-0 px-1.5 whitespace-nowrap shrink-0">
                        🔥 버닝왕
                      </Badge>
                    )}
                    {isLast && (
                      <Badge variant="danger" className="text-[10px] py-0 px-1.5 whitespace-nowrap shrink-0">
                        ☠️ 벌칙후보
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-[#999999] flex items-center gap-2 mt-0.5 whitespace-nowrap">
                    <span className="truncate max-w-[80px]">@{member.profile?.username}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-[#111111] font-semibold shrink-0">
                      <Flame className="w-3 h-3 text-[#FF4D00] shrink-0" />
                      {member.liveStreakDays}일
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Indicators & Score & Poke Action */}
              <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5E5E5] shrink-0">
                {/* Today's 3 module indicators */}
                <div className="flex items-center gap-1 sm:gap-1.5 text-xs shrink-0">
                  {/* Weight Indicator */}
                  <span
                    title={hasWeight ? "체중 기록 완료 (+10P)" : "체중 미기록"}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      hasWeight
                        ? "bg-[#111111] text-white"
                        : "bg-[#FAFAFA] text-[#A1A1AA] border border-[#E5E5E5]"
                    }`}
                  >
                    ⚖️ {hasWeight ? "체중✓" : "체중"}
                  </span>

                  {/* Photo Indicator */}
                  <span
                    title={hasPhoto ? "눈바디 완료 (+15P)" : "눈바디 미기록"}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      hasPhoto
                        ? "bg-[#FF4D00] text-white"
                        : "bg-[#FAFAFA] text-[#A1A1AA] border border-[#E5E5E5]"
                    }`}
                  >
                    📸 {hasPhoto ? "눈바디✓" : "눈바디"}
                  </span>

                  {/* Workout Indicator */}
                  <span
                    title={hasWorkout ? "운동 완료 (+20~25P)" : "운동 미기록"}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      hasWorkout
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#FAFAFA] text-[#A1A1AA] border border-[#E5E5E5]"
                    }`}
                  >
                    🏃 {hasWorkout ? "운동✓" : "운동"}
                  </span>
                </div>

                {/* Score */}
                <div className="text-right min-w-[50px] shrink-0">
                  <span className="text-sm font-bold font-mono text-[#111111]">
                    {member.liveWeeklyPoints}
                  </span>
                  <span className="text-[10px] text-[#999999] ml-0.5 font-bold">P</span>
                </div>

                {/* Poke Button for Total-Miss members */}
                {!isCurrentUser && (
                  <div className="shrink-0">
                    {!hasAnyRecord ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpenPoke(member)}
                        className="text-xs py-1 px-2.5 text-[#FF4D00] border-[#FFD8CC] hover:bg-[#FFF1EB] active:scale-95 whitespace-nowrap"
                      >
                        👉 콕 찌르기
                      </Button>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold px-2 py-0.5 bg-emerald-50 rounded-[4px] border border-emerald-200 whitespace-nowrap">
                        출석완료
                      </span>
                    )}
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
