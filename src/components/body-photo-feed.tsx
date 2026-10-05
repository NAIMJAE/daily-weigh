"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Camera,
  Heart,
  Flame,
  Dumbbell,
  Layers,
  Plus,
  Send,
  MessageCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import { DailyRecord, GroupMember, PokeMessage, UserProfile } from "@/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface BodyPhotoFeedProps {
  records: DailyRecord[];
  members: GroupMember[];
  currentUser: UserProfile;
  pokes?: PokeMessage[];
  onOpenLogger: () => void;
  onSendPoke: (targetUserId: string, message: string, recordId?: string) => Promise<boolean>;
  onDeletePoke?: (pokeId: string) => Promise<boolean>;
}

// Poke 메시지에서 [post:UUID] 태그를 분리 파싱
function parsePokeComment(p: PokeMessage): {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  record_id: string | null;
  created_at: string;
} {
  const rawMsg = p.message || "";
  const match = rawMsg.match(/^\[post:([a-zA-Z0-9_-]+)\]\s*([\s\S]*)$/);
  if (match) {
    return {
      id: p.id,
      sender_id: p.sender_id,
      sender_name: p.sender_profile?.nickname || "친구",
      message: match[2],
      record_id: match[1],
      created_at: p.created_at,
    };
  }
  return {
    id: p.id,
    sender_id: p.sender_id,
    sender_name: p.sender_profile?.nickname || "친구",
    message: rawMsg,
    record_id: p.record_id || null,
    created_at: p.created_at,
  };
}

