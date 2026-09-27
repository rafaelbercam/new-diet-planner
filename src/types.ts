// Types for Diet Planner Agent

export type ActivityLevel = 'sedentário' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso';
export type FitnessGoal = 'perda_peso' | 'ganho_muscular' | 'manutenção' | 'saúde';
export type DietaryRestriction = 'vegetariano' | 'vegano' | 'sem_gluten' | 'sem_lactose' | 'ceto';
export type Sex = 'masculino' | 'feminino';

export interface NutrientInfo {
  calorias: number;
  proteina_g: number;
  carboidratos_g: number;
  gordura_g: number;
}

export interface MealOption {
  nome: string;
  nutrientes: NutrientInfo;
}

export interface Meal {
  tipo: 'café_da_manhã' | 'almoço' | 'lanche' | 'janta';
  opções: MealOption[];
}

export interface DayPlan {
  dia: number;
  refeições: Meal[];
}

export interface DietPlannerInput {
  age: number;
  weight_kg: number;
  height_cm: number;
  sex?: Sex;
  activity_level: ActivityLevel;
  fitness_goals: FitnessGoal[];
  dietary_restrictions?: DietaryRestriction[];
  preferred_foods?: string[];
  disliked_foods?: string[];
}

export interface DietPlannerOutput {
  usuario: {
    idade: number;
    peso_kg: number;
    altura_cm: number;
    sexo: Sex;
    nivel_atividade: ActivityLevel;
    objetivos: FitnessGoal[];
    restricoes_alimentares: DietaryRestriction[];
  };
  plano_nutricional: {
    bmr: number;
    tdee: number;
    calorias_diarias_alvo: number;
    proteina_minima_diaria_g: number;
  };
  plano_7_dias: DayPlan[];
  resumo: {
    calorias_totais_semana: number;
    proteina_total_semana_g: number;
    variacao_caloria_percentual: number;
  };
}
