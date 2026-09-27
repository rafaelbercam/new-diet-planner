import { generateDietPlan } from '../src/agent';
import {
  calculateBMR,
  calculateTDEE,
  calculateDailyCalories,
  calculateMinProtein,
  validateInput,
} from '../src/utils';
import { DietPlannerInput } from '../src/types';

describe('Diet Planner Agent', () => {
  // Skip API tests if ANTHROPIC_API_KEY is not set
  const skipIfNoApiKey = !process.env.ANTHROPIC_API_KEY ? describe.skip : describe;

  describe('Utility Functions', () => {
    test('calculateBMR should calculate correctly for example data', () => {
      // Example: 32 year old male, 85kg, 180cm
      const bmr = calculateBMR(85, 180, 32, 'masculino');
      // BMR = 10*85 + 6.25*180 - 5*32 + 5
      // = 850 + 1125 - 160 + 5 = 1820
      expect(bmr).toBeCloseTo(1820, -1);
    });

    test('calculateTDEE should apply activity multiplier correctly', () => {
      const bmr = 1820;
      const tdee = calculateTDEE(bmr, 'moderado');
      // TDEE = 1820 * 1.55 = 2821
      expect(tdee).toBeCloseTo(2821, -1);
    });

    test('calculateDailyCalories should apply goal multiplier for weight loss', () => {
      const tdee = 2821;
      const calories = calculateDailyCalories(tdee, ['perda_peso']);
      // Weight loss: 2821 * 0.85 = 2397.85
      expect(calories).toBeCloseTo(2397.85, 1);
      expect(calories).toBeLessThan(tdee); // Should be less than TDEE (deficit)
    });

    test('calculateDailyCalories should apply goal multiplier for muscle gain', () => {
      const tdee = 2300;
      const calories = calculateDailyCalories(tdee, ['ganho_muscular']);
      // Muscle gain: 2300 * 1.15 = 2645
      expect(calories).toBeCloseTo(2645, 0);
    });

    test('calculateDailyCalories should return TDEE for maintenance', () => {
      const tdee = 2300;
      const calories = calculateDailyCalories(tdee, ['manutenção']);
      expect(calories).toBe(tdee);
    });

    test('calculateMinProtein should return 1.4g/kg for weight loss', () => {
      const protein = calculateMinProtein(85, ['perda_peso']);
      // 85 * 1.4 = 119
      expect(protein).toBeCloseTo(119, 0);
    });

    test('calculateMinProtein should return 2.0g/kg for muscle gain', () => {
      const protein = calculateMinProtein(65, ['ganho_muscular']);
      // 65 * 2.0 = 130
      expect(protein).toBeCloseTo(130, 0);
    });

    test('validateInput should reject age < 18', () => {
      const input: DietPlannerInput = {
        age: 16,
        weight_kg: 70,
        height_cm: 175,
        activity_level: 'moderado',
        fitness_goals: ['perda_peso'],
      };
      const result = validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Idade'))).toBe(true);
    });

    test('validateInput should reject age > 80', () => {
      const input: DietPlannerInput = {
        age: 85,
        weight_kg: 70,
        height_cm: 175,
        activity_level: 'moderado',
        fitness_goals: ['perda_peso'],
      };
      const result = validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Idade'))).toBe(true);
    });

    test('validateInput should reject weight <= 0', () => {
      const input: DietPlannerInput = {
        age: 30,
        weight_kg: 0,
        height_cm: 175,
        activity_level: 'moderado',
        fitness_goals: ['perda_peso'],
      };
      const result = validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Peso'))).toBe(true);
    });

    test('validateInput should reject height <= 0', () => {
      const input: DietPlannerInput = {
        age: 30,
        weight_kg: 70,
        height_cm: -1,
        activity_level: 'moderado',
        fitness_goals: ['perda_peso'],
      };
      const result = validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Altura'))).toBe(true);
    });

    test('validateInput should accept valid inputs', () => {
      const input: DietPlannerInput = {
        age: 32,
        weight_kg: 85,
        height_cm: 180,
        activity_level: 'moderado',
        fitness_goals: ['perda_peso'],
      };
      const result = validateInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  skipIfNoApiKey('API Integration Tests', () => {
    test('Story 1: Weight Loss Plan - should generate valid plan for 32yo, 85kg, 180cm, goal perda_peso', async () => {
      const input: DietPlannerInput = {
        age: 32,
        weight_kg: 85,
        height_cm: 180,
        sex: 'masculino',
        activity_level: 'moderado',
        fitness_goals: ['perda_peso'],
        preferred_foods: ['frango', 'arroz integral'],
        disliked_foods: ['ovos'],
      };

      const output = await generateDietPlan(input);

      // Verify structure
      expect(output).toBeDefined();
      expect(output.plano_7_dias).toHaveLength(7);
      expect(output.usuario).toBeDefined();
      expect(output.plano_nutricional).toBeDefined();
      expect(output.resumo).toBeDefined();

      // Verify calorie target (±5%)
      const avgDailyCalories = output.resumo.calorias_totais_semana / 7;
      expect(avgDailyCalories).toBeGreaterThanOrEqual(2100);
      expect(avgDailyCalories).toBeLessThanOrEqual(2300);

      // Verify protein minimum (≥119g)
      const avgDailyProtein = output.resumo.proteina_total_semana_g / 7;
      expect(avgDailyProtein).toBeGreaterThanOrEqual(119);

      // Verify no disliked foods
      for (const day of output.plano_7_dias) {
        for (const meal of day.refeições) {
          for (const option of meal.opções) {
            expect(option.nome.toLowerCase()).not.toContain('ovo');
          }
        }
      }

      // Verify minimum 2 options per meal
      for (const day of output.plano_7_dias) {
        for (const meal of day.refeições) {
          expect(meal.opções.length).toBeGreaterThanOrEqual(2);
        }
      }
    }, 60000); // 60s timeout for API call

    test('Story 2: Vegetarian Muscle Gain - should generate valid plan for 28yo, 65kg, 165cm, vegetarian, ganho_muscular', async () => {
      const input: DietPlannerInput = {
        age: 28,
        weight_kg: 65,
        height_cm: 165,
        sex: 'masculino',
        activity_level: 'intenso',
        fitness_goals: ['ganho_muscular'],
        dietary_restrictions: ['vegetariano'],
        preferred_foods: ['tofu', 'legumes'],
        disliked_foods: [],
      };

      const output = await generateDietPlan(input);

      // Verify structure
      expect(output).toBeDefined();
      expect(output.plano_7_dias).toHaveLength(7);

      // Verify protein minimum (≥130g for muscle gain at 65kg)
      const avgDailyProtein = output.resumo.proteina_total_semana_g / 7;
      expect(avgDailyProtein).toBeGreaterThanOrEqual(130);

      // Verify no animal products (vegetariano)
      const animalProducts = [
        'carne',
        'frango',
        'peixe',
        'presunto',
        'bacon',
        'lingüiça',
      ];
      for (const day of output.plano_7_dias) {
        for (const meal of day.refeições) {
          for (const option of meal.opções) {
            for (const product of animalProducts) {
              expect(option.nome.toLowerCase()).not.toContain(product);
            }
          }
        }
      }

      // Verify minimum 2 options per meal
      for (const day of output.plano_7_dias) {
        for (const meal of day.refeições) {
          expect(meal.opções.length).toBeGreaterThanOrEqual(2);
        }
      }

      // Verify daily calories are elevated (muscle gain goal)
      const avgDailyCalories = output.resumo.calorias_totais_semana / 7;
      expect(avgDailyCalories).toBeGreaterThan(2400); // Should be elevated for muscle gain
    }, 60000); // 60s timeout for API call
  });

  skipIfNoApiKey('Edge Case Tests', () => {
    test('should handle multiple dietary restrictions simultaneously', async () => {
      const input: DietPlannerInput = {
        age: 35,
        weight_kg: 75,
        height_cm: 175,
        sex: 'feminino',
        activity_level: 'moderado',
        fitness_goals: ['perda_peso', 'saúde'],
        dietary_restrictions: ['vegetariano', 'sem_lactose'],
      };

      const output = await generateDietPlan(input);
      expect(output).toBeDefined();
      expect(output.plano_7_dias).toHaveLength(7);

      // Verify no animal products and no dairy
      const restrictedProducts = [
        'carne',
        'frango',
        'peixe',
        'leite',
        'queijo',
        'iogurte',
      ];
      for (const day of output.plano_7_dias) {
        for (const meal of day.refeições) {
          for (const option of meal.opções) {
            for (const product of restrictedProducts) {
              expect(option.nome.toLowerCase()).not.toContain(product);
            }
          }
        }
      }
    }, 60000);

    test('should handle extreme weight ranges', async () => {
      // Test with lower weight
      const input1: DietPlannerInput = {
        age: 25,
        weight_kg: 50,
        height_cm: 160,
        activity_level: 'leve',
        fitness_goals: ['manutenção'],
      };

      const output1 = await generateDietPlan(input1);
      expect(output1).toBeDefined();

      // Protein calculation for 50kg
      const minProtein1 = calculateMinProtein(50, ['manutenção']);
      const avgProtein1 = output1.resumo.proteina_total_semana_g / 7;
      expect(avgProtein1).toBeGreaterThanOrEqual(minProtein1 * 0.95); // Allow 5% variance

      // Test with higher weight
      const input2: DietPlannerInput = {
        age: 40,
        weight_kg: 120,
        height_cm: 190,
        activity_level: 'intenso',
        fitness_goals: ['ganho_muscular'],
      };

      const output2 = await generateDietPlan(input2);
      expect(output2).toBeDefined();

      // Protein calculation for 120kg
      const minProtein2 = calculateMinProtein(120, ['ganho_muscular']);
      const avgProtein2 = output2.resumo.proteina_total_semana_g / 7;
      expect(avgProtein2).toBeGreaterThanOrEqual(minProtein2 * 0.95); // Allow 5% variance
    }, 120000);
  });
});
