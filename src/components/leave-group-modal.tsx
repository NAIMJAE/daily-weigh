"use client";

import React, { useState } from "react";
import { LogOut, AlertCircle, Database, Trash2, Crown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Group, GroupMember } from "@/types";

interface LeaveGroupModalProps {
  isOpen: boolean;
  group: Group | null;
  currentUserMember?: GroupMember;
  memberCount?: number;
  onClose: () => void;
  onConfirm: (groupId: string, keepRecords: boolean) => Promise<boolean>;
}

export function LeaveGroupModal({
  isOpen,
  group,
  currentUserMember,
  memberCount = 1,
  onClose,
  onConfirm,
}: LeaveGroupModalProps) {
  const [keepRecords, setKeepRecords] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !group) return null;

  const isOwner = currentUserMember?.role === "owner";
  const isOnlyMember = memberCount <= 1;

  const handleLeave = async () => {
    setIsSubmitting(true);
    try {
      const success = await onConfirm(group.id, keepRecords);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="그룹 나가기">
      <div className="space-y-4 pt-1">
        {/* 경고 및 그룹 정보 요약 */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-[10px] flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-full text-amber-700 shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-bold text-amber-950">
              <span className="underline decoration-amber-400 font-extrabold">{group.name}</span> 그룹에서 나가시겠습니까?
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              그룹을 나가면 멤버 목록에서 제외되며 언제든 초대 코드로 다시 참여할 수 있습니다.
            </p>
            {isOwner && !isOnlyMember && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100/70 px-2 py-1 rounded mt-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>방장 권한은 다음 멤버에게 자동으로 위임됩니다.</span>
              </div>
            )}
          </div>
        </div>

        {/* 내 기록 처리 방식 선택 */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider">
            내 기록 데이터 처리 방식
          </label>

          {/* 옵션 1: 기록 보존 */}
          <div
            onClick={() => setKeepRecords(true)}
            className={`p-3 rounded-[10px] border transition-all cursor-pointer flex items-start gap-3 ${
              keepRecords
                ? "bg-[#FFF9F6] border-[#FF4D00] shadow-2xs"
                : "bg-white border-[#E5E5E5] hover:border-[#CCCCCC]"
            }`}
          >
            <input
              type="radio"
              name="leave-record-option"
              checked={keepRecords}
              onChange={() => setKeepRecords(true)}
              className="mt-1 text-[#FF4D00] focus:ring-[#FF4D00] accent-[#FF4D00] cursor-pointer"
            />
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#111111]">
                  내 기록 남겨두기
                </span>
                <span className="text-[10px] font-bold text-[#FF4D00] bg-[#FFF1EB] px-1.5 py-0.5 rounded">
                  권장
                </span>
              </div>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                내가 지금까지 기록한 체중과 사진을 보존하여 그룹원들이 과거 내역을 확인할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 옵션 2: 내 기록 삭제 */}
          <div
            onClick={() => setKeepRecords(false)}
            className={`p-3 rounded-[10px] border transition-all cursor-pointer flex items-start gap-3 ${
              !keepRecords
                ? "bg-red-50/50 border-red-500 shadow-2xs"
                : "bg-white border-[#E5E5E5] hover:border-[#CCCCCC]"
            }`}
          >
            <input
              type="radio"
              name="leave-record-option"
              checked={!keepRecords}
              onChange={() => setKeepRecords(false)}
              className="mt-1 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
            />
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  내 기록 모두 영구 삭제
                </span>
              </div>
              <p className="text-[11px] text-[#888888] leading-relaxed">
                내가 이 그룹에 작성한 모든 체중/눈바디 기록이 즉시 영구 삭제됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 하단 버튼 액션 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs py-2 px-3 h-auto"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleLeave}
            disabled={isSubmitting}
            className="text-xs py-2 px-4 h-auto font-bold gap-1.5 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                처리 중...
              </span>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                그룹 나가기
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
