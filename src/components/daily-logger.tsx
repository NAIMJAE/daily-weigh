"use client";

import React, { useState } from "react";
import { Scale, Camera, Dumbbell, Sparkles, Check, Upload, Trash2 } from "lucide-react";
import { DailyRecord } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { compressImage } from "@/lib/image-compressor";

interface DailyLoggerProps {
  currentRecord?: DailyRecord | null;
  startWeight?: number | null;
  groupName?: string;
  onSave: (recordData: Partial<DailyRecord>) => void;
  onClose: () => void;
}

const WORKOUT_PRESETS = [
  "헬스/웨이트",
  "러닝/유산소",
  "홈트레이닝",
  "수영",
  "구기운동",
  "필라테스/요가",
  "가벼운 산책",
  "휴식 데이",
];

const WORKOUT_TIME_PRESETS = [15, 30, 45, 60, 90];

export function DailyLogger({
  currentRecord,
  startWeight,
  groupName,
  onSave,
  onClose,
}: DailyLoggerProps) {
  // 모듈별 독립 상태
  const [weight, setWeight] = useState<string>(
    currentRecord?.weight ? String(currentRecord.weight) : ""
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    currentRecord?.photo_url ?? null
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    currentRecord?.workout_tags ?? []
  );
  const [workoutMinutes, setWorkoutMinutes] = useState<string>(
    currentRecord?.workout_minutes ? String(currentRecord.workout_minutes) : "30"
  );
  const [memo, setMemo] = useState<string>(currentRecord?.memo ?? "");
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);

  // 최소 1개 이상 입력 여부 확인
  const hasWeight = Boolean(weight.trim());
  const hasPhoto = Boolean(photoUrl);
  const hasWorkout = selectedTags.length > 0;
  const hasMemo = Boolean(memo.trim());
  const hasAtLeastOne = hasWeight || hasPhoto || hasWorkout || hasMemo;

  // 열정 포인트 실시간 계산
  let calculatedPoints = 0;
  if (hasWeight) calculatedPoints += 10;
  if (hasPhoto) calculatedPoints += 15;
  if (hasWorkout) {
    calculatedPoints += 20;
    if (parseInt(workoutMinutes || "0") >= 30) calculatedPoints += 5;
  }
  const isAllClear = hasWeight && hasPhoto && hasWorkout;
  if (isAllClear) calculatedPoints += 15;

  const completedCount = [hasWeight, hasPhoto, hasWorkout].filter(Boolean).length;

  // 사진 업로드 및 자동 압축
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const result = await compressImage(file, 1080, 0.82);
      setPhotoUrl(result.dataUrl);
      setPhotoSizeKb(result.sizeKb);
    } catch (err) {
      console.error("Image compression error:", err);
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsCompressing(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const adjustWeight = (delta: number) => {
    const base = parseFloat(weight || (startWeight ? String(startWeight) : "70"));
    const updated = Math.max(20, Math.min(300, base + delta));
    setWeight(updated.toFixed(1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAtLeastOne) return;

    onSave({
      weight: weight ? parseFloat(weight) : null,
      photo_url: photoUrl,
      workout_tags: selectedTags.length > 0 ? selectedTags : null,
      workout_minutes: selectedTags.length > 0 && workoutMinutes ? parseInt(workoutMinutes) : null,
      memo: memo.trim() || null,
      points_earned: calculatedPoints,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Target Group Info Badge */}
      {groupName && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#FFF9F6] border border-[#FFD8CC] rounded-[8px] text-xs">
          <span className="text-[#666666] text-[11px] font-medium">기록 대상 그룹</span>
          <span className="font-bold text-[#FF4D00] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF4D00]" />
            {groupName}
          </span>
        </div>
      )}

      {/* Zero Friction Notice & Real-time Progress Bar */}
      <div className="p-3 bg-[#F4F4F5] border border-[#E5E5E5] rounded-[8px] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-[#111111]">
            <span className="w-2 h-2 rounded-full bg-[#FF4D00]" />
            <span>원하는 것 <strong>1개만 입력해도 출석 인정!</strong></span>
          </div>
          <Badge variant={isAllClear ? "accent" : calculatedPoints > 0 ? "default" : "outline"}>
            +{calculatedPoints}P {isAllClear && "👑 올클리어"}
          </Badge>
        </div>

        {/* 3-Step Progress Indicator */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <div className={`h-1.5 rounded-full transition-colors ${hasWeight ? "bg-[#FF4D00]" : "bg-[#E5E5E5]"}`} />
          <div className={`h-1.5 rounded-full transition-colors ${hasPhoto ? "bg-[#FF4D00]" : "bg-[#E5E5E5]"}`} />
          <div className={`h-1.5 rounded-full transition-colors ${hasWorkout ? "bg-[#FF4D00]" : "bg-[#E5E5E5]"}`} />
        </div>
      </div>

      {/* Module 1: ⚖️ 체중 입력 */}
      <div className="p-3.5 sm:p-4 bg-white border border-[#E5E5E5] rounded-[8px] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#FF4D00] shrink-0" />
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              오늘의 체중 (선택)
            </span>
          </div>
          {weight && startWeight && (
            <span className="text-[11px] sm:text-xs font-medium text-[#666666]">
              시작({startWeight}kg) 대비{" "}
              <strong className={parseFloat(weight) <= startWeight ? "text-[#FF4D00]" : "text-blue-600"}>
                {(parseFloat(weight) - startWeight > 0 ? "+" : "")}
                {(parseFloat(weight) - startWeight).toFixed(1)}kg
              </strong>
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={weight}
              onChange={(e) => {
                const val = e.target.value.replace(",", ".");
                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setWeight(val);
                }
              }}
              placeholder="예: 74.5"
              className="w-full text-2xl font-bold px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111] font-mono tracking-tight"
            />
            <span className="absolute right-3.5 top-3.5 text-sm font-bold text-[#999999]">
              kg
            </span>
          </div>

          {/* Quick Delta Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-semibold text-[#999999] uppercase mr-1">퀵 조정:</span>
            {[-0.5, -0.2, -0.1, 0.1, 0.2, 0.5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => adjustWeight(delta)}
                className="px-2 py-1 bg-white border border-[#E5E5E5] rounded-[6px] text-xs font-semibold text-[#666666] hover:text-[#111111] hover:bg-[#F4F4F5] active:scale-95 transition-all cursor-pointer font-mono"
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
            {startWeight && (
              <button
                type="button"
                onClick={() => setWeight(String(startWeight))}
                className="px-2 py-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] text-[11px] font-medium text-[#666666] hover:text-[#111111] hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                시작체중 ({startWeight})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Module 2: 📸 눈바디 사진 (클라이언트 자동 압축) */}
      <div className="p-3.5 sm:p-4 bg-white border border-[#E5E5E5] rounded-[8px] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#FF4D00] shrink-0" />
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              오늘의 눈바디 사진 (선택)
            </span>
          </div>
          <span className="text-[11px] text-[#999999]">
            +15P · 겹쳐보기에 활용
          </span>
        </div>

        {photoUrl ? (
          <div className="relative w-full aspect-[4/3] max-h-52 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="눈바디 프리뷰"
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoUrl(null);
                setPhotoSizeKb(null);
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-[6px] hover:bg-black transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {photoSizeKb && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] rounded-[4px] font-mono">
                WebP ({photoSizeKb} KB)
              </span>
            )}
          </div>
        ) : (
          <label className="border border-dashed border-[#D4D4D8] hover:border-[#111111] rounded-[8px] p-5 sm:p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[#FAFAFA] active:bg-zinc-100">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={isCompressing}
            />
            <Upload className="w-5 h-5 text-[#666666]" />
            <div className="text-center">
              <span className="text-xs font-semibold text-[#111111]">
                {isCompressing ? "사진 압축 중..." : "눈바디 사진 촬영 또는 업로드"}
              </span>
              <p className="text-[11px] text-[#999999] mt-0.5">
                WebP로 자동 압축되어 스토리지 용량을 절약합니다
              </p>
            </div>
          </label>
        )}
      </div>

      {/* Module 3: 🏃 오늘의 운동 */}
      <div className="p-3.5 sm:p-4 bg-white border border-[#E5E5E5] rounded-[8px] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[#FF4D00] shrink-0" />
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              오늘의 운동 (선택)
            </span>
          </div>
          {selectedTags.length > 0 && (
            <span className="text-[11px] font-semibold text-[#FF4D00]">
              {parseInt(workoutMinutes || "0") >= 30 ? "+25P (30분 보너스)" : "+20P"}
            </span>
          )}
        </div>

        {/* Workout Preset Tags */}
        <div className="flex flex-wrap gap-1.5">
          {WORKOUT_PRESETS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-all cursor-pointer border active:scale-95 ${
                  isSelected
                    ? "bg-[#111111] text-white border-[#111111]"
                    : "bg-white text-[#666666] border-[#E5E5E5] hover:border-[#999999]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Workout Duration Chips */}
        {selectedTags.length > 0 && (
          <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-semibold text-[#666666]">운동 시간:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WORKOUT_TIME_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setWorkoutMinutes(String(mins))}
                  className={`px-2 py-0.5 rounded-[4px] text-xs font-semibold cursor-pointer border transition-colors ${
                    workoutMinutes === String(mins)
                      ? "bg-[#FF4D00] text-white border-[#FF4D00]"
                      : "bg-[#FAFAFA] text-[#666666] border-[#E5E5E5] hover:border-[#111111]"
                  }`}
                >
                  {mins}분
                </button>
              ))}
              <div className="flex items-center gap-1 text-xs text-[#666666] ml-1">
                <input
                  type="number"
                  value={workoutMinutes}
                  onChange={(e) => setWorkoutMinutes(e.target.value)}
                  className="w-12 px-1.5 py-0.5 text-center bg-[#FAFAFA] border border-[#E5E5E5] rounded-[4px] text-xs font-bold"
                />
                <span>분</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Module 4: 🥗 한 줄 메모 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#666666] uppercase">
          한 줄 메모 / 친구들에게 남기는 변명 (선택)
        </label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 오늘 야식의 유혹을 참아냄! / 점심에 치팅함"
          className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5E5] rounded-[8px] text-xs text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111]"
        />
      </div>

      {/* Footer Submit */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5E5]">
        <Button type="button" variant="secondary" onClick={onClose} className="text-xs sm:text-sm">
          취소
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!hasAtLeastOne}
          className="gap-2 px-5 text-xs sm:text-sm"
        >
          <Check className="w-4 h-4" />
          {hasAtLeastOne ? `기록 저장 (+${calculatedPoints}P)` : "항목을 1개 이상 입력해주세요"}
        </Button>
      </div>
    </form>
  );
}
