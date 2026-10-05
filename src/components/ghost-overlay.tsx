"use client";

import React, { useState, useMemo } from "react";
import {
  Eye,
  Layers,
  ArrowRightLeft,
  RefreshCw,
  ZoomIn,
  Plus,
  Calendar,
  Check,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Scale,
} from "lucide-react";
import { BodyPhotoItem, DailyRecord } from "@/types";
import { Button } from "./ui/button";
import { formatDate } from "@/lib/utils";

interface GhostOverlayProps {
  records: DailyRecord[];
  onClose?: () => void;
  onOpenAddPhoto?: () => void;
}

export function GhostOverlay({
  records,
  onClose,
  onOpenAddPhoto,
}: GhostOverlayProps) {
  // 눈바디 사진이 있는 기록들만 필터링 (최신순 정렬)
  const photoRecords: BodyPhotoItem[] = useMemo(() => {
    return records
      .filter((r) => Boolean(r.photo_url))
      .map((r) => ({
        id: r.id,
        record_date: r.record_date,
        photo_url: r.photo_url!,
        weight: r.weight,
        workout_tags: r.workout_tags,
      }))
      .sort((a, b) => b.record_date.localeCompare(a.record_date));
  }, [records]);

  // 기본 선택 상태: 2장 이상이면 과거 사진(A)과 최신 사진(B)
  const defaultPhotoA =
    photoRecords.length > 1
      ? photoRecords[photoRecords.length - 1]
      : photoRecords[0] || null;
  const defaultPhotoB =
    photoRecords.length > 1
      ? photoRecords[0]
      : photoRecords[0] || null;

  const [photoA, setPhotoA] = useState<BodyPhotoItem | null>(defaultPhotoA);
  const [photoB, setPhotoB] = useState<BodyPhotoItem | null>(defaultPhotoB);

  // 단계: "select" (날짜 목록 선택) vs "compare" (1:1 겹치기 뷰어)
  const [currentStep, setCurrentStep] = useState<"select" | "compare">("select");

  // 비교 모드: overlay (불투명도 조절) vs split (좌우 스플릿 분할)
  const [viewMode, setViewMode] = useState<"overlay" | "split">("overlay");

  // 불투명도 / 스플릿 분할 비율 상태: 0 ~ 100
  const [sliderPos, setSliderPos] = useState<number>(50);

  // Blink(깜빡임) 토글 상태
  const [isBlinking, setIsBlinking] = useState(false);

  // 미세 확대(Zoom) 및 위치 정렬 배율
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [alignOffsetY, setAlignOffsetY] = useState<number>(0);

  // 사진 A / B 스왑
  const handleSwap = () => {
    const temp = photoA;
    setPhotoA(photoB);
    setPhotoB(temp);
  };

  // 날짜 카드 클릭 시 A -> B 순차 선택 로직
  const handleCardClick = (item: BodyPhotoItem) => {
    if (photoA?.id === item.id) {
      // 이미 A로 선택된 경우 -> 해제
      setPhotoA(null);
    } else if (photoB?.id === item.id) {
      // 이미 B로 선택된 경우 -> 해제
      setPhotoB(null);
    } else {
      // 둘 다 비어있거나 A가 비어있으면 A로 설정
      if (!photoA) {
        setPhotoA(item);
      } else if (!photoB) {
        // B가 비어있으면 B로 설정
        setPhotoB(item);
      } else {
        // 둘 다 차있는 경우: B를 새 선택으로 교체
        setPhotoB(item);
      }
    }
  };

  // 프리셋 빠른 선택
  const setPreset = (type: "first-vs-latest" | "prev-vs-latest") => {
    if (photoRecords.length < 2) return;
    if (type === "first-vs-latest") {
      setPhotoA(photoRecords[photoRecords.length - 1]);
      setPhotoB(photoRecords[0]);
    } else if (type === "prev-vs-latest") {
      setPhotoA(photoRecords[1]);
      setPhotoB(photoRecords[0]);
    }
  };

  // 사진이 0장인 경우
  if (photoRecords.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-[#E5E5E5] rounded-[12px] space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-[#FFF1EB] border border-[#FFD8CC] flex items-center justify-center mx-auto">
          <Layers className="w-6 h-6 text-[#FF4D00]" />
        </div>
        <h3 className="text-sm font-bold text-[#111111]">
          등록된 눈바디 사진이 없습니다
        </h3>
        <p className="text-xs text-[#666666] max-w-sm mx-auto leading-relaxed">
          오늘의 체형을 사진으로 기록하시면 과거와 현재의 변화를 1:1 투명도 겹침 및 분할로 정밀 비교할 수 있습니다.
        </p>
        {onOpenAddPhoto && (
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddPhoto}
              className="gap-1.5 mx-auto text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              첫 눈바디 사진 등록하기
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 사진이 1장인 경우
  if (photoRecords.length === 1) {
    const single = photoRecords[0];
    return (
      <div className="space-y-4">
        <div className="p-6 text-center bg-white border border-[#E5E5E5] rounded-[12px] space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#FFF1EB] border border-[#FFD8CC] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6 text-[#FF4D00]" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">
            눈바디 사진이 1장 등록되어 있습니다
          </h3>
          <p className="text-xs text-[#666666] max-w-sm mx-auto leading-relaxed">
            1:1 겹쳐보기로 체형 변화를 비교하려면 <strong>최소 2장의 사진</strong>이 필요합니다. 사진을 1장 더 추가해보세요!
          </p>

          <div className="w-32 aspect-[3/4] mx-auto rounded-[8px] overflow-hidden border border-[#E5E5E5] shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={single.photo_url}
              alt="기록된 사진"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-[#999999] font-mono">
            {formatDate(single.record_date)} ({single.weight ?? "-"}kg)
          </p>

          {onOpenAddPhoto && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenAddPhoto}
                className="gap-1.5 mx-auto text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                새 눈바디 사진 추가하기
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 실시간 렌더링할 상단 레이어 불투명도 계산
  const effectiveTopOpacity = isBlinking ? 1 : sliderPos / 100;

  // ==========================================
  // VIEW 1: 날짜 목록 선택 화면 (Step: "select")
  // ==========================================
  if (currentStep === "select") {
    const isBothSelected = Boolean(photoA && photoB);

    return (
      <div className="space-y-4">
        {/* 안내 및 퀵 프리셋 버튼 바 */}
        <div className="p-3.5 bg-white border border-[#E5E5E5] rounded-[10px] space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#FF4D00]" />
              <span className="text-xs font-bold text-[#111111]">
                비교할 날짜 2개 선택
              </span>
              <span className="text-[11px] text-[#666666]">
                ({(photoA ? 1 : 0) + (photoB ? 1 : 0)}/2개 선택됨)
              </span>
            </div>

            {onOpenAddPhoto && (
              <button
                type="button"
                onClick={onOpenAddPhoto}
                className="text-xs text-[#FF4D00] hover:text-[#E64500] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>사진 추가</span>
              </button>
            )}
          </div>

          {/* 퀵 프리셋 단축 버튼 */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={() => setPreset("first-vs-latest")}
              className="px-2.5 py-1 bg-[#FFF9F6] border border-[#FFD8CC] hover:bg-[#FFF1EB] rounded-[6px] text-xs font-semibold text-[#FF4D00] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>처음 vs 오늘</span>
            </button>
            {photoRecords.length > 2 && (
              <button
                type="button"
                onClick={() => setPreset("prev-vs-latest")}
                className="px-2.5 py-1 bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#111111] rounded-[6px] text-xs font-semibold text-[#666666] transition-colors cursor-pointer"
              >
                직전 vs 오늘
              </button>
            )}
            {(photoA || photoB) && (
              <button
                type="button"
                onClick={() => {
                  setPhotoA(null);
                  setPhotoB(null);
                }}
                className="px-2.5 py-1 bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#111111] rounded-[6px] text-xs font-semibold text-[#999999] hover:text-[#111111] transition-colors cursor-pointer ml-auto"
              >
                선택 초기화
              </button>
            )}
          </div>
        </div>

        {/* 2열 사진 날짜 갤러리 그리드 */}
        <div className="grid grid-cols-2 gap-2.5">
          {photoRecords.map((item) => {
            const isA = photoA?.id === item.id;
            const isB = photoB?.id === item.id;
            const isSelected = isA || isB;

            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className={`relative rounded-[10px] border p-2 space-y-1.5 transition-all cursor-pointer select-none ${
                  isA
                    ? "bg-[#18181B] text-white border-[#111111] shadow-md ring-2 ring-[#111111]/20 scale-[0.99]"
                    : isB
                    ? "bg-[#FFF9F6] border-[#FF4D00] shadow-md ring-2 ring-[#FF4D00]/20 scale-[0.99]"
                    : "bg-white border-[#E5E5E5] hover:border-[#CCCCCC] shadow-2xs hover:shadow-xs"
                }`}
              >
                {/* 사진 썸네일 (3:4 비율) */}
                <div className="relative w-full aspect-[3/4] bg-[#F4F4F5] rounded-[6px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.photo_url}
                    alt={item.record_date}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* 선택 상태 뱃지 (사진 좌상단 오버레이) */}
                  <div className="absolute top-1.5 left-1.5 z-10">
                    {isA ? (
                      <span className="px-2 py-0.5 bg-[#111111] text-white text-[11px] font-extrabold rounded-[4px] shadow-sm flex items-center gap-1 border border-white/20">
                        <Check className="w-3 h-3 text-[#FF4D00]" />
                        1. 기준(A)
                      </span>
                    ) : isB ? (
                      <span className="px-2 py-0.5 bg-[#FF4D00] text-white text-[11px] font-extrabold rounded-[4px] shadow-sm flex items-center gap-1">
                        <Check className="w-3 h-3 text-white" />
                        2. 비교(B)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-semibold rounded-[4px]">
                        선택
                      </span>
                    )}
                  </div>
                </div>

                {/* 정보 영역: 날짜 & 체중 */}
                <div className="space-y-0.5 text-left pt-0.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold truncate ${
                        isA ? "text-white" : "text-[#111111]"
                      }`}
                    >
                      {formatDate(item.record_date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-mono font-bold ${
                        isA
                          ? "text-[#CCCCCC]"
                          : isB
                          ? "text-[#FF4D00]"
                          : "text-[#666666]"
                      }`}
                    >
                      {item.weight ? `⚖️ ${item.weight}kg` : "체중 미입력"}
                    </span>
                    {item.workout_tags && item.workout_tags.length > 0 && (
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded ${
                          isA
                            ? "bg-white/20 text-white"
                            : "bg-[#F4F4F5] text-[#666666]"
                        }`}
                      >
                        운동 {item.workout_tags.length}개
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 고정 액션 바 (선택 완료 시 겹쳐보기 뷰로 이동) */}
        <div className="sticky bottom-20 z-30 pt-2 pb-1">
          <div className="p-3 bg-white/95 backdrop-blur-md border border-[#E5E5E5] rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[#111111]">
                  {photoA ? `A: ${formatDate(photoA.record_date)}` : "A: 미선택"}
                </span>
                <span className="text-[#CCCCCC]">vs</span>
                <span className="font-bold text-[#FF4D00]">
                  {photoB ? `B: ${formatDate(photoB.record_date)}` : "B: 미선택"}
                </span>
              </div>

              {photoA?.weight && photoB?.weight && (
                <span
                  className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                    photoB.weight <= photoA.weight
                      ? "bg-[#FFF1EB] text-[#FF4D00]"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {photoB.weight - photoA.weight > 0 ? "+" : ""}
                  {(photoB.weight - photoA.weight).toFixed(1)}kg
                </span>
              )}
            </div>

            <Button
              type="button"
              variant={isBothSelected ? "primary" : "secondary"}
              disabled={!isBothSelected}
              onClick={() => setCurrentStep("compare")}
              className={`w-full py-3 text-xs font-extrabold gap-2 cursor-pointer transition-all ${
                isBothSelected
                  ? "shadow-md hover:scale-[1.01] active:scale-95"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>
                {isBothSelected
                  ? "선택한 2장 겹쳐보기 시작 →"
                  : !photoA && !photoB
                  ? "비교할 사진 2장을 선택해주세요 (0/2)"
                  : "비교할 사진 1장을 더 선택해주세요 (1/2)"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: 1:1 겹치기 뷰어 화면 (Step: "compare")
  // ==========================================
  return (
    <div className="space-y-3">
      {/* 상단 컨트롤 바: 날짜 목록으로 돌아가기 & 모드 전환 & 스왑 */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-0.5">
        <button
          type="button"
          onClick={() => setCurrentStep("select")}
          className="px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#111111] hover:bg-white rounded-[6px] text-xs font-bold text-[#111111] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#FF4D00]" />
          <span>날짜 다시 선택</span>
        </button>

        {/* Mode Switcher */}
        <div className="inline-flex p-0.5 bg-[#F4F4F5] border border-[#E5E5E5] rounded-[6px] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("overlay")}
            className={`px-2.5 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
              viewMode === "overlay"
                ? "bg-white text-[#FF4D00] shadow-2xs border border-[#E5E5E5]"
                : "text-[#666666] hover:text-[#111111]"
            }`}
          >
            불투명도 겹침
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-2.5 py-1 text-xs font-bold rounded-[4px] transition-all cursor-pointer ${
              viewMode === "split"
                ? "bg-white text-[#FF4D00] shadow-2xs border border-[#E5E5E5]"
                : "text-[#666666] hover:text-[#111111]"
            }`}
          >
            좌우 분할(Split)
          </button>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={handleSwap}
          title="사진 A/B 순서 바꾸기"
          className="px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#111111] hover:bg-white rounded-[6px] text-[#111111] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold shrink-0 shadow-2xs"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-[#FF4D00]" />
          <span>스왑</span>
        </button>
      </div>

      {/* Main Comparison Canvas & Viewport */}
      <div className="space-y-3">
        {/* Canvas */}
        <div className="relative w-full aspect-[3/4] max-h-[500px] bg-[#18181B] rounded-[10px] overflow-hidden border border-[#E5E5E5] flex items-center justify-center select-none shadow-inner">
          {/* Layer A (Base / Left Side in Split Mode) */}
          {photoA && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
              style={{
                transform: `scale(${zoomLevel}) translateY(${alignOffsetY}px)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoA.photo_url}
                alt="기준 사진 A"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Layer B (Overlay or Split Curtain) */}
          {photoB && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-75"
              style={{
                opacity: viewMode === "overlay" ? effectiveTopOpacity : 1,
                clipPath:
                  viewMode === "split"
                    ? `inset(0 0 0 ${sliderPos}%)`
                    : undefined,
                transform: `scale(${zoomLevel}) translateY(${alignOffsetY}px)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoB.photo_url}
                alt="비교 사진 B"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Split Mode Vertical Divider Line */}
          {viewMode === "split" && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none z-10"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-[#111111] shadow-md flex items-center justify-center text-[12px] font-bold">
                ↔
              </div>
            </div>
          )}

          {/* HUD Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-20">
            <span className="px-2 py-0.5 bg-black/80 text-white text-xs font-mono rounded-[4px] border border-white/10 backdrop-blur-xs">
              A (기준): {photoA ? formatDate(photoA.record_date) : "-"}{" "}
              ({photoA?.weight ?? "-"}kg)
            </span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none z-20">
            <span className="px-2 py-0.5 bg-[#FF4D00] text-white text-xs font-mono font-bold rounded-[4px] shadow-sm">
              B (비교): {photoB ? formatDate(photoB.record_date) : "-"}{" "}
              ({photoB?.weight ?? "-"}kg)
            </span>
          </div>

          {/* Weight Difference Indicator */}
          {photoA?.weight && photoB?.weight && (
            <div className="absolute bottom-3 left-3 pointer-events-none z-20">
              <span className="px-2.5 py-1 bg-black/85 text-white text-xs font-semibold rounded-[4px] border border-white/10 backdrop-blur-xs">
                체중 변화:{" "}
                <strong
                  className={
                    photoB.weight <= photoA.weight
                      ? "text-[#FF4D00]"
                      : "text-blue-400"
                  }
                >
                  {photoB.weight - photoA.weight > 0 ? "+" : ""}
                  {(photoB.weight - photoA.weight).toFixed(1)} kg
                </strong>
              </span>
            </div>
          )}

          {/* Blink Mode Status */}
          {isBlinking && (
            <div className="absolute bottom-3 right-3 pointer-events-none z-20">
              <span className="px-2 py-0.5 bg-[#FF4D00] text-white text-[12px] font-bold uppercase rounded-[4px] animate-pulse">
                BLINK ACTIVE
              </span>
            </div>
          )}
        </div>

        {/* Slider & Controls Box */}
        <div className="p-3.5 bg-white border border-[#E5E5E5] rounded-[10px] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-semibold text-[#666666] flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#999999] shrink-0" />
              기준 A ({viewMode === "overlay" ? "0%" : "좌측"})
            </span>
            <span className="font-mono font-bold text-xs text-[#111111] px-2 py-0.5 bg-[#F4F4F5] rounded-[4px] whitespace-nowrap shrink-0">
              {viewMode === "overlay"
                ? `불투명도: ${sliderPos}%`
                : `분할위치: ${sliderPos}%`}
            </span>
            <span className="font-semibold text-[#FF4D00] flex items-center gap-1.5 whitespace-nowrap shrink-0">
              비교 B ({viewMode === "overlay" ? "100%" : "우측"})
              <span className="w-2 h-2 rounded-full bg-[#FF4D00] shrink-0" />
            </span>
          </div>

          {/* Slider Bar */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="w-full h-2 bg-[#E5E5E5] rounded-none appearance-none cursor-pointer focus:outline-none accent-[#FF4D00]"
          />

          {/* Utility Buttons: Blink & Zoom Alignment */}
          <div className="flex flex-wrap items-center justify-between pt-0.5 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {viewMode === "overlay" && (
                <button
                  type="button"
                  onMouseDown={() => setIsBlinking(true)}
                  onMouseUp={() => setIsBlinking(false)}
                  onTouchStart={() => setIsBlinking(true)}
                  onTouchEnd={() => setIsBlinking(false)}
                  className="px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#111111] rounded-[6px] text-xs font-semibold text-[#111111] transition-colors cursor-pointer select-none active:bg-[#111111] active:text-white whitespace-nowrap shrink-0"
                >
                  ⚡ 깜빡임 (누르고 있기)
                </button>
              )}
              <button
                type="button"
                onClick={() => setSliderPos(50)}
                className="px-2.5 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#111111] rounded-[6px] font-semibold text-[#666666] hover:text-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                5:5 중앙 맞춤
              </button>
            </div>

            {/* Position/Zoom adjustments */}
            <div className="flex items-center gap-2 text-xs text-[#666666]">
              <ZoomIn className="w-3.5 h-3.5 text-[#999999]" />
              <input
                type="range"
                min="1"
                max="1.5"
                step="0.05"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="w-16 h-1 bg-[#E5E5E5] rounded-none accent-[#FF4D00]"
                title="확대 배율"
              />
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setAlignOffsetY(0);
                }}
                title="정렬 리셋"
                className="p-1 hover:text-[#111111] text-[#999999] cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 하단 날짜 다시 선택 바로가기 버튼 */}
        <div className="pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurrentStep("select")}
            className="w-full py-2.5 text-xs font-bold gap-2 border border-[#E5E5E5] hover:border-[#111111] cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#FF4D00]" />
            <span>다른 날짜 사진 선택하러 가기</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
