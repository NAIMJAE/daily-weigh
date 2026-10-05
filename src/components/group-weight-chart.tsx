"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { TrendingDown, ArrowUpRight, Check, Activity } from "lucide-react";
import { DailyRecord, GroupMember } from "@/types";

interface GroupWeightChartProps {
  members: GroupMember[];
  records: DailyRecord[];
}

// 날짜 포맷 (YYYY-MM-DD -> M.D 예: 10.2, 10.3)
function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}.${day}`;
  }
  return dateStr;
}

// 멤버별 고대비 교차 색상 팔레트 (인접 인덱스 간 보색/온도 교차로 명확히 구분)
const MEMBER_COLORS = [
  "#2563EB", // 1. 로열 블루 (Cool)
  "#EF4444", // 2. 레드 (Warm)
  "#10B981", // 3. 에메랄드 그린 (Fresh)
  "#F59E0B", // 4. 앰버/골드 (Warm)
  "#8B5CF6", // 5. 퍼플/바이올렛 (Deep Cool)
  "#06B6D4", // 6. 시안/민트 (Bright Cool)
  "#EC4899", // 7. 핑크/마젠타 (Vivid Warm)
  "#84CC16", // 8. 라임 그린 (Bright)
  "#6366F1", // 9. 인디고 (Deep)
  "#F97316", // 10. 오렌지 (Warm)
];

export function GroupWeightChart({ members, records }: GroupWeightChartProps) {
  // 모드: delta (시작일 대비 변화량 Δkg - 0kg 기준선 레이스) vs absolute (실제 체중 kg)
  const [chartMode, setChartMode] = useState<"delta" | "absolute">("delta");

  // 멤버별 첫 체중(기준 체중) 맵 생성
  const memberStartWeights = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      // 1. 프로필의 시작 체중
      if (m.profile?.start_weight) {
        map.set(m.user_id, m.profile.start_weight);
        return;
      }
      // 2. 없으면 가장 오래된 기록의 체중
      const userRecords = records
        .filter((r) => r.user_id === m.user_id && r.weight !== null)
        .sort((a, b) => a.record_date.localeCompare(b.record_date));
      if (userRecords.length > 0 && userRecords[0].weight) {
        map.set(m.user_id, userRecords[0].weight);
      }
    });
    return map;
  }, [members, records]);

  // 모든 날짜 목록 추출 (오름차순)
  const sortedDates = useMemo(() => {
    const dateSet = new Set<string>();
    records.forEach((r) => {
      if (r.weight !== null) {
        dateSet.add(r.record_date);
      }
    });
    return Array.from(dateSet).sort();
  }, [records]);

  // Recharts 형식 데이터셋 가공
  const chartData = useMemo(() => {
    return sortedDates.map((date) => {
      const dataPoint: Record<string, any> = {
        date,
        formattedDate: formatShortDate(date),
      };

      members.forEach((m) => {
        const record = records.find(
          (r) => r.user_id === m.user_id && r.record_date === date
        );

        if (record && record.weight !== null) {
          const startWeight = memberStartWeights.get(m.user_id);
          if (chartMode === "delta" && startWeight) {
            // 변화량: 현재 체중 - 시작 체중 (예: -1.7kg)
            dataPoint[m.user_id] = parseFloat(
              (record.weight - startWeight).toFixed(1)
            );
          } else {
            dataPoint[m.user_id] = record.weight;
          }
        }
      });

      return dataPoint;
    });
  }, [sortedDates, members, records, memberStartWeights, chartMode]);

  return (
    <div className="p-4 bg-white border border-[#E5E5E5] rounded-[8px] space-y-4">
      {/* Header & Mode Switcher (제목 좌측, 토글 버튼 우측 1행 정렬) */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#111111] flex items-center gap-1.5 whitespace-nowrap">
          <TrendingDown className="w-4 h-4 text-[#FF4D00] shrink-0" />
          체중 변화 그래프
        </h3>

        {/* Tab Toggle (제목 우측 이동, 변화량 / 절대체중 간소화) */}
        <div className="inline-flex p-0.5 bg-[#F4F4F5] border border-[#E5E5E5] rounded-[6px] shrink-0">
          <button
            type="button"
            onClick={() => setChartMode("delta")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              chartMode === "delta"
                ? "bg-white text-[#111111] shadow-2xs"
                : "text-[#666666] hover:text-[#111111]"
            }`}
          >
            변화량
          </button>
          <button
            type="button"
            onClick={() => setChartMode("absolute")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              chartMode === "absolute"
                ? "bg-white text-[#111111] shadow-2xs"
                : "text-[#666666] hover:text-[#111111]"
            }`}
          >
            절대체중
          </button>
        </div>
      </div>

      {/* Member Legends (색상 점 + 닉네임만 표시, 줄바꿈 wrap으로 스크롤 방지) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {members.map((m, idx) => {
          const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
          return (
            <div
              key={m.id}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] text-xs shrink-0"
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-[#111111] truncate max-w-[110px]">
                {m.profile?.nickname ?? "멤버"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recharts Canvas */}
      <div className="w-full h-64">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#999999] border border-dashed border-[#E5E5E5] rounded-[8px] p-4 text-center">
            <Activity className="w-6 h-6 text-[#D4D4D8] mb-1.5" />
            <span className="font-medium text-[#111111]">아직 기록된 체중 데이터가 없습니다</span>
            <span className="text-[13px] text-[#999999] mt-0.5">상단의 [오늘 기록] 버튼으로 첫 체중을 입력해보세요.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              {/* x, y축에 맞춘 연한 가로/세로 구분선 */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F0F0F0"
                vertical={true}
                horizontal={true}
              />

              {/* Reference Baseline at 0kg for Delta mode */}
              {chartMode === "delta" && (
                <ReferenceLine
                  y={0}
                  stroke="#D4D4D8"
                  strokeDasharray="3 3"
                  label={{
                    value: "0kg 기준",
                    fill: "#999999",
                    fontSize: 12,
                    position: "insideTopRight",
                  }}
                />
              )}

              <XAxis
                dataKey="formattedDate"
                stroke="#A1A1AA"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
              />
              <YAxis
                stroke="#A1A1AA"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
                width={48}
                domain={
                  chartMode === "delta"
                    ? ["auto", "auto"]
                    : ["dataMin - 1", "dataMax + 1"]
                }
                tickFormatter={(v) => {
                  const num = typeof v === "number" ? v : parseFloat(v);
                  if (isNaN(num)) return `${v}`;
                  const formatted = parseFloat(num.toFixed(2)).toString();
                  return chartMode === "delta"
                    ? `${num > 0 ? "+" : ""}${formatted}`
                    : formatted;
                }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-[#E5E5E5] p-2.5 rounded-[8px] shadow-md text-xs space-y-1.5 z-50">
                        <div className="font-bold text-[#111111] pb-1 border-b border-[#E5E5E5] flex items-center justify-between gap-4">
                          <span>{label}</span>
                          <span className="text-[12px] text-[#999999] font-normal">
                            {chartMode === "delta" ? "기준 대비 변화량" : "실제 체중"}
                          </span>
                        </div>
                        {payload.map((item: any) => {
                          const member = members.find((m) => m.user_id === item.dataKey);
                          const name = member?.profile?.nickname || item.name;
                          return (
                            <div
                              key={item.dataKey}
                              className="flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-[#666666] truncate max-w-[100px]">{name}</span>
                              </div>
                              <span className="font-mono font-bold text-[#111111]">
                                {chartMode === "delta"
                                  ? `${item.value > 0 ? "+" : ""}${item.value} kg`
                                  : `${item.value} kg`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Individual Lines without fill gradients */}
              {members.map((m, idx) => (
                <Line
                  key={m.user_id}
                  type="monotone"
                  dataKey={m.user_id}
                  stroke={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
                  strokeWidth={1.5}
                  dot={{ r: 3, strokeWidth: 1, fill: "#FFFFFF" }}
                  activeDot={{ r: 5, strokeWidth: 1 }}
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
