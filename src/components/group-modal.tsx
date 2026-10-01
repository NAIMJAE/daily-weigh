"use client";

import React, { useState } from "react";
import { Copy, Check, Users, Share2, Plus, Sparkles } from "lucide-react";
import { Group } from "@/types";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface GroupModalProps {
  isOpen: boolean;
  mode: "create" | "invite";
  currentGroup: Group | null;
  onClose: () => void;
  onCreateGroup: (name: string, penaltyRule: string) => void;
}

export function GroupModal({
  isOpen,
  mode,
  currentGroup,
  onClose,
  onCreateGroup,
}: GroupModalProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newPenaltyRule, setNewPenaltyRule] = useState("");
  const [copied, setCopied] = useState(false);

  // 초대 링크 URL 생성
  const inviteUrl =
    currentGroup
      ? typeof window !== "undefined"
        ? `${window.location.origin}/invite/${currentGroup.invite_code}`
        : `https://dailyweigh.app/invite/${currentGroup.invite_code}`
      : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName.trim(), newPenaltyRule.trim());
    setNewGroupName("");
    setNewPenaltyRule("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "새 다이어트 그룹 만들기" : "친구 초대 링크 복사"}
      description={
        mode === "create"
          ? "친구들과 함께 체중 변화를 겹쳐보고 자극을 주고받을 폐쇄형 그룹을 생성합니다."
          : currentGroup ? `현재 그룹 '${currentGroup.name}'의 초대 링크입니다.` : "초대 링크를 공유하세요."
      }
      maxWidth="md"
    >
      {mode === "create" ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="그룹 이름"
            placeholder="예: 30일 안에 -5kg 챌린지"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
          />

          <Input
            label="그룹 내기 / 벌칙 룰 (선택)"
            placeholder="예: 매주 일요일 주간 꼴찌가 단톡방에 커피 쏘기"
            value={newPenaltyRule}
            onChange={(e) => setNewPenaltyRule(e.target.value)}
          />

          <div className="p-3 bg-[#F4F4F5] border border-[#E5E5E5] rounded-[8px] text-xs text-[#666666]">
            💡 그룹이 생성되면 친구를 초대할 수 있는 고유 링크가 발급됩니다.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={!newGroupName.trim()}>
              그룹 생성하기
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#666666] uppercase">
              원클릭 초대 링크
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] text-xs font-mono text-[#111111] select-all focus:outline-none"
              />
              <Button
                type="button"
                variant={copied ? "primary" : "secondary"}
                onClick={handleCopy}
                className="gap-1.5 flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    복사완료
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    링크 복사
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="p-3.5 bg-[#FFF9F6] border border-[#FFD8CC] rounded-[8px] text-xs text-[#111111] space-y-1">
            <div className="font-bold flex items-center gap-1 text-[#FF4D00]">
              <Share2 className="w-3.5 h-3.5" />
              카톡 단톡방 공유 가이드
            </div>
            <p className="text-[11px] text-[#666666]">
              친구에게 링크를 전달하면 별도 복잡한 인증 없이 <strong>아이디/닉네임만으로 5초 만에</strong> 그룹에 합류할 수 있습니다.
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#E5E5E5]">
            <Button variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
