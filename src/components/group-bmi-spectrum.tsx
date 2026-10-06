"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Activity, Info, X } from "lucide-react";
import { DailyRecord, GroupMember } from "@/types";

interface GroupBmiSpectrumProps {
  members: GroupMember[];
  records: DailyRecord[];
  currentUserId: string;
}

interface MemberBmiData {
  member: GroupMember;
  nickname: string;
  avatarUrl?: string;
  height?: number | null;
  weight?: number | null;
  bmi: number;
  isMe: boolean;
  angleDeg: number; // 180 (왼쪽 끝) ~ 0 (오른쪽 끝)
  pinX: number;
  pinY: number;
  ringLevel: number; // 겹침 방지용 반경 레벨 (0: 기본, 1: 바깥쪽)
}

// 6개 BMI 구간 정의 (첨부 이미지 게이지 기준)
const SECTORS = [
  {
    key: "underweight",
    name: "저체중",
    rangeText: "< 18.5",
    color: "#5C887B",
    textColor: "#ffffff",
    startAngle: 180,
    endAngle: 150,
  },
  {
    key: "normal",
    name: "정상",
    rangeText: "18.5~22.9",
    color: "#72BF8E",
    textColor: "#111111",
    startAngle: 150,
    endAngle: 120,
  },
  {
    key: "pre_obese",
    name: "비만 전단계",
    rangeText: "23~24.9",
    color: "#F5B754",
    textColor: "#111111",
    startAngle: 120,
    endAngle: 90,
  },
  {
    key: "obese_1",
    name: "1단계 비만",
    rangeText: "25~29.9",
    color: "#E87352",
    textColor: "#ffffff",
    startAngle: 90,
    endAngle: 60,
  },
  {
    key: "obese_2",
    name: "2단계 비만",
    rangeText: "30~34.9",
    color: "#D93B3E",
    textColor: "#ffffff",
    startAngle: 60,
    endAngle: 30,
  },
  {
    key: "obese_3",
    name: "3단계 비만",
    rangeText: "35 이상",
    color: "#991B24",
    textColor: "#ffffff",
    startAngle: 30,
    endAngle: 0,
  },
];

// SVG 차트 좌표 상수 (좌우 여백을 최소화하여 꽉 차게 렌더링)
const VIEW_WIDTH = 360;
const VIEW_HEIGHT = 205;
const CX = 180;
const CY = 190;
const R_OUT = 168; // 좌우 12px ~ 348px (360px 중 93.3% 꽉 찬 게이지)
const R_IN = 86;
const R_HUB = 80;

// BMI 수치를 게이지 각도(180도 ~ 0도)로 비례 매핑
function bmiToAngleDeg(bmi: number): number {
  if (bmi < 18.5) {
    const ratio = Math.max(0, Math.min(1, (bmi - 14.5) / (18.5 - 14.5)));
    return 180 - ratio * 30; // 180 -> 150
  } else if (bmi < 23.0) {
    const ratio = (bmi - 18.5) / (23.0 - 18.5);
    return 150 - ratio * 30; // 150 -> 120
  } else if (bmi < 25.0) {
    const ratio = (bmi - 23.0) / (25.0 - 23.0);
    return 120 - ratio * 30; // 120 -> 90
  } else if (bmi < 30.0) {
    const ratio = (bmi - 25.0) / (30.0 - 25.0);
    return 90 - ratio * 30; // 90 -> 60
  } else if (bmi < 35.0) {
    const ratio = (bmi - 30.0) / (35.0 - 30.0);
    return 60 - ratio * 30; // 60 -> 30
  } else {
    const ratio = Math.max(0, Math.min(1, (bmi - 35.0) / (39.0 - 35.0)));
    return 30 - ratio * 30; // 30 -> 0
  }
}

// 각도(deg)를 SVG 호(arc) 경로로 변환
function createSectorPath(startDeg: number, endDeg: number, rOut: number, rIn: number): string {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;

  const x1 = CX + rOut * Math.cos(startRad);
  const y1 = CY - rOut * Math.sin(startRad);
  const x2 = CX + rOut * Math.cos(endRad);
  const y2 = CY - rOut * Math.sin(endRad);

  const x3 = CX + rIn * Math.cos(endRad);
  const y3 = CY - rIn * Math.sin(endRad);
  const x4 = CX + rIn * Math.cos(startRad);
  const y4 = CY - rIn * Math.sin(startRad);

  return `M ${x1} ${y1} A ${rOut} ${rOut} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 0 0 ${x4} ${y4} Z`;
}

