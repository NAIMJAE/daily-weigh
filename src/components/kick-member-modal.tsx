"use client";

import React, { useState } from "react";
import { ShieldAlert, UserX, Check, AlertCircle, Database, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { GroupMember } from "@/types";

interface KickMemberModalProps {
  isOpen: boolean;
  targetMember: GroupMember | null;
  onClose: () => void;
  onConfirm: (targetUserId: string, keepRecords: boolean) => Promise<boolean>;
}

export function KickMemberModal({
  isOpen,
  targetMember,
  onClose,
  onConfirm,
}: KickMemberModalProps) {
  const [keepRecords, setKeepRecords] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !targetMember) return null;

  const memberName = targetMember.profile?.nickname || "그룹원";

  const handleKick = async () => {
    setIsSubmitting(true);
    try {
      const success = await onConfirm(targetMember.user_id, keepRecords);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="그룹 멤버 강퇴">
      <div className="space-y-4 pt-1">
        {/* 경고 및 멤버 정보 요약 */}
        <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-[10px] flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-bold text-red-900">
              정말로 <span className="underline decoration-red-400 font-extrabold">{memberName}</span> 님을 강퇴하시겠습니까?
            </h4>
            <p className="text-xs text-red-700 leading-relaxed">
              강퇴된 멤버는 이 그룹의 활동 목록에서 즉시 제외되며, 다시 초대받기 전까지 접근할 수 없습니다.
            </p>
          </div>
        </div>

        {/* 데이터 처리 방식 선택 */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider">
            기록 데이터 처리 방식 선택
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
              name="kick-record-option"
              checked={keepRecords}
              onChange={() => setKeepRecords(true)}
              className="mt-1 text-[#FF4D00] focus:ring-[#FF4D00] accent-[#FF4D00] cursor-pointer"
            />
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#111111]">
                  기록 보존하기
                </span>
                <span className="text-[10px] font-bold text-[#FF4D00] bg-[#FFF1EB] px-1.5 py-0.5 rounded">
                  권장
                </span>
              </div>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                해당 유저가 지금까지 올린 체중 기록과 사진을 그룹에 보존합니다. (과거 통계 및 차트 유지)
              </p>
            </div>
          </div>

          {/* 옵션 2: 모든 기록 삭제 */}
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
              name="kick-record-option"
              checked={!keepRecords}
              onChange={() => setKeepRecords(false)}
              className="mt-1 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
            />
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  모든 기록 영구 삭제
                </span>
              </div>
              <p className="text-[11px] text-[#888888] leading-relaxed">
                이 그룹에 등록된 해당 유저의 모든 체중/사진 데이터가 영구 삭제되며 복구할 수 없습니다.
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
            onClick={handleKick}
            disabled={isSubmitting}
            className="text-xs py-2 px-4 h-auto font-bold gap-1.5 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                강퇴 처리 중...
              </span>
            ) : (
              <>
                <UserX className="w-3.5 h-3.5" />
                강퇴하기
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
