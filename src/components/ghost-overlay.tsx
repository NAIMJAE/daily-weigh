"use client";

import React, { useState, useMemo } from "react";
import { Eye, Layers, Sliders, Calendar, ArrowRightLeft, Sparkles, RefreshCw, ZoomIn } from "lucide-react";
import { BodyPhotoItem, DailyRecord } from "@/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { formatDate } from "@/lib/utils";

interface GhostOverlayProps {
  records: DailyRecord[];
  onClose?: () => void;
}

export function GhostOverlay({ records, onClose }: GhostOverlayProps) {
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

  // 기본 선택: 사진이 2장 이상이면 가장 과거 사진(A)과 가장 최신 사진(B)
  const defaultPhotoA = photoRecords.length > 1 ? photoRecords[photoRecords.length - 1] : photoRecords[0] || null;
  const defaultPhotoB = photoRecords[0] || null;

  const [photoA, setPhotoA] = useState<BodyPhotoItem | null>(defaultPhotoA);
  const [photoB, setPhotoB] = useState<BodyPhotoItem | null>(defaultPhotoB);
  
  // 비교 모드: overlay (불투명도 조절) vs split (좌우 스플릿 분할)
  const [viewMode, setViewMode] = useState<"overlay" | "split">("overlay");
  
  // 불투명도 / 스플릿 분할 비율 상태: 0 ~ 100
  const [sliderPos, setSliderPos] = useState<number>(50);
  
  // Blink(깜빡임) 토글 상태: true일 때는 강제로 100% 또는 0%로 스위칭
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

  // 프리셋 설정
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

  if (photoRecords.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-[#E5E5E5] rounded-[8px] space-y-3">
        <Layers className="w-8 h-8 text-[#999999] mx-auto" />
        <h3 className="text-sm font-bold text-[#111111]">
          등록된 눈바디 사진이 없습니다
        </h3>
        <p className="text-xs text-[#666666] max-w-sm mx-auto">
          데일리 기록에서 눈바디 사진을 2장 이상 업로드하시면 투명도 조절로 체형 변화를 직접 겹쳐볼 수 있습니다.
        </p>
      </div>
    );
  }

  // 실시간 렌더링할 상단 레이어 불투명도 계산
  const effectiveTopOpacity = isBlinking ? 1 : sliderPos / 100;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[#111111] flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#FF4D00] shrink-0" />
              눈바디 비교 뷰어
            </h3>
            <Badge variant="accent">Ghost Overlay & Split</Badge>
          </div>
          <p className="text-xs text-[#666666] mt-0.5">
            2장의 사진을 겹쳐보거나 좌우로 분할하여 미세한 체형 변화를 확인하세요.
          </p>
        </div>

        {/* View Mode & Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="inline-flex p-0.5 bg-[#F4F4F5] border border-[#E5E5E5] rounded-[6px]">
            <button
              type="button"
              onClick={() => setViewMode("overlay")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
                viewMode === "overlay"
                  ? "bg-white text-[#111111] shadow-2xs"
                  : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              불투명도 겹침
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
                viewMode === "split"
                  ? "bg-white text-[#111111] shadow-2xs"
                  : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              좌우 분할(Split)
            </button>
          </div>

          {photoRecords.length >= 2 && (
            <button
              type="button"
              onClick={() => setPreset("first-vs-latest")}
              className="px-2.5 py-1 bg-white border border-[#E5E5E5] hover:bg-[#F4F4F5] rounded-[6px] text-xs font-medium text-[#111111] transition-colors cursor-pointer hidden sm:inline-block"
            >
              처음 vs 오늘
            </button>
          )}

          <button
            type="button"
            onClick={handleSwap}
            title="사진 A/B 순서 바꾸기"
            className="p-1.5 bg-white border border-[#E5E5E5] hover:bg-[#F4F4F5] rounded-[6px] text-[#666666] hover:text-[#111111] transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">스왑</span>
          </button>
        </div>
      </div>

      {/* Main Comparison Canvas & Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left: Interactive Canvas Screen (8 cols) */}
        <div className="lg:col-span-8 space-y-3.5">
          <div className="relative w-full aspect-[3/4] max-h-[500px] sm:max-h-[540px] bg-[#18181B] rounded-[8px] overflow-hidden border border-[#E5E5E5] flex items-center justify-center select-none shadow-inner">
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
                  clipPath: viewMode === "split" ? `inset(0 0 0 ${sliderPos}%)` : undefined,
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
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-[#111111] shadow-md flex items-center justify-center text-[10px] font-bold">
                  ↔
                </div>
              </div>
            )}

            {/* Subtle Overlay HUD: Clean Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-20">
              <span className="px-2 py-0.5 bg-black/75 text-white text-[10px] sm:text-[11px] font-mono rounded-[4px] border border-white/10 backdrop-blur-xs">
                A (과거): {photoA ? formatDate(photoA.record_date) : "-"} ({photoA?.weight ?? "-"}kg)
              </span>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none z-20">
              <span className="px-2 py-0.5 bg-[#FF4D00] text-white text-[10px] sm:text-[11px] font-mono font-bold rounded-[4px] shadow-sm">
                B (현재): {photoB ? formatDate(photoB.record_date) : "-"} ({photoB?.weight ?? "-"}kg)
              </span>
            </div>

            {/* Weight Difference Indicator */}
            {photoA?.weight && photoB?.weight && (
              <div className="absolute bottom-3 left-3 pointer-events-none z-20">
                <span className="px-2.5 py-1 bg-black/80 text-white text-[11px] sm:text-xs font-semibold rounded-[4px] border border-white/10 backdrop-blur-xs">
                  체중 변화:{" "}
                  <strong className={photoB.weight <= photoA.weight ? "text-[#FF4D00]" : "text-blue-400"}>
                    {(photoB.weight - photoA.weight > 0 ? "+" : "")}
                    {(photoB.weight - photoA.weight).toFixed(1)} kg
                  </strong>
                </span>
              </div>
            )}

            {/* Blink Mode Status */}
            {isBlinking && (
              <div className="absolute bottom-3 right-3 pointer-events-none z-20">
                <span className="px-2 py-0.5 bg-[#FF4D00] text-white text-[10px] font-bold uppercase rounded-[4px] animate-pulse">
                  BLINK ACTIVE
                </span>
              </div>
            )}
          </div>

          {/* Slider & Quick Controls */}
          <div className="p-3.5 sm:p-4 bg-white border border-[#E5E5E5] rounded-[8px] space-y-3">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-semibold text-[#666666] flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#999999] shrink-0" />
                기준 A ({viewMode === "overlay" ? "0%" : "좌측"})
              </span>
              <span className="font-mono font-bold text-xs text-[#111111] px-2 py-0.5 bg-[#F4F4F5] rounded-[4px] whitespace-nowrap shrink-0">
                {viewMode === "overlay" ? `불투명도: ${sliderPos}%` : `분할위치: ${sliderPos}%`}
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
              className="w-full h-2 bg-[#E5E5E5] rounded-none appearance-none cursor-pointer focus:outline-none"
            />

            {/* Utility Buttons: Blink & Zoom Alignment */}
            <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {viewMode === "overlay" && (
                  <button
                    type="button"
                    onMouseDown={() => setIsBlinking(true)}
                    onMouseUp={() => setIsBlinking(false)}
                    onTouchStart={() => setIsBlinking(true)}
                    onTouchEnd={() => setIsBlinking(false)}
                    className="px-2.5 sm:px-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#111111] rounded-[6px] text-xs font-semibold text-[#111111] transition-colors cursor-pointer select-none active:bg-[#111111] active:text-white whitespace-nowrap shrink-0"
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
                  className="w-16 h-1 bg-[#E5E5E5] rounded-none"
                  title="확대 배율"
                />
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setAlignOffsetY(0);
                  }}
                  title="정렬 리셋"
                  className="p-1 hover:text-[#111111] text-[#999999]"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Quick Horizontal Strip (lg:hidden) */}
          <div className="lg:hidden p-3 bg-white border border-[#E5E5E5] rounded-[8px] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#666666]">
              <span>빠른 사진 선택 ({photoRecords.length}장)</span>
              <span className="text-[#999999]">A(과거) / B(현재) 탭</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {photoRecords.map((item) => {
                const isA = photoA?.id === item.id;
                const isB = photoB?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex-shrink-0 w-24 p-1.5 rounded-[6px] border text-center space-y-1 ${
                      isA
                        ? "bg-[#F4F4F5] border-[#111111]"
                        : isB
                        ? "bg-[#FFF1EB] border-[#FF4D00]"
                        : "bg-[#FAFAFA] border-[#E5E5E5]"
                    }`}
                  >
                    <div className="w-full aspect-[3/4] bg-[#E5E5E5] rounded-[4px] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.photo_url}
                        alt={item.record_date}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[10px] font-bold text-[#111111] truncate">
                      {formatDate(item.record_date)}
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setPhotoA(item)}
                        className={`text-[9px] font-bold py-0.5 rounded ${
                          isA ? "bg-[#111111] text-white" : "bg-white text-[#666666] border border-[#E5E5E5]"
                        }`}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoB(item)}
                        className={`text-[9px] font-bold py-0.5 rounded ${
                          isB ? "bg-[#FF4D00] text-white" : "bg-white text-[#666666] border border-[#E5E5E5]"
                        }`}
                      >
                        B
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Desktop 2-Photo Picker (4 cols, hidden on mobile) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="p-4 bg-white border border-[#E5E5E5] rounded-[8px] space-y-3">
            <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#666666]" />
              사진 갤러리 피커 ({photoRecords.length}장)
            </h4>
            <p className="text-[11px] text-[#666666]">
              기준 사진(A)과 비교 사진(B)을 지정하세요.
            </p>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {photoRecords.map((item) => {
                const isA = photoA?.id === item.id;
                const isB = photoB?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-2 rounded-[8px] border transition-colors flex items-center justify-between gap-3 ${
                      isA
                        ? "bg-[#F4F4F5] border-[#111111]"
                        : isB
                        ? "bg-[#FFF1EB] border-[#FF4D00]"
                        : "bg-white border-[#E5E5E5] hover:border-[#D4D4D8]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-14 bg-[#E5E5E5] rounded-[4px] overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.photo_url}
                          alt={item.record_date}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-[#111111]">
                          {formatDate(item.record_date)}
                        </div>
                        <div className="text-[11px] text-[#666666]">
                          {item.weight ? `${item.weight} kg` : "체중 미입력"}
                        </div>
                        {item.workout_tags && item.workout_tags.length > 0 && (
                          <div className="text-[10px] text-[#999999] truncate max-w-[120px]">
                            {item.workout_tags.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setPhotoA(item)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-[4px] transition-colors cursor-pointer border ${
                          isA
                            ? "bg-[#111111] text-white border-[#111111]"
                            : "bg-white text-[#666666] border-[#E5E5E5] hover:border-[#111111]"
                        }`}
                      >
                        A로 지정
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoB(item)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-[4px] transition-colors cursor-pointer border ${
                          isB
                            ? "bg-[#FF4D00] text-white border-[#FF4D00]"
                            : "bg-white text-[#666666] border-[#E5E5E5] hover:border-[#FF4D00]"
                        }`}
                      >
                        B로 지정
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
