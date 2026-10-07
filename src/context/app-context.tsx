"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import {
  getSessionUser,
  fetchProfile,
  fetchUserGroups,
  fetchGroupMembers,
  fetchGroupRecords,
  fetchGroupPokes,
  upsertDailyRecord,
  updateMemberStats,
  sendPoke,
  deletePoke,
  createGroup,
  addOwnerToGroup,
  joinGroup,
  uploadBodyPhoto,
  uploadAvatarPhoto,
  updateProfile,
  kickMemberFromGroup,
  leaveGroupMember,
  syncUserRecordsToTargetGroups,
} from "@/lib/supabase/api";
import { DailyRecord, Group, GroupMember, PokeMessage, UserProfile } from "@/types";
import { getTodayDateString, calculateWeeklyPoints, calculateStreakDays } from "@/lib/utils";

import { ToastContainer, ToastItem } from "@/components/ui/toast-container";

const ACTIVE_GROUP_KEY = "daily_weigh_active_group_id";

interface AppContextType {
  user: UserProfile | null;
  groups: Group[];
  currentGroup: Group | null;
  members: GroupMember[];
  records: DailyRecord[];
  pokes: PokeMessage[];
  loading: boolean;
  mounted: boolean;
  isConfigured: boolean;
  userMemberInfo?: GroupMember;
  myTodayRecord?: DailyRecord;
  myPhotoRecords: DailyRecord[];
  autoSyncGroupIds: string[];
  updateAutoSyncGroupIds: (groupIds: string[]) => void;
  syncRecordsToSelectedGroups: (targetGroupIds: string[]) => Promise<{ success: boolean; syncedCount: number }>;
  loggerOpen: boolean;
  setLoggerOpen: (open: boolean) => void;
  toastMsg: string | null;
  showToast: (
    msg: string,
    type?: "info" | "success" | "error" | "warning",
    code?: string
  ) => void;
  selectGroup: (group: Group) => Promise<void>;
  saveDailyRecord: (recordData: Partial<DailyRecord>) => Promise<boolean>;
  sendPokeMessage: (targetUserId: string, message: string, recordId?: string) => Promise<boolean>;
  deletePokeMessage: (pokeId: string) => Promise<boolean>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  uploadAvatar: (file: File | Blob) => Promise<string | null>;
  createNewGroup: (name: string, penaltyRule: string) => Promise<Group | null>;
  joinExistingGroup: (group: Group) => Promise<boolean>;
  kickMember: (targetUserId: string, keepRecords: boolean) => Promise<boolean>;
  leaveGroup: (groupId: string, keepRecords: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshGroupData: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [pokes, setPokes] = useState<PokeMessage[]>([]);
  const [autoSyncGroupIds, setAutoSyncGroupIdsState] = useState<string[]>([]);
  const [loggerOpen, setLoggerOpenState] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 유저별 자동 동기화 그룹 설정 불러오기
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`daily_weigh_auto_sync_${user.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAutoSyncGroupIdsState(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load auto sync preferences:", e);
      }
    }
  }, [user]);

  const updateAutoSyncGroupIds = useCallback(
    (groupIds: string[]) => {
      setAutoSyncGroupIdsState(groupIds);
      if (user && typeof window !== "undefined") {
        try {
          localStorage.setItem(`daily_weigh_auto_sync_${user.id}`, JSON.stringify(groupIds));
        } catch (e) {
          console.error("Failed to save auto sync preferences:", e);
        }
      }
    },
    [user]
  );

  const setLoggerOpen = useCallback((open: boolean) => {
    setLoggerOpenState(open);
    if (typeof window !== "undefined") {
      if (open) {
        sessionStorage.setItem("daily_logger_open", "true");
      } else {
        sessionStorage.removeItem("daily_logger_open");
        sessionStorage.removeItem("daily_logger_draft");
      }
    }
  }, []);

  // 모바일 브라우저 백그라운드 리로드 시 작성 중이던 모달 자동 복원
  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasOpen = sessionStorage.getItem("daily_logger_open");
      const hasDraft = sessionStorage.getItem("daily_logger_draft");
      if (wasOpen === "true" || hasDraft) {
        setLoggerOpenState(true);
      }
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      msg: string,
      type?: "info" | "success" | "error" | "warning",
      code?: string
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // type 자동 판별 (지정되지 않은 경우)
      let detectedType: "info" | "success" | "error" | "warning" = type ?? "info";
      if (!type) {
        if (/에러|오류|실패|error|exception|fail/i.test(msg) || msg.includes("⚠️") || msg.includes("🚨")) {
          detectedType = "error";
        } else if (/완료|성공|축하|환영|✨|🎉/i.test(msg)) {
          detectedType = "success";
        }
      }

      const newToast: ToastItem = {
        id,
        message: msg,
        type: detectedType,
        code,
      };

      setToasts((prev) => [...prev.slice(-3), newToast]); // 최대 4개 표시

      const duration = detectedType === "error" ? 8000 : 4000;
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    },
    [dismissToast]
  );

  const toastMsg = toasts.length > 0 ? toasts[toasts.length - 1].message : null;

  const loadGroupData = useCallback(async (group: Group) => {
    try {
      const [fetchedMembers, fetchedRecords, fetchedPokes] = await Promise.all([
        fetchGroupMembers(group.id),
        fetchGroupRecords(group.id),
        fetchGroupPokes(group.id),
      ]);
      setMembers(fetchedMembers);
      setRecords(fetchedRecords);
      setPokes(fetchedPokes);
    } catch (err) {
      console.error("loadGroupData error:", err);
    }
  }, []);

  // 최초 로드 여부 / 현재 로그인 유저 ID 추적 (탭 복귀 시 불필요한 재초기화 방지)
  const initializedRef = React.useRef(false);
  const currentUserIdRef = React.useRef<string | null>(null);

  const init = useCallback(async () => {
    // 최초 1회만 전체 로딩 화면 표시. 이후 재초기화는 화면을 언마운트하지 않고 조용히 갱신
    if (!initializedRef.current) {
      setLoading(true);
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      setMounted(true);
      return;
    }

    try {
      const authUser = await getSessionUser();
      if (!authUser) {
        setUser(null);
        setGroups([]);
        setCurrentGroup(null);
        setMembers([]);
        setRecords([]);
        setPokes([]);
        setLoading(false);
        setMounted(true);
        return;
      }

      const profile = await fetchProfile(authUser.id);
      if (!profile) {
        setUser(null);
        setLoading(false);
        setMounted(true);
        return;
      }
      setUser(profile);
      currentUserIdRef.current = profile.id;

      const userGroups = await fetchUserGroups(authUser.id);
      setGroups(userGroups);

      if (userGroups.length > 0) {
        let savedGroupId: string | null = null;
        if (typeof window !== "undefined") {
          savedGroupId = localStorage.getItem(ACTIVE_GROUP_KEY);
        }

        // 1순위: localStorage에 저장된 유효한 그룹
        // 2순위: 사용자 그룹 목록의 첫 번째 그룹
        const matchedGroup = savedGroupId
          ? userGroups.find((g) => g.id === savedGroupId)
          : null;
        const targetGroup = matchedGroup || userGroups[0];

        if (typeof window !== "undefined" && targetGroup) {
          localStorage.setItem(ACTIVE_GROUP_KEY, targetGroup.id);
        }

        setCurrentGroup(targetGroup);
        // 그룹 전환 시 데이터 격리
        setMembers([]);
        setRecords([]);
        setPokes([]);
        await loadGroupData(targetGroup);
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem(ACTIVE_GROUP_KEY);
        }
        setCurrentGroup(null);
        setMembers([]);
        setRecords([]);
        setPokes([]);
      }
    } catch (err) {
      console.error("Init context error:", err);
    } finally {
      initializedRef.current = true;
      setLoading(false);
      setMounted(true);
    }
  }, [loadGroupData]);

  useEffect(() => {
    init();

    // Supabase auth state change subscription
    const supabase = createClient();
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        // 토큰 갱신은 데이터 변화가 없으므로 무시
        if (event === "TOKEN_REFRESHED") return;
        // 탭 복귀(카메라 앱 복귀 등) 시 같은 유저로 SIGNED_IN이 재발행되는 경우 무시
        if (
          event === "SIGNED_IN" &&
          session?.user?.id &&
          session.user.id === currentUserIdRef.current
        ) {
          return;
        }
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          await init();
        } else if (event === "SIGNED_OUT") {
          currentUserIdRef.current = null;
          setUser(null);
          setGroups([]);
          setCurrentGroup(null);
          setMembers([]);
          setRecords([]);
          setPokes([]);
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [init]);

  const selectGroup = useCallback(
    async (group: Group) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_GROUP_KEY, group.id);
      }
      setCurrentGroup(group);
      setMembers([]);
      setRecords([]);
      setPokes([]);
      await loadGroupData(group);
    },
    [loadGroupData]
  );

  const refreshGroupData = useCallback(async () => {
    if (currentGroup) {
      await loadGroupData(currentGroup);
    }
  }, [currentGroup, loadGroupData]);

  const logout = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_GROUP_KEY);
    }
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setGroups([]);
    setCurrentGroup(null);
    setMembers([]);
    setRecords([]);
    setPokes([]);
    router.replace("/auth/login");
  }, [router]);

  const todayStr = getTodayDateString();
  const myTodayRecord = records.find(
    (r) => r.user_id === user?.id && r.record_date === todayStr
  );
  const rawMemberInfo = members.find((m) => m.user_id === user?.id);
  const userMemberInfo = useMemo(() => {
    if (!rawMemberInfo || !user) return undefined;
    const computedPoints = calculateWeeklyPoints(records, user.id);
    const computedStreak = calculateStreakDays(records, user.id);
    return {
      ...rawMemberInfo,
      weekly_points: Math.max(rawMemberInfo.weekly_points ?? 0, computedPoints),
      streak_days: Math.max(rawMemberInfo.streak_days ?? 0, computedStreak),
    };
  }, [rawMemberInfo, user, records]);
  const myPhotoRecords = records.filter(
    (r) => r.user_id === user?.id && Boolean(r.photo_url)
  );

  const saveDailyRecord = useCallback(
    async (recordData: Partial<DailyRecord>) => {
      if (!user || !currentGroup) return false;
      const isNew = !myTodayRecord;

      let finalPhotoUrl = recordData.photo_url !== undefined ? recordData.photo_url : (myTodayRecord?.photo_url ?? null);

      // Blob URL 또는 DataURL이 전달된 경우 Supabase Storage에 업로드하여 정식 CDN URL로 변환
      if (finalPhotoUrl && finalPhotoUrl.startsWith("blob:")) {
        try {
          const res = await fetch(finalPhotoUrl);
          const photoBlob = await res.blob();
          const mimeType = photoBlob.type || "image/jpeg";
          const uploadResult = await uploadBodyPhoto(user.id, photoBlob, mimeType);
          if (uploadResult.url) {
            finalPhotoUrl = uploadResult.url;
          }
        } catch (blobErr) {
          console.error("Blob upload error:", blobErr);
        }
      } else if (finalPhotoUrl && finalPhotoUrl.startsWith("data:image")) {
        try {
          const arr = finalPhotoUrl.split(",");
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const photoBlob = new Blob([u8arr], { type: mimeType });

          const uploadResult = await uploadBodyPhoto(user.id, photoBlob, mimeType);
          if (uploadResult.url) {
            finalPhotoUrl = uploadResult.url;
          } else if (uploadResult.error) {
            console.error("Storage upload failed:", uploadResult.error);
          }
        } catch (uploadErr: any) {
          console.error("Storage upload exception:", uploadErr);
        }
      }

      const payload = {
        user_id: user.id,
        group_id: currentGroup.id,
        record_date: todayStr,
        weight: recordData.weight !== undefined ? recordData.weight : (myTodayRecord?.weight ?? null),
        photo_url: finalPhotoUrl,
        workout_tags: recordData.workout_tags !== undefined ? recordData.workout_tags : (myTodayRecord?.workout_tags ?? null),
        workout_minutes: recordData.workout_minutes !== undefined ? recordData.workout_minutes : (myTodayRecord?.workout_minutes ?? null),
        memo: recordData.memo !== undefined ? recordData.memo : (myTodayRecord?.memo ?? null),
        points_earned: recordData.points_earned ?? 20,
      };

      const { data: saved, error: dbError } = await upsertDailyRecord(payload);
      if (saved) {
        const updatedRecord = { ...saved, profile: user };
        setRecords((prev) =>
          isNew
            ? [...prev, updatedRecord]
            : prev.map((r) => (r.id === saved.id ? updatedRecord : r))
        );

        // 첫 기록이거나 수정 시 포인트 차액 계산하여 실시간 반영
        const prevPoints = myTodayRecord?.points_earned ?? 0;
        const deltaPoints = isNew ? payload.points_earned : payload.points_earned - prevPoints;
        const deltaStreak = isNew ? 1 : 0;

        if (deltaStreak !== 0 || deltaPoints !== 0) {
          await updateMemberStats(user.id, currentGroup.id, {
            streak_days: deltaStreak,
            weekly_points: deltaPoints,
          });
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === user.id
                ? {
                    ...m,
                    streak_days: m.streak_days + deltaStreak,
                    weekly_points: Math.max(0, m.weekly_points + deltaPoints),
                  }
                : m
            )
          );
        }

        // 다중 그룹 자동 동기화 처리 (autoSyncGroupIds에 포함된 다른 그룹들에도 저장)
        const otherSyncGroups = autoSyncGroupIds.filter((gid) => gid !== currentGroup.id);
        if (otherSyncGroups.length > 0) {
          try {
            for (const targetGid of otherSyncGroups) {
              await upsertDailyRecord({
                ...payload,
                group_id: targetGid,
              });
              if (deltaStreak !== 0 || deltaPoints !== 0) {
                await updateMemberStats(user.id, targetGid, {
                  streak_days: deltaStreak,
                  weekly_points: deltaPoints,
                });
              }
            }
          } catch (syncErr) {
            console.error("Auto sync to other groups failed:", syncErr);
          }
        }

        const syncMsg =
          otherSyncGroups.length > 0
            ? `🎉 [${currentGroup.name} 외 ${otherSyncGroups.length}개 그룹] 기록이 동기화되어 저장되었습니다! (+${payload.points_earned}P)`
            : `🎉 [${currentGroup.name}] 오늘의 기록이 저장되었습니다! (+${payload.points_earned}P)`;

        showToast(syncMsg, "success");
        return true;
      } else {
        const errObj = dbError;
        const errCode = errObj?.code || errObj?.statusCode || "POSTGRES_UPSERT_ERROR";
        const dbErrDetail = errObj?.message || errObj?.details || errObj?.hint || JSON.stringify(errObj);
        console.error("upsertDailyRecord failed:", dbError);
        showToast(
          `⚠️ [기록 DB 저장 실패: ${dbErrDetail || "알 수 없는 오류"}]`,
          "error",
          `CODE: ${errCode} | HINT: ${errObj?.hint || "none"}`
        );
        return false;
      }
    },
    [user, currentGroup, myTodayRecord, todayStr, autoSyncGroupIds, showToast]
  );

  // 과거 기록 포함 일괄 동기화 함수
  const syncRecordsToSelectedGroups = useCallback(
    async (targetGroupIds: string[]): Promise<{ success: boolean; syncedCount: number }> => {
      if (!user || !currentGroup) return { success: false, syncedCount: 0 };
      try {
        const result = await syncUserRecordsToTargetGroups(
          user.id,
          currentGroup.id,
          targetGroupIds
        );
        if (result.success) {
          showToast(
            `✨ [${currentGroup.name}]의 기록 ${result.syncedCount}건이 선택한 그룹에 성공적으로 동기화되었습니다!`,
            "success"
          );
        } else {
          showToast("⚠️ 기록 동기화 중 일부 오류가 발생했습니다.", "error");
        }
        return result;
      } catch (err: any) {
        console.error("syncRecordsToSelectedGroups error:", err);
        showToast("⚠️ 기록 동기화 중 오류가 발생했습니다.", "error");
        return { success: false, syncedCount: 0 };
      }
    },
    [user, currentGroup, showToast]
  );

  const sendPokeMessage = useCallback(
    async (targetUserId: string, message: string, recordId?: string) => {
      if (!user || !currentGroup) return false;
      const targetMember = members.find((m) => m.user_id === targetUserId);
      const newPoke = await sendPoke(currentGroup.id, user.id, targetUserId, message, recordId);
      if (newPoke) {
        const enriched: PokeMessage = {
          ...newPoke,
          sender_profile: user,
          receiver_profile: targetMember?.profile,
        };
        setPokes((prev) => [enriched, ...prev]);
        showToast(
          recordId ? "댓글이 등록되었습니다! 💬" : `🌶️ '${targetMember?.profile?.nickname}'님에게 독설을 전송했습니다!`
        );
        return true;
      }
      return false;
    },
    [user, currentGroup, members, showToast]
  );

  const deletePokeMessage = useCallback(
    async (pokeId: string) => {
      const success = await deletePoke(pokeId);
      if (success) {
        setPokes((prev) => prev.filter((p) => p.id !== pokeId));
        showToast("댓글이 삭제되었습니다.", "success");
        return true;
      }
      return false;
    },
    [showToast]
  );

  const createNewGroup = useCallback(
    async (name: string, penaltyRule: string) => {
      if (!user) return null;
      const newGroup = await createGroup(user.id, name, penaltyRule);
      if (!newGroup) {
        showToast("⚠️ 그룹 생성에 실패했습니다.");
        return null;
      }
      await addOwnerToGroup(user.id, newGroup.id);

      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_GROUP_KEY, newGroup.id);
      }

      const updatedGroups = [...groups, newGroup];
      setGroups(updatedGroups);
      setCurrentGroup(newGroup);
      setMembers([
        {
          id: `gm-local-${Date.now()}`,
          group_id: newGroup.id,
          user_id: user.id,
          role: "owner",
          streak_days: 0,
          weekly_points: 0,
          joined_at: new Date().toISOString(),
          profile: user,
        },
      ]);
      setRecords([]);
      setPokes([]);
      showToast(`✨ 새 그룹 '${name}'이 생성되었습니다! 초대 링크를 공유해보세요.`);
      return newGroup;
    },
    [user, groups, showToast]
  );

  const joinExistingGroup = useCallback(
    async (group: Group) => {
      if (!user) return false;
      const res = await joinGroup(user.id, group.id);
      if (!res) return false;

      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_GROUP_KEY, group.id);
      }

      const userGroups = await fetchUserGroups(user.id);
      setGroups(userGroups);
      setCurrentGroup(group);
      setMembers([]);
      setRecords([]);
      setPokes([]);
      await loadGroupData(group);
      showToast(`🎉 '${group.name}' 그룹에 성공적으로 참여했습니다!`);
      return true;
    },
    [user, loadGroupData, showToast]
  );

  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<boolean> => {
      if (!user) return false;
      try {
        const updated = await updateProfile(user.id, updates);
        if (updated) {
          setUser(updated);
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === user.id
                ? { ...m, profile: { ...m.profile, ...updated } }
                : m
            )
          );
          showToast("✨ 프로필 정보가 성공적으로 수정되었습니다!", "success");
          return true;
        } else {
          // Fallback optimistic update
          const optimisticUser = { ...user, ...updates };
          setUser(optimisticUser);
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === user.id
                ? { ...m, profile: { ...m.profile, ...optimisticUser } }
                : m
            )
          );
          showToast("✨ 프로필이 업데이트되었습니다!", "success");
          return true;
        }
      } catch (err: any) {
        console.error("updateUserProfile error:", err);
        showToast("⚠️ 프로필 수정 중 오류가 발생했습니다.", "error");
        return false;
      }
    },
    [user, showToast]
  );

  const uploadAvatar = useCallback(
    async (file: File | Blob): Promise<string | null> => {
      if (!user) return null;
      try {
        const { url, error } = await uploadAvatarPhoto(user.id, file);
        if (error || !url) {
          showToast("⚠️ 프로필 사진 업로드에 실패했습니다.", "error");
          return null;
        }
        return url;
      } catch (err: any) {
        console.error("uploadAvatar error:", err);
        showToast("⚠️ 프로필 사진 업로드 중 오류가 발생했습니다.", "error");
        return null;
      }
    },
    [user, showToast]
  );

  const kickMember = useCallback(
    async (targetUserId: string, keepRecords: boolean): Promise<boolean> => {
      if (!currentGroup) return false;
      try {
        const { success, error } = await kickMemberFromGroup(
          currentGroup.id,
          targetUserId,
          keepRecords
        );
        if (!success) {
          const errMsg = error?.message || error?.details || "권한이 없거나 RLS 정책에 의해 차단되었습니다.";
          showToast(`⚠️ 멤버 강퇴 실패: ${errMsg}`, "error");
          return false;
        }

        // 상태 업데이트
        setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
        if (!keepRecords) {
          setRecords((prev) => prev.filter((r) => r.user_id !== targetUserId));
          setPokes((prev) =>
            prev.filter(
              (p) => p.sender_id !== targetUserId && p.receiver_id !== targetUserId
            )
          );
        }

        showToast("🚪 해당 멤버를 그룹에서 강퇴했습니다.", "info");
        await loadGroupData(currentGroup);
        return true;
      } catch (err: any) {
        console.error("kickMember error:", err);
        showToast(`⚠️ 멤버 강퇴 중 오류: ${err?.message || "알 수 없는 오류"}`, "error");
        return false;
      }
    },
    [currentGroup, loadGroupData, showToast]
  );

  const leaveGroup = useCallback(
    async (groupId: string, keepRecords: boolean): Promise<boolean> => {
      if (!user) return false;
      try {
        const { success, error } = await leaveGroupMember(groupId, user.id, keepRecords);
        if (!success) {
          const errMsg = error?.message || error?.details || "퇴장 처리에 실패했습니다.";
          showToast(`⚠️ 그룹 퇴장 실패: ${errMsg}`, "error");
          return false;
        }

        // 내 그룹 목록에서 제거
        const updatedGroups = groups.filter((g) => g.id !== groupId);
        setGroups(updatedGroups);

        // 현재 보고 있던 그룹에서 나간 경우 처리
        if (currentGroup?.id === groupId) {
          if (updatedGroups.length > 0) {
            await selectGroup(updatedGroups[0]);
          } else {
            setCurrentGroup(null);
            setMembers([]);
            setRecords([]);
            setPokes([]);
            localStorage.removeItem(ACTIVE_GROUP_KEY);
          }
        }

        showToast("👋 그룹에서 성공적으로 퇴장했습니다.", "info");
        return true;
      } catch (err: any) {
        console.error("leaveGroup error:", err);
        showToast(`⚠️ 그룹 퇴장 중 오류: ${err?.message || "알 수 없는 오류"}`, "error");
        return false;
      }
    },
    [user, groups, currentGroup, selectGroup, showToast]
  );

  return (
    <AppContext.Provider
      value={{
        user,
        groups,
        currentGroup,
        members,
        records,
        pokes,
        loading,
        mounted,
        isConfigured: isSupabaseConfigured,
        userMemberInfo,
        myTodayRecord,
        myPhotoRecords,
        autoSyncGroupIds,
        updateAutoSyncGroupIds,
        syncRecordsToSelectedGroups,
        loggerOpen,
        setLoggerOpen,
        toastMsg,
        showToast,
        selectGroup,
        saveDailyRecord,
        sendPokeMessage,
        deletePokeMessage,
        updateUserProfile,
        uploadAvatar,
        createNewGroup,
        joinExistingGroup,
        kickMember,
        leaveGroup,
        logout,
        refreshGroupData,
        refreshAuth: init,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