export function GroupBmiSpectrum({
  members,
  records,
  currentUserId,
}: GroupBmiSpectrumProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 멤버별 최신 체중 및 키를 기반으로 BMI 데이터 계산
  const { bmiMembers, missingHeightMembers } = useMemo(() => {
    const sortedRecords = [...records].sort((a, b) =>
      b.record_date.localeCompare(a.record_date)
    );

    const latestWeightMap = new Map<string, number>();
    sortedRecords.forEach((r) => {
      if (r.weight && !latestWeightMap.has(r.user_id)) {
        latestWeightMap.set(r.user_id, r.weight);
      }
    });

    const calculated: Omit<MemberBmiData, "pinX" | "pinY" | "ringLevel">[] = [];
    const missing: GroupMember[] = [];

    members.forEach((m) => {
      const isMe = m.user_id === currentUserId;
      const nickname = m.profile?.nickname || "멤버";
      const avatarUrl = m.profile?.avatar_url;
      const height = m.profile?.height;
      const weight = latestWeightMap.get(m.user_id) ?? m.profile?.start_weight ?? null;

      if (height && height > 0 && weight && weight > 0) {
        const heightM = height / 100;
        const bmi = Number((weight / (heightM * heightM)).toFixed(1));
        const angleDeg = bmiToAngleDeg(bmi);

        calculated.push({
          member: m,
          nickname,
          avatarUrl,
          height,
          weight,
          bmi,
          isMe,
          angleDeg,
        });
      } else {
        missing.push(m);
      }
    });

    // 각도 오름차순 (0도 -> 180도)
    calculated.sort((a, b) => a.angleDeg - b.angleDeg);

    // 각도가 가까우면 반경(R_pin)을 지그재그(2단)로 조절하여 겹침 방지
    const withPins: MemberBmiData[] = [];
    let lastAngle = -999;
    let currentLevel = 0;

    calculated.forEach((item) => {
      if (Math.abs(item.angleDeg - lastAngle) < 14) {
        currentLevel = currentLevel === 0 ? 1 : 0;
      } else {
        currentLevel = 0;
      }
      lastAngle = item.angleDeg;

      const rad = (item.angleDeg * Math.PI) / 180;
      const rPin = currentLevel === 0 ? R_OUT + 14 : R_OUT + 38;
      const pinX = CX + rPin * Math.cos(rad);
      const pinY = CY - rPin * Math.sin(rad);

      withPins.push({
        ...item,
        pinX,
        pinY,
        ringLevel: currentLevel,
      });
    });

    return {
      bmiMembers: withPins,
      missingHeightMembers: missing,
    };
  }, [members, records, currentUserId]);

  // 클릭된 팝오버 상태: 선택된 멤버 및 마우스 클릭 위치
  const [activePopover, setActivePopover] = useState<{
    memberData: MemberBmiData;
    xPercent: number; // container width 대비 %
    yPercent: number; // container height 대비 %
  } | null>(null);

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleMarkerClick = (
    item: MemberBmiData,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    if (activePopover?.memberData.member.id === item.member.id) {
      setActivePopover(null);
      return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setActivePopover({
      memberData: item,
      xPercent: Math.max(10, Math.min(90, x)),
      yPercent: Math.max(10, Math.min(85, y)),
    });
  };

  // '나'의 위치 데이터
  const myData = bmiMembers.find((m) => m.isMe);

  // 바늘이 가리킬 대상 (클릭하여 팝오버가 열린 멤버 우선, 없으면 '나' 또는 첫 번째 멤버)
  const targetMemberData = activePopover?.memberData || myData || bmiMembers[0] || null;

  return (
    <section
      ref={containerRef}
      className="bg-white border border-[#E5E5E5] rounded-[12px] p-3.5 space-y-2 shadow-2xs relative select-none"
    >
      {/* 1. Header (오직 'BMI 스펙트럼' 제목만 깔끔하게) */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#FFF1EB] border border-[#FFD8CC] flex items-center justify-center shrink-0">
          <Activity className="w-3.5 h-3.5 text-[#FF4D00]" />
        </div>
        <h3 className="text-sm font-bold text-[#111111] tracking-tight">
          BMI 스펙트럼
        </h3>
      </div>

      {/* 2. Main Gauge Body (좌우 여백 없이 꽉 찬 풀 와이드) */}
      {bmiMembers.length === 0 ? (
        <div className="p-6 text-center bg-[#FAFAFA] border border-dashed border-[#E5E5E5] rounded-[8px] space-y-1">
          <p className="text-xs font-bold text-[#111111]">
            아직 BMI를 계산할 수 있는 회원이 없습니다.
          </p>
          <p className="text-[11px] text-[#999999]">
            마이페이지에서 키(cm)와 체중을 등록해보세요!
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-visible pt-3 pb-1">
          {/* SVG Gauge Graphic */}
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="w-full h-auto overflow-visible"
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.03))" }}
          >
            {/* 6 Color Sectors */}
            {SECTORS.map((sec) => {
              const pathData = createSectorPath(sec.startAngle, sec.endAngle, R_OUT, R_IN);
              const midAngle = (sec.startAngle + sec.endAngle) / 2;
              const midRad = (midAngle * Math.PI) / 180;
              const textR = (R_OUT + R_IN) / 2;
              const textX = CX + textR * Math.cos(midRad);
              const textY = CY - textR * Math.sin(midRad);

              return (
                <g key={sec.key}>
                  {/* Arc Path */}
                  <path
                    d={pathData}
                    fill={sec.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-colors"
                  />

                  {/* Section Label & Range Text */}
                  <text
                    x={textX}
                    y={textY - 3.5}
                    textAnchor="middle"
                    fill={sec.textColor}
                    fontSize="11.5"
                    fontWeight="800"
                    style={{
                      fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard Variable', Pretendard, sans-serif",
                    }}
                  >
                    {sec.name}
                  </text>
                  <text
                    x={textX}
                    y={textY + 10.5}
                    textAnchor="middle"
                    fill={sec.textColor}
                    opacity="0.95"
                    fontSize="10"
                    fontWeight="400"
                    style={{
                      fontFamily: "var(--font-geist-mono), var(--font-geist-sans), -apple-system, Pretendard, sans-serif",
                    }}
                  >
                    {sec.rangeText}
                  </text>
                </g>
              );
            })}

            {/* Inner Hub (중심부 반원) */}
            <path
              d={`M ${CX - R_HUB} ${CY} A ${R_HUB} ${R_HUB} 0 0 1 ${CX + R_HUB} ${CY} Z`}
              fill="#F9F6F0"
              stroke="#E5E0D8"
              strokeWidth="1.5"
            />

            {/* Hub Border Line */}
            <line
              x1={CX - R_OUT}
              y1={CY}
              x2={CX + R_OUT}
              y2={CY}
              stroke="#D1C7B8"
              strokeWidth="2"
            />

            {/* 심플 블랙 속도계 바늘 (선택한 회원/본인 위치로 부드럽게 실시간 회전) */}
            {targetMemberData && (
              <g
                style={{
                  transformOrigin: `${CX}px ${CY}px`,
                  transform: `rotate(${90 - targetMemberData.angleDeg}deg)`,
                  transition: "transform 0.5s cubic-bezier(0.34, 1.35, 0.64, 1)",
                }}
              >
                {/* 1. 바늘 그림자 */}
                <polygon
                  points={`${CX},${CY - (R_OUT - 12)} ${CX + 4},${CY + 4} ${CX - 4},${CY + 4}`}
                  fill="rgba(0,0,0,0.18)"
                  transform="translate(1, 2)"
                />

                {/* 2. 심플 블랙 바늘 본체 */}
                <polygon
                  points={`${CX},${CY - (R_OUT - 12)} ${CX + 4},${CY} ${CX - 4},${CY}`}
                  fill="#111111"
                  stroke="#111111"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />

                {/* 3. 중앙 피벗 (외곽 화이트 림 + 이너 블랙) */}
                <circle
                  cx={CX}
                  cy={CY}
                  r="7.5"
                  fill="#111111"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <circle cx={CX} cy={CY} r="2.5" fill="#FFFFFF" />
              </g>
            )}
          </svg>

          {/* Member Interactive Avatar Pins Layer (SVG 위에 절대 좌표로 오버레이) */}
          <div className="absolute inset-0 pointer-events-none">
            {bmiMembers.map((item) => {
              const leftPercent = (item.pinX / VIEW_WIDTH) * 100;
              const topPercent = (item.pinY / VIEW_HEIGHT) * 100;
              const isSelected = activePopover?.memberData.member.id === item.member.id;

              return (
                <div
                  key={item.member.id}
                  onClick={(e) => handleMarkerClick(item, e)}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer flex flex-col items-center group z-30 transition-transform active:scale-90"
                >
                  {/* Avatar Chip with Pointer Badge */}
                  <div
                    className={`flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-full border shadow-sm transition-all ${
                      isSelected
                        ? "bg-[#111111] text-white border-[#111111] scale-110 ring-2 ring-[#FF4D00]/50 z-40"
                        : item.isMe
                        ? "bg-[#FFF1EB] text-[#FF4D00] border-[#FFD8CC] hover:scale-105"
                        : "bg-white text-[#222222] border-[#E5E5E5] hover:border-[#999999] hover:scale-105"
                    }`}
                  >
                    {/* Avatar Image */}
                    <div className="w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center text-[9px] font-bold overflow-hidden shrink-0">
                      {item.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.avatarUrl}
                          alt={item.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{item.nickname.slice(0, 1)}</span>
                      )}
                    </div>

                    {/* Member Name */}
                    <span className="text-[10px] font-extrabold truncate max-w-[48px]">
                      {item.isMe ? "나" : item.nickname}
                    </span>
                  </div>

                  {/* Pin Pointer Arrow Needle */}
                  <div
                    className={`w-1 h-1 rotate-45 -mt-0.5 border-r border-b ${
                      isSelected
                        ? "bg-[#111111] border-[#111111]"
                        : item.isMe
                        ? "bg-[#FFF1EB] border-[#FFD8CC]"
                        : "bg-white border-[#E5E5E5]"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* 3. Floating Popover (마커 클릭 위치 아래로 생성되는 툴팁/팝오버) */}
          {activePopover && (
            <div
              style={{
                left: `${activePopover.xPercent}%`,
                top: `${activePopover.yPercent}%`,
                transform: "translate(-50%, 14px)",
              }}
              onClick={(e) => e.stopPropagation()}
              className="absolute z-50 min-w-[200px] p-3 bg-[#111111] text-white rounded-[10px] shadow-xl border border-white/10 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Tooltip Top Tail Triangle (위쪽 마커를 가리키는 꼬리표) */}
              <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-3 h-3 bg-[#111111] rotate-45 border-l border-t border-white/10" />

              {/* Popover Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border border-white/20">
                    {activePopover.memberData.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activePopover.memberData.avatarUrl}
                        alt={activePopover.memberData.nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{activePopover.memberData.nickname.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold truncate">
                        {activePopover.memberData.nickname}
                      </span>
                      {activePopover.memberData.isMe && (
                        <span className="text-[9px] text-[#FF4D00] font-bold bg-[#FF4D00]/20 px-1 py-0.2 rounded">
                          나
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      BMI {activePopover.memberData.bmi}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePopover(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="닫기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Popover Body (키, 체중, BMI 상세) */}
              <div className="grid grid-cols-3 gap-1 pt-2 text-center text-[11px] font-mono">
                <div className="bg-white/5 p-1 rounded">
                  <div className="text-[9px] text-zinc-400">키</div>
                  <div className="font-bold text-white">{activePopover.memberData.height}cm</div>
                </div>
                <div className="bg-white/5 p-1 rounded">
                  <div className="text-[9px] text-zinc-400">체중</div>
                  <div className="font-bold text-white">{activePopover.memberData.weight}kg</div>
                </div>
                <div className="bg-[#FF4D00]/20 p-1 rounded border border-[#FF4D00]/40">
                  <div className="text-[9px] text-[#FF824D]">BMI</div>
                  <div className="font-extrabold text-[#FF4D00]">{activePopover.memberData.bmi}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Missing Height Members (키 미입력 회원이 있을 경우) */}
      {missingHeightMembers.length > 0 && (
        <div className="pt-2 border-t border-[#E5E5E5]/60 flex items-center gap-1.5 text-[11px] text-[#999999] flex-wrap">
          <Info className="w-3 h-3 text-[#999999] shrink-0" />
          <span>키 미등록 회원:</span>
          {missingHeightMembers.map((m) => (
            <span
              key={m.id}
              className="px-1.5 py-0.2 bg-[#F4F4F5] rounded text-[10px] text-[#666666] font-medium"
            >
              {m.profile?.nickname || "멤버"}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
