/**
 * Example usage of the Diet Planner Agent
 *
 * This file demonstrates how to use the generateDietPlan function
 * to create personalized diet plans.
 *
 * Before running: ensure you have ANTHROPIC_API_KEY set in your .env file
 *
 * Run with: npx ts-node example.ts
 */

import * as dotenv from 'dotenv';
import { generateDietPlan } from './src/agent';
import { DietPlannerInput } from './src/types';

// Load environment variables
dotenv.config();

/**
 * Example 1: Weight Loss Plan
 *
 * Creates a personalized plan for someone aiming to lose weight
 * with specific food preferences and restrictions
 */
async function example1_weightLoss() {
  console.log('\n=== EXEMPLO 1: Plano de Perda de Peso ===\n');

  const input: DietPlannerInput = {
    age: 32,
    weight_kg: 85,
    height_cm: 180,
    sex: 'masculino',
    activity_level: 'moderado',
    fitness_goals: ['perda_peso'],
    dietary_restrictions: [],
    preferred_foods: ['frango', 'arroz integral', 'brócolis', 'maçã'],
    disliked_foods: ['ovos', 'pimenta'],
  };

  try {
    const plan = await generateDietPlan(input);

    console.log('Usuário:', {
      idade: plan.usuario.idade,
      peso: `${plan.usuario.peso_kg}kg`,
      altura: `${plan.usuario.altura_cm}cm`,
      objetivo: plan.usuario.objetivos[0],
    });

    console.log('\nPlano Nutricional:');
    console.log(`- BMR: ${plan.plano_nutricional.bmr.toFixed(0)} kcal`);
    console.log(`- TDEE: ${plan.plano_nutricional.tdee.toFixed(0)} kcal`);
    console.log(
      `- Calorias diárias alvo: ${plan.plano_nutricional.calorias_diarias_alvo.toFixed(0)} kcal`
    );
    console.log(
      `- Proteína mínima: ${plan.plano_nutricional.proteina_minima_diaria_g.toFixed(1)}g`
    );

    console.log('\nResumo da Semana:');
    console.log(
      `- Calorias totais: ${plan.resumo.calorias_totais_semana.toFixed(0)} kcal`
    );
    console.log(
      `- Proteína total: ${plan.resumo.proteina_total_semana_g.toFixed(0)}g`
    );
    console.log(
      `- Variação calórica: ${plan.resumo.variacao_caloria_percentual.toFixed(1)}%`
    );

    // Show Day 1 as example
    const day1 = plan.plano_7_dias[0];
    console.log(`\nDia 1 - Exemplo de Refeições:`);
    for (const meal of day1.refeições) {
      console.log(`\n  ${meal.tipo}:`);
      for (const option of meal.opções) {
        console.log(
          `    • ${option.nome} (${option.nutrientes.calorias} kcal, ${option.nutrientes.proteina_g.toFixed(1)}g proteína)`
        );
      }
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

/**
 * Example 2: Vegetarian Muscle Gain Plan
 *
 * Creates a plan for someone looking to gain muscle while following
 * a vegetarian diet with preferred protein sources
 */
async function example2_vegetarianMuscleGain() {
  console.log('\n=== EXEMPLO 2: Plano de Ganho Muscular Vegetariano ===\n');

  const input: DietPlannerInput = {
    age: 28,
    weight_kg: 65,
    height_cm: 165,
    sex: 'masculino',
    activity_level: 'intenso',
    fitness_goals: ['ganho_muscular'],
    dietary_restrictions: ['vegetariano'],
    preferred_foods: ['tofu', 'legumes', 'amendoim', 'iogurte grego'],
    disliked_foods: [],
  };

  try {
    const plan = await generateDietPlan(input);

    console.log('Usuário:', {
      idade: plan.usuario.idade,
      peso: `${plan.usuario.peso_kg}kg`,
      altura: `${plan.usuario.altura_cm}cm`,
      objetivo: plan.usuario.objetivos[0],
      restrições: plan.usuario.restricoes_alimentares,
    });

    console.log('\nPlano Nutricional:');
    console.log(`- BMR: ${plan.plano_nutricional.bmr.toFixed(0)} kcal`);
    console.log(`- TDEE: ${plan.plano_nutricional.tdee.toFixed(0)} kcal`);
    console.log(
      `- Calorias diárias alvo: ${plan.plano_nutricional.calorias_diarias_alvo.toFixed(0)} kcal`
    );
    console.log(
      `- Proteína mínima: ${plan.plano_nutricional.proteina_minima_diaria_g.toFixed(1)}g`
    );

    console.log('\nResumo da Semana:');
    console.log(
      `- Calorias totais: ${plan.resumo.calorias_totais_semana.toFixed(0)} kcal`
    );
    console.log(
      `- Proteína total: ${plan.resumo.proteina_total_semana_g.toFixed(0)}g`
    );
    console.log(
      `- Variação calórica: ${plan.resumo.variacao_caloria_percentual.toFixed(1)}%`
    );
  } catch (error) {
    console.error('Erro:', error);
  }
}

/**
 * Example 3: Multiple Dietary Restrictions
 *
 * Creates a plan respecting multiple dietary restrictions simultaneously
 */
async function example3_multipleRestrictions() {
  console.log('\n=== EXEMPLO 3: Múltiplas Restrições Alimentares ===\n');

  const input: DietPlannerInput = {
    age: 35,
    weight_kg: 75,
    height_cm: 175,
    sex: 'feminino',
    activity_level: 'moderado',
    fitness_goals: ['perda_peso', 'saúde'],
    dietary_restrictions: ['vegetariano', 'sem_lactose'],
    preferred_foods: ['quinoa', 'grão de bico', 'melancia', 'brócolis'],
    disliked_foods: [],
  };

  try {
    const plan = await generateDietPlan(input);

    console.log('Usuário:', {
      idade: plan.usuario.idade,
      peso: `${plan.usuario.peso_kg}kg`,
      altura: `${plan.usuario.altura_cm}cm`,
      objetivos: plan.usuario.objetivos,
      restrições: plan.usuario.restricoes_alimentares,
    });

    console.log('\nPlano Nutricional:');
    console.log(
      `- Calorias diárias alvo: ${plan.plano_nutricional.calorias_diarias_alvo.toFixed(0)} kcal`
    );
    console.log(
      `- Proteína mínima: ${plan.plano_nutricional.proteina_minima_diaria_g.toFixed(1)}g`
    );
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Run examples
async function main() {
  console.log('Diet Planner Agent - Exemplos de Uso');
  console.log('=====================================');

  // Uncomment the examples you want to run:
  // Note: Requires ANTHROPIC_API_KEY to be set in .env

  await example1_weightLoss();
  // await example2_vegetarianMuscleGain();
  // await example3_multipleRestrictions();
}

main().catch(console.error);
