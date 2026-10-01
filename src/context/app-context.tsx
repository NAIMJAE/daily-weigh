"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  createGroup,
  addOwnerToGroup,
  joinGroup,
  uploadBodyPhoto,
} from "@/lib/supabase/api";
import { DailyRecord, Group, GroupMember, PokeMessage, UserProfile } from "@/types";
import { getTodayDateString } from "@/lib/utils";

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
  loggerOpen: boolean;
  setLoggerOpen: (open: boolean) => void;
  toastMsg: string | null;
  showToast: (msg: string) => void;
  selectGroup: (group: Group) => Promise<void>;
  saveDailyRecord: (recordData: Partial<DailyRecord>) => Promise<boolean>;
  sendPokeMessage: (targetUserId: string, message: string) => Promise<boolean>;
  createNewGroup: (name: string, penaltyRule: string) => Promise<Group | null>;
  joinExistingGroup: (group: Group) => Promise<boolean>;
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
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

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

  const init = useCallback(async () => {
    setLoading(true);

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
        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
          await init();
        } else if (event === "SIGNED_OUT") {
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
  const userMemberInfo = members.find((m) => m.user_id === user?.id);
  const myPhotoRecords = records.filter(
    (r) => r.user_id === user?.id && Boolean(r.photo_url)
  );

  const saveDailyRecord = useCallback(
    async (recordData: Partial<DailyRecord>) => {
      if (!user || !currentGroup) return false;
      const isNew = !myTodayRecord;

      let finalPhotoUrl = recordData.photo_url !== undefined ? recordData.photo_url : (myTodayRecord?.photo_url ?? null);

      // DataURL(Base64)이 전달된 경우 Supabase Storage에 업로드하여 정식 CDN URL로 변환
      if (finalPhotoUrl && finalPhotoUrl.startsWith("data:image")) {
        try {
          const arr = finalPhotoUrl.split(",");
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/webp";
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const photoBlob = new Blob([u8arr], { type: mimeType });

          const uploadedUrl = await uploadBodyPhoto(user.id, photoBlob, mimeType);
          if (uploadedUrl) {
            finalPhotoUrl = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn("Storage upload failed, falling back to dataUrl:", uploadErr);
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

      const saved = await upsertDailyRecord(payload);
      if (saved) {
        const updatedRecord = { ...saved, profile: user };
        setRecords((prev) =>
          isNew
            ? [...prev, updatedRecord]
            : prev.map((r) => (r.id === saved.id ? updatedRecord : r))
        );
        if (isNew) {
          await updateMemberStats(user.id, currentGroup.id, {
            streak_days: 1,
            weekly_points: payload.points_earned,
          });
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === user.id
                ? {
                    ...m,
                    streak_days: m.streak_days + 1,
                    weekly_points: m.weekly_points + payload.points_earned,
                  }
                : m
            )
          );
        }
        showToast(`🎉 [${currentGroup.name}] 오늘의 기록이 저장되었습니다!`);
        return true;
      } else {
        showToast("⚠️ 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
        return false;
      }
    },
    [user, currentGroup, myTodayRecord, todayStr, showToast]
  );

  const sendPokeMessage = useCallback(
    async (targetUserId: string, message: string) => {
      if (!user || !currentGroup) return false;
      const targetMember = members.find((m) => m.user_id === targetUserId);
      const newPoke = await sendPoke(currentGroup.id, user.id, targetUserId, message);
      if (newPoke) {
        const enriched: PokeMessage = {
          ...newPoke,
          sender_profile: user,
          receiver_profile: targetMember?.profile,
        };
        setPokes((prev) => [enriched, ...prev]);
        showToast(`🌶️ '${targetMember?.profile?.nickname}'님에게 독설을 전송했습니다!`);
        return true;
      }
      return false;
    },
    [user, currentGroup, members, showToast]
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
        loggerOpen,
        setLoggerOpen,
        toastMsg,
        showToast,
        selectGroup,
        saveDailyRecord,
        sendPokeMessage,
        createNewGroup,
        joinExistingGroup,
        logout,
        refreshGroupData,
        refreshAuth: init,
      }}
    >
      {children}
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
