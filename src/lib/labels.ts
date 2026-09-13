import type { MealType } from "../types";

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
};

export const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];