const QUICK_SPICY_COMMENTS = [
  "🔥 오늘 변화 미쳤다 인정!",
  "💪 자극 제대로 받고 갑니다!",
  "🍗 손에 든 야식 내려놔라",
  "⚡ 체중계 안 부서진다 당장 올라가!",
  "☕ 이번 주 커피는 네가 사라",
];

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "방금 전";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      month: "numeric",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function BodyPhotoFeed({
  records,
  members,
  currentUser,
  pokes = [],
  onOpenLogger,
  onSendPoke,
  onDeletePoke,
}: BodyPhotoFeedProps) {
  // 눈바디 사진이 등록된 기록만 필터링 (최신 날짜순)
  const photoPosts = records
    .filter((r) => Boolean(r.photo_url))
    .sort((a, b) => {
      if (b.record_date !== a.record_date) {
        return b.record_date.localeCompare(a.record_date);
      }
      return (b.created_at || "").localeCompare(a.created_at || "");
    });

  // 로컬 인터랙션 상태 (리액션 이모지 & 좋아요 & 댓글 입력 & 로컬 추가 댓글)
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [userLiked, setUserLiked] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isSending, setIsSending] = useState<Record<string, boolean>>({});
  const [doubleTapHeart, setDoubleTapHeart] = useState<Record<string, boolean>>({});

  // 실시간으로 작성된 댓글을 즉시 피드에 반영하기 위한 로컬 상태
  const [localComments, setLocalComments] = useState<
    Record<
      string,
      {
        id: string;
        sender_id: string;
        sender_name: string;
        message: string;
        created_at: string;
      }[]
    >
  >({});

  const toggleLike = (recordId: string) => {
    setUserLiked((prev) => {
      const isCurrentlyLiked = Boolean(prev[recordId]);
      return { ...prev, [recordId]: !isCurrentlyLiked };
    });
  };

  const handleDoubleTap = (recordId: string) => {
    setUserLiked((prev) => ({ ...prev, [recordId]: true }));
    setDoubleTapHeart((prev) => ({ ...prev, [recordId]: true }));
    setTimeout(() => {
      setDoubleTapHeart((prev) => ({ ...prev, [recordId]: false }));
    }, 900);
  };

  const addReaction = (recordId: string, emoji: string) => {
    setReactions((prev) => {
      const postReactions = prev[recordId] || {};
      const currentCount = postReactions[emoji] || 0;
      return {
        ...prev,
        [recordId]: {
          ...postReactions,
          [emoji]: currentCount + 1,
        },
      };
    });
  };

  const handleCommentSubmit = async (postId: string, targetUserId: string) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text || isSending[postId]) return;

    setIsSending((prev) => ({ ...prev, [postId]: true }));

    try {
      // 해당 피드 게시글(postId)을 전달하여 해당 글에만 격리 귀속
      const success = await onSendPoke(targetUserId, text, postId);
      if (success) {
        // 즉시 로컬 댓글 목록에 추가
        setLocalComments((prev) => {
          const list = prev[postId] || [];
          return {
            ...prev,
            [postId]: [
              {
                id: `local-${Date.now()}`,
                sender_id: currentUser.id,
                sender_name: currentUser.nickname,
                message: text,
                created_at: new Date().toISOString(),
              },
              ...list,
            ],
          };
        });

        // 입력창 비우기 및 댓글창 자동 열기
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      }
    } finally {
      setIsSending((prev) => ({ ...prev, [postId]: false }));
    }
  };

  if (photoPosts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-8 text-center bg-white border border-[#E5E5E5] rounded-[12px] space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-[#FFF1EB] border border-[#FFD8CC] flex items-center justify-center mx-auto">
            <Camera className="w-7 h-7 text-[#FF4D00]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-[#111111]">
              아직 등록된 눈바디 피드가 없습니다
            </h3>
            <p className="text-xs text-[#666666] max-w-xs mx-auto leading-relaxed">
              오늘의 체형 변화를 사진으로 기록하고 그룹 친구들과 첫 번째 눈바디를 공유해보세요!
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={onOpenLogger}
            className="gap-2 px-5 text-xs mx-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            첫 눈바디 사진 올리기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Feed Stream */}
      <div className="space-y-4">
        {photoPosts.map((post) => {
          const authorMember = members.find((m) => m.user_id === post.user_id);
          const authorProfile = authorMember?.profile;
          const isMe = post.user_id === currentUser.id;
          const isLiked = Boolean(userLiked[post.id]);
          const postReactions = reactions[post.id] || {};

          // 시작 체중 대비 변화량
          const startWeight = authorProfile?.start_weight;
          const weightDiff =
            post.weight && startWeight
              ? (post.weight - startWeight).toFixed(1)
              : null;

          // 이 게시글(post.id)에 전용으로 달린 댓글들만 정확히 필터링 (다른 피드와 댓글 격리)
          const dbComments = pokes
            .map(parsePokeComment)
            .filter((c) => c.record_id === post.id);

          const postLocal = localComments[post.id] || [];
          const allComments = [...postLocal, ...dbComments];
          const isCommentsOpen = expandedComments[post.id] ?? false;
          const displayedComments = isCommentsOpen
            ? allComments
            : allComments.slice(0, 2);

          return (
            <article
              key={post.id}
              className="bg-white border border-[#E5E5E5] rounded-[12px] overflow-hidden shadow-2xs transition-all"
            >
              {/* 1. Post Header (프로필 & 날짜 & 체중) */}
              <div className="flex items-center justify-between p-3 border-b border-[#E5E5E5]/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {(authorProfile?.nickname || "멤").slice(0, 1)}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#111111] truncate max-w-[120px]">
                        {authorProfile?.nickname || "멤버"}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-[#FF4D00] font-bold bg-[#FFF1EB] border border-[#FFD8CC] px-1 py-0.2 rounded">
                          나
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#999999] font-mono">
                      {formatDate(post.record_date)}
                    </p>
                  </div>
                </div>

                {/* 체중 뱃지 */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {post.weight ? (
                    <span className="px-2 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] text-xs font-mono font-bold text-[#111111]">
                      ⚖️ {post.weight}kg
                      {weightDiff && (
                        <span
                          className={`ml-1 text-[11px] font-semibold ${
                            parseFloat(weightDiff) <= 0
                              ? "text-[#FF4D00]"
                              : "text-blue-500"
                          }`}
                        >
                          ({parseFloat(weightDiff) > 0 ? "+" : ""}
                          {weightDiff}kg)
                        </span>
                      )}
                    </span>
                  ) : (
                    <Badge variant="accent" className="text-[11px]">
                      📸 눈바디 인증
                    </Badge>
                  )}
                </div>
              </div>

              {/* 2. Post Image (인스타그램 카드 스타일) */}
              <div
                onDoubleClick={() => handleDoubleTap(post.id)}
                className="relative w-full aspect-[3/4] max-h-[460px] bg-[#18181B] flex items-center justify-center select-none cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.photo_url!}
                  alt={`${authorProfile?.nickname || "멤버"}의 눈바디`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />

                {/* Double Tap Pop-up Heart */}
                {doubleTapHeart[post.id] && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Heart className="w-20 h-20 fill-[#FF4D00] text-[#FF4D00] drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] animate-bounce" />
                  </div>
                )}

                {/* Top Corner Heart Badge */}
                {isLiked && !doubleTapHeart[post.id] && (
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <span className="p-1.5 bg-black/60 backdrop-blur-xs rounded-full inline-flex text-[#FF4D00]">
                      <Heart className="w-4 h-4 fill-current" />
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Action Bar (응원 리액션 & 좋아요 & 댓글 토글) */}
              <div className="p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  {/* Reaction Emoticons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className={`px-2 py-1 rounded-[6px] text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer active:scale-90 ${
                        isLiked
                          ? "bg-red-50 border-red-200 text-red-600"
                          : "bg-[#FAFAFA] border-[#E5E5E5] text-[#666666] hover:text-[#111111]"
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLiked ? "fill-current text-red-500" : ""
                        }`}
                      />
                      <span>{isLiked ? "좋아요 1" : "좋아요"}</span>
                    </button>

                    {(
                      [
                        { emoji: "🔥", key: "fire" },
                        { emoji: "💪", key: "muscle" },
                        { emoji: "👏", key: "clap" },
                      ] as const
                    ).map(({ emoji, key }) => {
                      const count = postReactions[key] || 0;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => addReaction(post.id, key)}
                          className="px-2 py-1 bg-[#FAFAFA] hover:bg-[#F4F4F5] border border-[#E5E5E5] rounded-[6px] text-xs transition-transform cursor-pointer active:scale-90 flex items-center gap-1"
                        >
                          <span>{emoji}</span>
                          {count > 0 && (
                            <span className="font-bold text-[#111111] text-[11px]">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 댓글 토글 버튼 */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedComments((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className="flex items-center gap-1 text-xs text-[#666666] hover:text-[#111111] cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#FF4D00]" />
                    <span>자극 댓글 ({allComments.length})</span>
                  </button>
                </div>

                {/* 4. 운동 태그 & 한 줄 캡션/메모 */}
                {(post.workout_tags || post.memo) && (
                  <div className="space-y-1 text-xs pt-1 border-t border-[#E5E5E5]/60">
                    {/* 운동 태그 */}
                    {post.workout_tags && post.workout_tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-[#666666] flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 text-[#FF4D00]" />
                          오늘의 운동:
                        </span>
                        {post.workout_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-[#F4F4F5] border border-[#E5E5E5] rounded-[4px] text-[11px] font-medium text-[#111111]"
                          >
                            {tag}
                            {post.workout_minutes ? ` (${post.workout_minutes}분)` : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 메모 / 캡션 */}
                    {post.memo && (
                      <p className="text-[#111111] leading-relaxed pt-0.5">
                        <strong className="mr-1 text-[#111111]">
                          {authorProfile?.nickname}
                        </strong>
                        <span className="text-[#444444]">"{post.memo}"</span>
                      </p>
                    )}
                  </div>
                )}

                {/* 5. 인스타그램 스타일 댓글(자극 메시지) 목록 */}
                {allComments.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-[#E5E5E5]/60">
                    {displayedComments.map((comment) => {
                      const isMyComment = comment.sender_id === currentUser.id;
                      return (
                        <div
                          key={comment.id}
                          className="flex items-start justify-between text-xs gap-2 py-0.5"
                        >
                          <div className="min-w-0 leading-snug">
                            <span className="font-bold text-[#111111] mr-1.5">
                              {comment.sender_name}
                              {isMyComment && (
                                <span className="ml-1 text-[10px] text-[#FF4D00] font-normal">
                                  (나)
                                </span>
                              )}
                            </span>
                            <span className="text-[#333333]">"{comment.message}"</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-[#999999] font-mono mt-0.5">
                              {formatRelativeTime(comment.created_at)}
                            </span>
                            {isMyComment && onDeletePoke && !comment.id.startsWith("local-") && (
                              <button
                                type="button"
                                onClick={() => onDeletePoke(comment.id)}
                                className="text-[10px] text-[#999999] hover:text-red-500 cursor-pointer ml-0.5"
                                title="댓글 삭제"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {allComments.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className="text-[11px] text-[#999999] hover:text-[#111111] font-semibold cursor-pointer pt-0.5 block"
                      >
                        {isCommentsOpen
                          ? "댓글 접기"
                          : `댓글 ${allComments.length}개 모두 보기...`}
                      </button>
                    )}
                  </div>
                )}

                {/* 6. 인스타그램 스타일 인라인 자극/댓글 작성 바 */}
                <div className="pt-2 border-t border-[#E5E5E5]/60 space-y-1.5">
                  {/* 퀵 자극 멘트 칩 */}
                  <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                    {QUICK_SPICY_COMMENTS.map((quickMsg) => (
                      <button
                        key={quickMsg}
                        type="button"
                        onClick={() => {
                          setCommentInputs((prev) => ({
                            ...prev,
                            [post.id]: quickMsg,
                          }));
                        }}
                        className="px-2 py-0.5 bg-[#FFF9F6] border border-[#FFD8CC] hover:bg-[#FFF1EB] rounded-[4px] text-[11px] font-medium text-[#FF4D00] whitespace-nowrap shrink-0 cursor-pointer active:scale-95 transition-colors"
                      >
                        {quickMsg}
                      </button>
                    ))}
                  </div>

                  {/* 댓글 인풋 & 게시 버튼 */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit(post.id, post.user_id);
                        }
                      }}
                      placeholder={`@${authorProfile?.nickname || "멤버"}에게 자극 한마디 또는 응원 댓글...`}
                      className="flex-1 px-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] focus:border-[#111111] rounded-[6px] text-xs text-[#111111] focus:outline-none placeholder:text-[#999999]"
                    />
                    <button
                      type="button"
                      onClick={() => handleCommentSubmit(post.id, post.user_id)}
                      disabled={
                        !commentInputs[post.id]?.trim() || isSending[post.id]
                      }
                      className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                        commentInputs[post.id]?.trim()
                          ? "bg-[#FF4D00] text-white shadow-2xs hover:bg-[#E64500] active:scale-95"
                          : "bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed"
                      }`}
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSending[post.id] ? "등록 중" : "게시"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* 7. Floating Action Button (우측 하단 고정: 겹쳐보기 페이지로 이동) */}
      <div className="sticky bottom-20 flex justify-end pointer-events-none z-30 pr-1 pb-1">
        <Link
          href="/overlay/compare"
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#111111] hover:bg-[#FF4D00] text-white shadow-[0_6px_20px_rgba(0,0,0,0.3)] active:scale-95 transition-all cursor-pointer border-2 border-white group"
        >
          <Layers className="w-4 h-4 text-[#FF4D00] group-hover:text-white transition-colors" />
          <span className="text-xs font-extrabold tracking-tight">
            1:1 겹쳐보기
          </span>
        </Link>
      </div>
    </div>
  );
}
