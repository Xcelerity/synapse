import { create } from "zustand";
import { persist } from "zustand/middleware";
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  gradeLevel: "k-3" | "k-6" | "middle" | "high" | "undergrad" | "grad" | "phd";
  major?: string;
  studyGoals: string[];
  createdAt: Date;
}
export interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate?: string;
  badges: string[];
  totalStudyMinutes: number;
  flashcardsReviewed: number;
  notesCreated: number;
  quizzesTaken: number;
  flashcardDecksCreated: number;
  essaysGraded: number;
  pomodorosCompleted: number;
  aiTutorSessions: number;
  dailyStudyMinutes: Record<string, number>;
}
interface AuthStore {
  user: UserProfile | null;
  gamification: GamificationState;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  addXP: (amount: number) => void;
  incrementStreak: () => void;
  awardBadge: (badge: string) => void;
  addStudyMinutes: (minutes: number) => void;
  updateStats: (stats: Partial<GamificationState>) => void;
  reset: () => void;
}
const XP_PER_LEVEL = 1000;
function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
const defaultGamification: GamificationState = {
  xp: 0,
  level: 1,
  streak: 0,
  badges: [],
  totalStudyMinutes: 0,
  flashcardsReviewed: 0,
  notesCreated: 0,
  quizzesTaken: 0,
  flashcardDecksCreated: 0,
  essaysGraded: 0,
  pomodorosCompleted: 0,
  aiTutorSessions: 0,
  dailyStudyMinutes: {},
};
import toast from "react-hot-toast";
import { checkBadgeUnlocks, BADGES } from "@/lib/gamification";
function processBadges(
  currentState: GamificationState,
  nextState: Partial<GamificationState>,
): string[] {
  const projected = { ...currentState, ...nextState };
  const unlockedNow = checkBadgeUnlocks({
    notesCreated: projected.notesCreated,
    flashcardsReviewed: projected.flashcardsReviewed,
    flashcardDecksCreated: projected.flashcardDecksCreated,
    streak: projected.streak,
    level: projected.level,
    pomodorosCompleted: projected.pomodorosCompleted,
    aiTutorSessions: projected.aiTutorSessions,
    quizzesTaken: projected.quizzesTaken,
    essaysGraded: projected.essaysGraded,
  });
  const newBadges = unlockedNow.filter((b) => !currentState.badges.includes(b));
  newBadges.forEach((b) => {
    const badge = BADGES[b];
    if (badge) {
      toast.success(`🏆 Achievement Unlocked: ${badge.name}`, {
        icon: badge.icon,
        duration: 5000,
        style: {
          border: `1px solid ${badge.color}`,
          padding: "16px",
          color: badge.color,
          fontWeight: "bold",
        },
      });
    }
  });
  return [...currentState.badges, ...newBadges];
}
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      gamification: defaultGamification,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      addXP: (amount) =>
        set((state) => {
          const newXP = state.gamification.xp + amount;
          const newLevel = calculateLevel(newXP);
          const nextGamification = {
            ...state.gamification,
            xp: newXP,
            level: newLevel,
          };
          const newBadgesList = processBadges(
            state.gamification,
            nextGamification,
          );
          return {
            gamification: { ...nextGamification, badges: newBadgesList },
          };
        }),
      incrementStreak: () =>
        set((state) => {
          const today = new Date().toDateString();
          const lastDate = state.gamification.lastStudyDate;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          let newStreak = state.gamification.streak;
          if (lastDate !== today) {
            if (lastDate === yesterday.toDateString()) {
              newStreak += 1;
            } else if (!lastDate) {
              newStreak = 1;
            } else {
              newStreak = 1;
            }
          }
          const nextGamification = {
            ...state.gamification,
            streak: newStreak,
            lastStudyDate: today,
          };
          const newBadgesList = processBadges(
            state.gamification,
            nextGamification,
          );
          return {
            gamification: { ...nextGamification, badges: newBadgesList },
          };
        }),
      awardBadge: (badge) =>
        set((state) => {
          if (state.gamification.badges.includes(badge)) return state;
          const bParams = BADGES[badge];
          if (bParams) {
            toast.success(`🏆 Achievement Unlocked: ${bParams.name}`, {
              icon: bParams.icon,
              duration: 4000,
            });
          }
          return {
            gamification: {
              ...state.gamification,
              badges: [...state.gamification.badges, badge],
            },
          };
        }),
      addStudyMinutes: (minutes) =>
        set((state) => {
          const today = new Date().toLocaleDateString("en-CA");
          const currentDaily = state.gamification.dailyStudyMinutes || {};
          const nextGamification = {
            ...state.gamification,
            totalStudyMinutes: state.gamification.totalStudyMinutes + minutes,
            dailyStudyMinutes: {
              ...currentDaily,
              [today]: (currentDaily[today] || 0) + minutes,
            },
          };
          const newBadgesList = processBadges(
            state.gamification,
            nextGamification,
          );
          return {
            gamification: { ...nextGamification, badges: newBadgesList },
          };
        }),
      updateStats: (stats) =>
        set((state) => {
          const nextGamification = { ...state.gamification, ...stats };
          const newBadgesList = processBadges(
            state.gamification,
            nextGamification,
          );
          return {
            gamification: { ...nextGamification, badges: newBadgesList },
          };
        }),
      reset: () => set({ user: null, gamification: defaultGamification }),
    }),
    { name: "synapse-auth", skipHydration: true },
  ),
);
