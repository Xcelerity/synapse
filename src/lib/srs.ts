export interface SRSCard {
  id: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: Date;
  lastReviewed?: Date;
}
export type SRSGrade = 0 | 1 | 2 | 3 | 4 | 5;
export interface SRSResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: Date;
  quality: "hard" | "medium" | "easy" | "perfect";
}
export function calculateNextReview(card: SRSCard, grade: SRSGrade): SRSResult {
  let { easeFactor, interval, repetitions } = card;
  const quality: SRSResult["quality"] =
    grade <= 1
      ? "hard"
      : grade <= 2
        ? "medium"
        : grade <= 3
          ? "easy"
          : "perfect";
  if (grade < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    if (easeFactor > 2.5) easeFactor = 2.5;
  }
  interval = Math.min(interval, 365);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);
  dueDate.setHours(0, 0, 0, 0);
  return { easeFactor, interval, repetitions, dueDate, quality };
}
export function createSRSCard(id: string): SRSCard {
  const dueDate = new Date();
  dueDate.setHours(0, 0, 0, 0);
  return {
    id,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate,
  };
}
export function getDueCards<T extends SRSCard>(cards: T[]): T[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return cards.filter((card) => new Date(card.dueDate) <= today);
}
export function getRetentionRate(easeFactor: number): number {
  return Math.min(
    100,
    Math.max(0, Math.round(((easeFactor - 1.3) / (2.5 - 1.3)) * 100)),
  );
}
export function getDifficultyLabel(easeFactor: number): string {
  if (easeFactor >= 2.3) return "Easy";
  if (easeFactor >= 1.8) return "Medium";
  return "Hard";
}
export function calculateStreak(reviewDates: Date[]): number {
  if (!reviewDates.length) return 0;
  const sorted = [...reviewDates].sort((a, b) => b.getTime() - a.getTime());
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < sorted.length; i++) {
    const reviewDate = new Date(sorted[i]);
    reviewDate.setHours(0, 0, 0, 0);
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (reviewDate.getTime() === expected.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
