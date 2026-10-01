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
} from "recharts";
import { TrendingDown, ArrowUpRight, Check, Activity } from "lucide-react";
import { DailyRecord, GroupMember } from "@/types";
import { Badge } from "./ui/badge";
import { formatDate } from "@/lib/utils";

interface GroupWeightChartProps {
  members: GroupMember[];
  records: DailyRecord[];
}

// 멤버별 정갈한 차트 색상 팔레트 (Punchy Accent #FF4D00 + Clean Monochromes/Neutrals)
const MEMBER_COLORS = [
  "#FF4D00", // 나 (내 기록은 항상 International Orange 강조)
  "#18181B", // 멤버 2 (Zinc Dark)
  "#71717A", // 멤버 3 (Zinc Muted)
  "#2563EB", // 멤버 4 (Royal Blue)
  "#059669", // 멤버 5 (Emerald)
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
        formattedDate: formatDate(date),
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
    <div className="p-4 sm:p-5 bg-white border border-[#E5E5E5] rounded-[8px] space-y-4 sm:space-y-5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#111111] flex items-center gap-1.5 whitespace-nowrap">
              <TrendingDown className="w-4 h-4 text-[#FF4D00] shrink-0" />
              그룹 체중 변화 겹침 그래프
            </h3>
            <Badge variant="default">Multi-line Race</Badge>
          </div>
          <p className="text-xs text-[#666666] mt-0.5">
            {chartMode === "delta"
              ? "모두의 시작점을 0.0kg 기준선에 맞추어 실제 감량 추세를 직관적으로 비교합니다."
              : "멤버들의 실제 일자별 체중(kg) 추세선을 겹쳐서 확인합니다."}
          </p>
        </div>

        {/* Tab Toggle */}
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
            변화량 레이스 (Δkg) 🔥
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
            절대 체중 (kg)
          </button>
        </div>
      </div>

      {/* Member Legends (Horizontal scroll on narrow mobile) */}
      <div className="flex items-center gap-2 sm:gap-2.5 pt-0.5 overflow-x-auto pb-1 no-scrollbar">
        {members.map((m, idx) => {
          const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
          const startWeight = memberStartWeights.get(m.user_id);
          
          // 최신 체중 기록 찾기
          const userRecs = records
            .filter((r) => r.user_id === m.user_id && r.weight !== null)
            .sort((a, b) => b.record_date.localeCompare(a.record_date));
          const latestWeight = userRecs[0]?.weight ?? null;
          const diff =
            latestWeight && startWeight
              ? (latestWeight - startWeight).toFixed(1)
              : null;

          return (
            <div
              key={m.id}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] text-xs whitespace-nowrap shrink-0"
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-semibold text-[#111111] truncate max-w-[90px] sm:max-w-[120px]">
                {m.profile?.nickname ?? "멤버"}
              </span>
              {latestWeight && (
                <span className="text-[11px] text-[#666666] shrink-0 font-mono">
                  {latestWeight}kg
                  {diff && (
                    <strong
                      className={`ml-1 font-sans ${
                        parseFloat(diff) <= 0 ? "text-[#FF4D00]" : "text-blue-600"
                      }`}
                    >
                      ({parseFloat(diff) > 0 ? "+" : ""}
                      {diff}kg)
                    </strong>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Recharts Canvas */}
      <div className="w-full h-64 sm:h-72">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#999999] border border-dashed border-[#E5E5E5] rounded-[8px] p-4 text-center">
            <Activity className="w-6 h-6 text-[#D4D4D8] mb-1.5" />
            <span className="font-medium text-[#111111]">아직 기록된 체중 데이터가 없습니다</span>
            <span className="text-[11px] text-[#999999] mt-0.5">상단의 [오늘 기록] 버튼으로 첫 체중을 입력해보세요.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
            >
              {/* Reference Baseline at 0kg for Delta mode */}
              {chartMode === "delta" && (
                <ReferenceLine
                  y={0}
                  stroke="#D4D4D8"
                  strokeDasharray="3 3"
                  label={{
                    value: "0kg 기준",
                    fill: "#999999",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
              )}

              <XAxis
                dataKey="formattedDate"
                stroke="#A1A1AA"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
              />
              <YAxis
                stroke="#A1A1AA"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
                domain={chartMode === "delta" ? ["auto", "auto"] : ["dataMin - 1", "dataMax + 1"]}
                tickFormatter={(v) => (chartMode === "delta" ? `${v > 0 ? "+" : ""}${v}` : `${v}`)}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-[#E5E5E5] p-2.5 sm:p-3 rounded-[8px] shadow-md text-xs space-y-1.5 z-50">
                        <div className="font-bold text-[#111111] pb-1 border-b border-[#E5E5E5] flex items-center justify-between gap-4">
                          <span>{label}</span>
                          <span className="text-[10px] text-[#999999] font-normal">
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
