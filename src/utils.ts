import {
  ActivityLevel,
  FitnessGoal,
  DietaryRestriction,
  Sex,
  DietPlannerInput,
  DietPlannerOutput,
} from './types';

// Activity multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentário: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

// Sex constant for BMR calculation
const SEX_CONSTANTS: Record<Sex, number> = {
  masculino: 5,
  feminino: -161,
};

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
 * BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + sex_constant
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: Sex
): number {
  return 10 * weight_kg + 6.25 * height_cm - 5 * age + SEX_CONSTANTS[sex];
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(
  bmr: number,
  activity_level: ActivityLevel
): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity_level];
}

/**
 * Calculate target daily calories based on fitness goal
 */
export function calculateDailyCalories(
  tdee: number,
  goals: FitnessGoal[]
): number {
  // Check primary goals in order of priority
  if (goals.includes('perda_peso')) {
    return tdee * 0.85; // 15% deficit
  }
  if (goals.includes('ganho_muscular')) {
    return tdee * 1.15; // 15% surplus
  }
  return tdee; // manutenção or saúde
}

/**
 * Calculate minimum daily protein requirement
 */
export function calculateMinProtein(
  weight_kg: number,
  goals: FitnessGoal[]
): number {
  if (goals.includes('ganho_muscular')) {
    return weight_kg * 2.0; // 2.0g/kg for muscle gain
  }
  if (goals.includes('perda_peso')) {
    return weight_kg * 1.4; // 1.4g/kg for weight loss
  }
  return weight_kg * 1.2; // 1.2g/kg default
}

/**
 * Validate input structure
 */
export function validateInput(input: DietPlannerInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.age < 18 || input.age > 80) {
    errors.push('Idade deve estar entre 18 e 80 anos');
  }

  if (input.weight_kg <= 0) {
    errors.push('Peso deve ser maior que 0');
  }

  if (input.height_cm <= 0) {
    errors.push('Altura deve ser maior que 0');
  }

  if (!input.fitness_goals || input.fitness_goals.length === 0) {
    errors.push('Pelo menos um objetivo de fitness é necessário');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if dietary restrictions conflict
 */
export function checkRestrictionConflicts(
  restrictions?: DietaryRestriction[]
): { conflicting: boolean; conflicts: string[] } {
  if (!restrictions) {
    return { conflicting: false, conflicts: [] };
  }

  const conflicts: string[] = [];

  // Vegano and vegetariano are compatible (vegano is stricter)
  // Other combinations are generally compatible for our purposes

  return { conflicting: conflicts.length > 0, conflicts };
}

/**
 * Calculate calories variation from target
 */
export function calculateCalorieVariation(
  actual: number,
  target: number
): number {
  if (target === 0) return 0;
  return Math.abs((actual - target) / target) * 100;
}

/**
 * Validate output against constraints
 */
export function validateOutput(
  output: DietPlannerOutput,
  input: DietPlannerInput
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check 7 days
  if (output.plano_7_dias.length !== 7) {
    errors.push('Plano deve conter exatamente 7 dias');
  }

  // Check minimum 2 options per meal
  for (const day of output.plano_7_dias) {
    for (const meal of day.refeições) {
      if (meal.opções.length < 2) {
        errors.push(
          `Dia ${day.dia}: refeição ${meal.tipo} tem menos de 2 opções`
        );
      }
    }
  }

  // Check calorie target (±5%)
  const avgDailyCalories = output.resumo.calorias_totais_semana / 7;
  const variation = calculateCalorieVariation(
    avgDailyCalories,
    output.plano_nutricional.calorias_diarias_alvo
  );
  if (variation > 5) {
    errors.push(
      `Variação calórica ${variation.toFixed(2)}% excede limite de ±5%`
    );
  }

  // Check protein minimum
  const avgDailyProtein = output.resumo.proteina_total_semana_g / 7;
  if (avgDailyProtein < output.plano_nutricional.proteina_minima_diaria_g) {
    errors.push('Proteína total abaixo do mínimo requerido');
  }

  // Check disliked foods
  const disliked = input.disliked_foods || [];
  for (const day of output.plano_7_dias) {
    for (const meal of day.refeições) {
      for (const option of meal.opções) {
        if (!option.nome) continue;
        for (const food of disliked) {
          if (
            option.nome.toLowerCase().includes(food.toLowerCase())
          ) {
            errors.push(
              `Alimento "${food}" encontrado em dia ${day.dia}, refeição ${meal.tipo}`
            );
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
