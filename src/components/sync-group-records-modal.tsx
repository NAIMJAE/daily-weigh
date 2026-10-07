"use client";

import React, { useState } from "react";
import { RefreshCw, Check, Layers, ArrowRight, CheckSquare, Square, Info } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Group } from "@/types";

interface SyncGroupRecordsModalProps {
  isOpen: boolean;
  currentGroup: Group | null;
  groups: Group[];
  recordCount: number;
  onClose: () => void;
  onSync: (targetGroupIds: string[]) => Promise<{ success: boolean; syncedCount: number }>;
}

export function SyncGroupRecordsModal({
  isOpen,
  currentGroup,
  groups,
  recordCount,
  onClose,
  onSync,
}: SyncGroupRecordsModalProps) {
  // 현재 그룹을 제외한 다른 참여 그룹 목록
  const otherGroups = groups.filter((g) => g.id !== currentGroup?.id);

  // 기본적으로 다른 모든 그룹을 선택 상태로 설정
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    otherGroups.map((g) => g.id)
  );
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen || !currentGroup) return null;

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSelectAll = () => {
    if (selectedGroupIds.length === otherGroups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(otherGroups.map((g) => g.id));
    }
  };

  const handleExecuteSync = async () => {
    if (selectedGroupIds.length === 0) return;
    setIsSyncing(true);
    try {
      const result = await onSync(selectedGroupIds);
      if (result.success) {
        onClose();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="내 기록 일괄 동기화"
      description="현재 그룹의 내 체중/눈바디 기록을 선택한 다른 그룹들로 복사하여 동기화합니다."
    >
      <div className="space-y-4 pt-1">
        {/* 소스 그룹 및 대상 정보 배너 */}
        <div className="p-3 bg-[#FFF9F6] border border-[#FFD8CC] rounded-[10px] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF4D00]">
            <Layers className="w-4 h-4 shrink-0" />
            <span>기록 원본 그룹: {currentGroup.name} ({recordCount}개 기록)</span>
          </div>
          <p className="text-[11px] text-[#666666] leading-relaxed">
            이 그룹에 작성된 내 모든 체중, 사진, 운동 기록을 선택한 그룹들에 동일하게 복사하여 각 그룹의 출석과 랭킹에 반영합니다.
          </p>
        </div>

        {/* 대상 그룹 선택 리스트 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              동기화 대상 그룹 선택 ({selectedGroupIds.length}/{otherGroups.length})
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-[#FF4D00] hover:underline font-semibold cursor-pointer"
            >
              {selectedGroupIds.length === otherGroups.length ? "전체 해제" : "전체 선택"}
            </button>
          </div>

          {otherGroups.length === 0 ? (
            <div className="p-4 text-center bg-[#FAFAFA] border border-dashed border-[#E5E5E5] rounded-[8px] text-xs text-[#999999]">
              동기화할 다른 그룹이 없습니다. 먼저 다른 그룹에 참여해주세요.
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
              {otherGroups.map((g) => {
                const isChecked = selectedGroupIds.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`p-2.5 rounded-[8px] border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isChecked
                        ? "bg-[#FFF9F6] border-[#FF4D00]"
                        : "bg-white border-[#E5E5E5] hover:border-[#CCCCCC]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] ${
                          isChecked ? "bg-[#FF4D00]" : "border border-[#CCCCCC]"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#111111] truncate">{g.name}</div>
                        <div className="text-[11px] text-[#999999] font-mono">
                          코드: {g.invite_code}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] text-[#FF4D00] font-semibold shrink-0">
                      {isChecked ? "동기화 대상" : "제외"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 덮어쓰기 안내 알림 */}
        <div className="flex items-start gap-2 p-2.5 bg-[#F9F9FA] border border-[#E5E5E5] rounded-[8px] text-[11px] text-[#666666]">
          <Info className="w-3.5 h-3.5 text-[#999999] shrink-0 mt-0.5" />
          <span>
            대상 그룹에 같은 날짜의 기록이 이미 있는 경우 최신 정보로 안전하게 갱신(덮어쓰기)됩니다.
          </span>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSyncing}
            className="text-xs py-2 px-3 h-auto"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleExecuteSync}
            disabled={isSyncing || selectedGroupIds.length === 0}
            className="text-xs py-2 px-4 h-auto font-bold gap-1.5"
          >
            {isSyncing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                기록 동기화 중...
              </span>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                선택한 그룹으로 동기화
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
