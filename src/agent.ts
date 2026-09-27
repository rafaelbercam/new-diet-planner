import Anthropic from '@anthropic-ai/sdk';
import {
  DietPlannerInput,
  DietPlannerOutput,
  Sex,
} from './types';
import {
  calculateBMR,
  calculateTDEE,
  calculateDailyCalories,
  calculateMinProtein,
  validateInput,
  checkRestrictionConflicts,
  validateOutput,
} from './utils';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Retry logic with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialBackoff: number = INITIAL_BACKOFF_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const backoffMs = initialBackoff * Math.pow(2, attempt);
        console.log(
          `Tentativa ${attempt + 1} falhou. Aguardando ${backoffMs}ms antes de retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError;
}

/**
 * Generate diet plan using Claude API
 */
export async function generateDietPlan(
  input: DietPlannerInput
): Promise<DietPlannerOutput> {
  // Validate input
  const validation = validateInput(input);
  if (!validation.valid) {
    throw new Error(`Validação de entrada falhou: ${validation.errors.join(', ')}`);
  }

  // Check restriction conflicts
  const conflictCheck = checkRestrictionConflicts(input.dietary_restrictions);
  if (conflictCheck.conflicting) {
    throw new Error(
      `Restrições alimentares conflitantes: ${conflictCheck.conflicts.join(', ')}`
    );
  }

  // Set default sex if not provided
  const sex: Sex = input.sex || 'masculino';

  // Calculate nutritional targets
  const bmr = calculateBMR(input.weight_kg, input.height_cm, input.age, sex);
  const tdee = calculateTDEE(bmr, input.activity_level);
  const dailyCalories = calculateDailyCalories(tdee, input.fitness_goals);
  const minProtein = calculateMinProtein(input.weight_kg, input.fitness_goals);

  // Build prompt for Claude
  const prompt = buildPrompt({
    ...input,
    sex,
    bmr,
    tdee,
    dailyCalories,
    minProtein,
  });

  try {
    // Call Claude API with retry logic
    const response = await retryWithBackoff(async () => {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 12000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = message.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('Resposta da API não contém texto');
      }

      return textContent.text;
    });

    // Parse response - handle markdown JSON blocks
    let jsonText = response;

    // Try to extract JSON from markdown code block
    const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1];
    }

    // Find first { and last } to extract complete JSON
    const startIdx = jsonText.indexOf('{');
    const lastIdx = jsonText.lastIndexOf('}');

    if (startIdx === -1 || lastIdx === -1 || lastIdx <= startIdx) {
      throw new Error('Resposta não contém JSON válido');
    }

    const jsonStr = jsonText.substring(startIdx, lastIdx + 1);

    let output: DietPlannerOutput;
    try {
      output = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', jsonStr.substring(0, 300));
      throw new Error(`Erro ao fazer parse do JSON: ${parseError instanceof Error ? parseError.message : 'desconhecido'}`);
    }

    // Validate output
    const outputValidation = validateOutput(output, input);
    if (!outputValidation.valid) {
      throw new Error(
        `Validação da saída falhou: ${outputValidation.errors.join(', ')}`
      );
    }

    return output;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('DEADLINE_EXCEEDED')) {
        throw new Error(
          'Timeout na chamada da API Claude. Tente novamente em alguns momentos. A geração de planos complexos pode levar até 30 segundos.'
        );
      }
      throw error;
    }
    throw new Error('Erro desconhecido ao chamar Claude API');
  }
}

/**
 * Build prompt for Claude
 */
function buildPrompt(input: DietPlannerInput & {
  sex: Sex;
  bmr: number;
  tdee: number;
  dailyCalories: number;
  minProtein: number;
}): string {
  const restrictions = (input.dietary_restrictions || []).join(', ');
  const goals = input.fitness_goals.join(', ');
  const preferred = (input.preferred_foods || []).join(', ');
  const disliked = (input.disliked_foods || []).join(', ');

  return `Você é um nutricionista especializado que cria planos de dieta personalizados altamente detalhados e nutricionalmente equilibrados.

DADOS DO USUÁRIO:
- Idade: ${input.age} anos
- Peso: ${input.weight_kg} kg
- Altura: ${input.height_cm} cm
- Sexo: ${input.sex}
- Nível de atividade: ${input.activity_level}
- Objetivos: ${goals}
- Restrições alimentares: ${restrictions || 'nenhuma'}
- Alimentos preferidos: ${preferred || 'nenhuma preferência específica'}
- Alimentos que não gosta: ${disliked || 'nenhum'}

CÁLCULOS NUTRICIONAIS:
- BMR (Taxa Metabólica Basal): ${input.bmr.toFixed(0)} kcal
- TDEE (Gasto Energético Total): ${input.tdee.toFixed(0)} kcal
- Calorias diárias alvo: ${input.dailyCalories.toFixed(0)} kcal (±5%)
- Proteína mínima diária: ${input.minProtein.toFixed(1)} g

REQUERIMENTOS OBRIGATÓRIOS:
1. CALORIAS: O plano deve ter aproximadamente ${input.dailyCalories.toFixed(0)} kcal por dia (variação máxima de ±5%)
2. PROTEÍNA: Mínimo ${input.minProtein.toFixed(1)}g de proteína por dia
3. RESTRIÇÕES ALIMENTARES: ABSOLUTAMENTE NENHUM alimento das seguintes restrições pode aparecer: ${restrictions || 'nenhuma'}
4. ALIMENTOS QUE NÃO GOSTA: CRÍTICO - Os seguintes alimentos são PROIBIDOS e NÃO podem aparecer em NENHUMA refeição, em NENHUM dia: ${disliked || 'nenhum'}
5. PREFERÊNCIAS: Incluir frequentemente ${preferred || 'variedade de alimentos'} quando possível
6. FORMATO: Cada refeição DEVE ter no mínimo 2 opções diferentes
7. DURAÇÃO: Plano completo de 7 dias com variação de alimentos
8. LÍNGUA: Responder em português (Brasil)
9. VERIFICAÇÃO FINAL: Antes de retornar o plano, verifique que NENHUM alimento de disliked_foods aparece em qualquer dia ou refeição

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON válido):
{
  "usuario": {
    "idade": ${input.age},
    "peso_kg": ${input.weight_kg},
    "altura_cm": ${input.height_cm},
    "sexo": "${input.sex}",
    "nivel_atividade": "${input.activity_level}",
    "objetivos": [${input.fitness_goals.map((g) => `"${g}"`).join(', ')}],
    "restricoes_alimentares": [${input.dietary_restrictions?.map((r) => `"${r}"`).join(', ') || ''}]
  },
  "plano_nutricional": {
    "bmr": ${input.bmr.toFixed(0)},
    "tdee": ${input.tdee.toFixed(0)},
    "calorias_diarias_alvo": ${input.dailyCalories.toFixed(0)},
    "proteina_minima_diaria_g": ${input.minProtein.toFixed(1)}
  },
  "plano_7_dias": [
    {
      "dia": 1,
      "refeições": [
        {
          "tipo": "café_da_manhã",
          "opções": [
            {
              "nome": "descrição completa do prato",
              "nutrientes": {
                "calorias": 350,
                "proteina_g": 15,
                "carboidratos_g": 45,
                "gordura_g": 12
              }
            },
            {
              "nome": "segunda opção",
              "nutrientes": {
                "calorias": 360,
                "proteina_g": 14,
                "carboidratos_g": 48,
                "gordura_g": 11
              }
            }
          ]
        },
        {
          "tipo": "almoço",
          "opções": [
            {
              "nome": "descrição completa do prato",
              "nutrientes": {
                "calorias": 650,
                "proteina_g": 45,
                "carboidratos_g": 70,
                "gordura_g": 18
              }
            },
            {
              "nome": "segunda opção",
              "nutrientes": {
                "calorias": 660,
                "proteina_g": 46,
                "carboidratos_g": 68,
                "gordura_g": 19
              }
            }
          ]
        },
        {
          "tipo": "lanche",
          "opções": [
            {
              "nome": "descrição completa",
              "nutrientes": {
                "calorias": 200,
                "proteina_g": 10,
                "carboidratos_g": 25,
                "gordura_g": 6
              }
            },
            {
              "nome": "segunda opção",
              "nutrientes": {
                "calorias": 210,
                "proteina_g": 11,
                "carboidratos_g": 23,
                "gordura_g": 7
              }
            }
          ]
        },
        {
          "tipo": "janta",
          "opções": [
            {
              "nome": "descrição completa do prato",
              "nutrientes": {
                "calorias": 500,
                "proteina_g": 40,
                "carboidratos_g": 50,
                "gordura_g": 15
              }
            },
            {
              "nome": "segunda opção",
              "nutrientes": {
                "calorias": 510,
                "proteina_g": 42,
                "carboidratos_g": 48,
                "gordura_g": 14
              }
            }
          ]
        }
      ]
    }
    // ... continue com dias 2-7, variando os alimentos mas mantendo a estrutura similar
  ],
  "resumo": {
    "calorias_totais_semana": ${(input.dailyCalories * 7).toFixed(0)},
    "proteina_total_semana_g": ${(input.minProtein * 7).toFixed(0)},
    "variacao_caloria_percentual": 2.5
  }
}

IMPORTANTE:
- Incluir EXATAMENTE 7 dias no plano
- CADA refeição deve ter EXATAMENTE 2 opções
- Respeitar TODAS as restrições alimentares listadas
- Garantir que NENHUM alimento disliked apareça
- Os valores nutricionais devem ser realistas e calculados para cada opção
- Total de calorias por dia deve estar ±5% de ${input.dailyCalories.toFixed(0)} kcal
- Total de proteína por dia deve ser no mínimo ${input.minProtein.toFixed(1)}g
- Variar os alimentos durante os 7 dias para evitar monotonia
- Estrutura JSON deve ser válida e parseable

Gere agora o plano de dieta personalizado:`;
}
