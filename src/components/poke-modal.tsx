"use client";

import React, { useState } from "react";
import { Send, Zap, MessageSquare } from "lucide-react";
import { GroupMember } from "@/types";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";

interface PokeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMember: GroupMember | null;
  onSendPoke: (targetUserId: string, message: string) => void;
}

const SPICY_PRESETS = [
  "체중계 안 부서진다. 당장 올라가라!",
  "오늘 건너뛰면 내일 아침 2kg 불어있다.",
  "너 지금 손에 치킨/야식 들려있는 거 다 안다.",
  "운동도 안 하고 눈바디도 안 찍고 뭐하냐?",
  "주간 꼴찌 유력 후보 축하한다! 커피 잘 마실게 ☕",
  "작심삼일 탈출하기로 약속했잖아, 1개라도 올려!",
];

export function PokeModal({
  isOpen,
  onClose,
  targetMember,
  onSendPoke,
}: PokeModalProps) {
  const [selectedMessage, setSelectedMessage] = useState(SPICY_PRESETS[0]);
  const [customMessage, setCustomMessage] = useState("");

  if (!targetMember) return null;

  const handleSend = () => {
    const finalMsg = customMessage.trim() || selectedMessage;
    onSendPoke(targetMember.user_id, finalMsg);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🌶️ '${targetMember.profile?.nickname}' 콕 찌르기`}
      description="오늘 아무것도 기록하지 않은 친구에게 매콤한 독설과 자극을 전송합니다."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Target Member Info */}
        <div className="flex items-center gap-2.5 p-2.5 bg-[#FFF9F6] border border-[#FFD8CC] rounded-[8px]">
          <div className="w-9 h-9 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-[#E5E5E5]">
            {targetMember.profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={targetMember.profile.avatar_url}
                alt={targetMember.profile.nickname || "멤버"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(targetMember.profile?.nickname || "멤").slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0 text-left">
            <div className="text-xs font-bold text-[#111111] truncate">
              {targetMember.profile?.nickname || "멤버"}
            </div>
            <p className="text-[11px] text-[#FF4D00] font-medium">
              ⚠️ 오늘 아직 아무 기록도 남기지 않았습니다.
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#666666] uppercase">
            추천 매콤 독설 멘트
          </label>
          <div className="space-y-1.5">
            {SPICY_PRESETS.map((msg) => (
              <button
                key={msg}
                type="button"
                onClick={() => {
                  setSelectedMessage(msg);
                  setCustomMessage("");
                }}
                className={`w-full text-left p-2.5 rounded-[6px] text-xs transition-colors cursor-pointer border ${
                  selectedMessage === msg && !customMessage
                    ? "bg-[#FFF1EB] border-[#FF4D00] text-[#111111] font-semibold"
                    : "bg-white border-[#E5E5E5] text-[#666666] hover:border-[#999999]"
                }`}
              >
                "{msg}"
              </button>
            ))}
          </div>
        </div>

        {/* Custom Message Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#666666] uppercase">
            직접 매콤한 한마디 입력하기
          </label>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="직접 자극적인 멘트를 작성해보세요"
            className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-[8px] text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSend} className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            독설 발송하기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
