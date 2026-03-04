export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  xpReward: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}
export const BADGES: Record<string, Badge> = {
  first_blood: {
    id: "first_blood",
    name: "First Blood",
    description: "Complete your first quiz",
    icon: "🩸",
    color: "#ef4444",
    xpReward: 50,
    rarity: "common",
  },
  first_note: {
    id: "first_note",
    name: "Scribe",
    description: "Create your first note",
    icon: "📝",
    color: "#10b981",
    xpReward: 50,
    rarity: "common",
  },
  first_flashcard: {
    id: "first_flashcard",
    name: "Flashmaster",
    description: "Create your first flashcard deck",
    icon: "🃏",
    color: "#3b82f6",
    xpReward: 50,
    rarity: "common",
  },
  streak_3: {
    id: "streak_3",
    name: "On Fire!",
    description: "Maintain a 3-day study streak",
    icon: "🔥",
    color: "#f97316",
    xpReward: 100,
    rarity: "common",
  },
  streak_7: {
    id: "streak_7",
    name: "Marathoner",
    description: "Maintain a 7-day study streak",
    icon: "⚡",
    color: "#f59e0b",
    xpReward: 500,
    rarity: "rare",
  },
  streak_30: {
    id: "streak_30",
    name: "Legendary Streak",
    description: "Maintain a 30-day study streak",
    icon: "💎",
    color: "#7c3aed",
    xpReward: 2000,
    rarity: "epic",
  },
  streak_100: {
    id: "streak_100",
    name: "Centurion",
    description: "Maintain a 100-day study streak",
    icon: "👑",
    color: "#f43f5e",
    xpReward: 10000,
    rarity: "legendary",
  },
  early_bird: {
    id: "early_bird",
    name: "Early Bird",
    description: "Start a Pomodoro timer before 6 AM",
    icon: "🌅",
    color: "#eab308",
    xpReward: 150,
    rarity: "rare",
  },
  night_owl: {
    id: "night_owl",
    name: "Night Owl",
    description: "Study past midnight",
    icon: "🦉",
    color: "#6366f1",
    xpReward: 150,
    rarity: "rare",
  },
  deep_dive: {
    id: "deep_dive",
    name: "Deep Dive",
    description: "Log a 4-hour Pomodoro session in a single day",
    icon: "🤿",
    color: "#0ea5e9",
    xpReward: 1000,
    rarity: "epic",
  },
  pomodoro_5: {
    id: "pomodoro_5",
    name: "Focus Apprentice",
    description: "Complete 5 Pomodoro sessions",
    icon: "🍅",
    color: "#ef4444",
    xpReward: 100,
    rarity: "common",
  },
  zen_master: {
    id: "zen_master",
    name: "Zen Master",
    description: "Complete 100 total Pomodoro sessions",
    icon: "🧘",
    color: "#14b8a6",
    xpReward: 2500,
    rarity: "epic",
  },
  flashcards_100: {
    id: "flashcards_100",
    name: "Card Shark",
    description: "Review 100 flashcards",
    icon: "🎯",
    color: "#06b6d4",
    xpReward: 200,
    rarity: "rare",
  },
  flashcards_500: {
    id: "flashcards_500",
    name: "Flashcard Fanatic",
    description: "Review 500 flashcards",
    icon: "📇",
    color: "#3b82f6",
    xpReward: 1000,
    rarity: "epic",
  },
  the_architect: {
    id: "the_architect",
    name: "The Architect",
    description: "Create 10 distinct flashcard decks",
    icon: "🏗️",
    color: "#f59e0b",
    xpReward: 1000,
    rarity: "epic",
  },
  ai_tutor: {
    id: "ai_tutor",
    name: "Curious Mind",
    description: "Have your first AI tutoring session",
    icon: "🧠",
    color: "#8b5cf6",
    xpReward: 75,
    rarity: "common",
  },
  socratic_disciple: {
    id: "socratic_disciple",
    name: "Socratic Disciple",
    description: "Send 50 messages to the AI Tutor",
    icon: "🤖",
    color: "#d946ef",
    xpReward: 800,
    rarity: "rare",
  },
  essayist: {
    id: "essayist",
    name: "Essayist",
    description: "Have the AI grade 5 separate essays",
    icon: "🖋️",
    color: "#a855f7",
    xpReward: 1000,
    rarity: "epic",
  },
  perfect_score: {
    id: "perfect_score",
    name: "Perfectionist",
    description: "Get 100% on 3 AI-generated quizzes in a row",
    icon: "💯",
    color: "#ef4444",
    xpReward: 2000,
    rarity: "legendary",
  },
  level_5: {
    id: "level_5",
    name: "Rising Scholar",
    description: "Reach Level 5",
    icon: "🌟",
    color: "#f59e0b",
    xpReward: 200,
    rarity: "rare",
  },
  level_10: {
    id: "level_10",
    name: "Knowledge Knight",
    description: "Reach Level 10",
    icon: "⚔️",
    color: "#7c3aed",
    xpReward: 500,
    rarity: "epic",
  },
  level_25: {
    id: "level_25",
    name: "Grand Scholar",
    description: "Reach Level 25",
    icon: "🏆",
    color: "#f43f5e",
    xpReward: 2000,
    rarity: "legendary",
  },
};
export const XP_REWARDS = {
  CREATE_NOTE: 30,
  CREATE_FLASHCARD_DECK: 50,
  REVIEW_FLASHCARD: 5,
  COMPLETE_QUIZ: 100,
  PERFECT_QUIZ: 200,
  COMPLETE_POMODORO: 50,
  ESSAY_GRADED: 100,
  AI_TUTOR_SESSION: 40,
  DAILY_LOGIN: 25,
  STREAK_BONUS: 50,
} as const;
export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  xpRequired: number;
}
export const LEVEL_TITLES: LevelInfo[] = [
  { level: 1, title: "Novice", color: "#94a3b8", xpRequired: 0 },
  { level: 5, title: "Apprentice", color: "#10b981", xpRequired: 4000 },
  { level: 10, title: "Adept", color: "#3b82f6", xpRequired: 9000 },
  { level: 15, title: "Specialist", color: "#7c3aed", xpRequired: 14000 },
  { level: 20, title: "Master", color: "#f59e0b", xpRequired: 19000 },
  { level: 25, title: "Grand Master", color: "#f43f5e", xpRequired: 24000 },
  { level: 30, title: "Sage", color: "#ec4899", xpRequired: 29000 },
  { level: 50, title: "Transcendent", color: "#06b6d4", xpRequired: 49000 },
];
export function getLevelTitle(level: number): LevelInfo {
  const applicable = LEVEL_TITLES.filter((l) => l.level <= level);
  return applicable[applicable.length - 1] || LEVEL_TITLES[0];
}
export function getXPProgress(totalXP: number): {
  level: number;
  xpInLevel: number;
  xpForNext: number;
  percent: number;
} {
  const XP_PER_LEVEL = 1000;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpForNext = XP_PER_LEVEL;
  const percent = Math.round((xpInLevel / xpForNext) * 100);
  return { level, xpInLevel, xpForNext, percent };
}
export interface ArchetypeProfile {
  id: "scholar" | "architect" | "challenger" | "monk";
  name: string;
  icon: string;
  color: string;
  description: string;
  level: number;
  xp: number;
  progress: number;
}
export function getArchetypes(stats: {
  notesCreated?: number;
  aiTutorSessions?: number;
  flashcardsReviewed?: number;
  flashcardDecksCreated?: number;
  quizzesTaken?: number;
  essaysGraded?: number;
  pomodorosCompleted?: number;
  totalStudyMinutes?: number;
}): ArchetypeProfile[] {
  const safeStats = {
    notesCreated: stats.notesCreated || 0,
    aiTutorSessions: stats.aiTutorSessions || 0,
    flashcardsReviewed: stats.flashcardsReviewed || 0,
    flashcardDecksCreated: stats.flashcardDecksCreated || 0,
    quizzesTaken: stats.quizzesTaken || 0,
    essaysGraded: stats.essaysGraded || 0,
    pomodorosCompleted: stats.pomodorosCompleted || 0,
    totalStudyMinutes: stats.totalStudyMinutes || 0,
  };
  const scholarXP =
    safeStats.notesCreated * 100 + safeStats.aiTutorSessions * 50;
  const architectXP =
    safeStats.flashcardDecksCreated * 200 + safeStats.flashcardsReviewed * 5;
  const challengerXP =
    safeStats.quizzesTaken * 150 + safeStats.essaysGraded * 200;
  const monkXP =
    safeStats.pomodorosCompleted * 100 +
    Math.floor(safeStats.totalStudyMinutes / 10) * 10;
  const ARCHETYPE_XP_PER_LEVEL = 500;
  const calc = (xp: number) => ({
    level: Math.floor(xp / ARCHETYPE_XP_PER_LEVEL) + 1,
    xp,
    progress: Math.round(
      ((xp % ARCHETYPE_XP_PER_LEVEL) / ARCHETYPE_XP_PER_LEVEL) * 100,
    ),
  });
  return [
    {
      id: "scholar",
      name: "The Scholar",
      icon: "🧠",
      color: "#8b5cf6",
      description: "Mastery of Knowledge Acquisition (Notes & AI Tutor)",
      ...calc(scholarXP),
    },
    {
      id: "architect",
      name: "The Architect",
      icon: "🏗️",
      color: "#3b82f6",
      description: "Mastery of Structure (Flashcard Decks)",
      ...calc(architectXP),
    },
    {
      id: "challenger",
      name: "The Challenger",
      icon: "⚔️",
      color: "#f43f5e",
      description: "Mastery of Testing (Quizzes & Essay Grading)",
      ...calc(challengerXP),
    },
    {
      id: "monk",
      name: "The Monk",
      icon: "🧘",
      color: "#10b981",
      description: "Mastery of Absolute Focus (Pomodoro Sessions)",
      ...calc(monkXP),
    },
  ];
}
export function checkBadgeUnlocks(stats: {
  notesCreated?: number;
  flashcardsReviewed?: number;
  flashcardDecksCreated?: number;
  streak?: number;
  level?: number;
  pomodorosCompleted?: number;
  aiTutorSessions?: number;
  quizzesTaken?: number;
  essaysGraded?: number;
}): string[] {
  const unlocked: string[] = [];
  if ((stats.quizzesTaken || 0) >= 1) unlocked.push("first_blood");
  if ((stats.notesCreated || 0) >= 1) unlocked.push("first_note");
  if ((stats.flashcardDecksCreated || 0) >= 1) unlocked.push("first_flashcard");
  if ((stats.streak || 0) >= 3) unlocked.push("streak_3");
  if ((stats.streak || 0) >= 7) unlocked.push("streak_7");
  if ((stats.streak || 0) >= 30) unlocked.push("streak_30");
  if ((stats.streak || 0) >= 100) unlocked.push("streak_100");
  if ((stats.pomodorosCompleted || 0) >= 5) unlocked.push("pomodoro_5");
  if ((stats.pomodorosCompleted || 0) >= 100) unlocked.push("zen_master");
  if ((stats.flashcardsReviewed || 0) >= 100) unlocked.push("flashcards_100");
  if ((stats.flashcardsReviewed || 0) >= 500) unlocked.push("flashcards_500");
  if ((stats.flashcardDecksCreated || 0) >= 10) unlocked.push("the_architect");
  if ((stats.aiTutorSessions || 0) >= 1) unlocked.push("ai_tutor");
  if ((stats.aiTutorSessions || 0) >= 50) unlocked.push("socratic_disciple");
  if ((stats.essaysGraded || 0) >= 5) unlocked.push("essayist");
  if ((stats.level || 0) >= 5) unlocked.push("level_5");
  if ((stats.level || 0) >= 10) unlocked.push("level_10");
  if ((stats.level || 0) >= 25) unlocked.push("level_25");
  return unlocked;
}
