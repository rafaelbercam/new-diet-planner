---
title: 'Diet Planner Agent - Geração de Planos de Dieta Personalizados'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'NO_VCS'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** Usuários precisam de planos de dieta personalizados que considerem suas características físicas, objetivos de fitness e restrições alimentares. Não existe uma solução automatizada para gerar planos baseados em Claude API.

**Abordagem:** Criar um agente TypeScript que utilize Claude API para gerar planos de dieta de 7 dias personalizados, com múltiplas opções de refeição por dia, respeitando restrições alimentares, preferências, e constraints nutricionais específicas de cada objetivo fitness.

## Boundaries & Constraints

**Always:**
- Total calórico deve estar dentro de ±5% do alvo calculado
- Proteína mínima: perda_peso=1.4g/kg, ganho_muscular=2.0g/kg
- Nenhum alimento em `disliked_foods` pode aparecer em qualquer refeição
- TODAS as `dietary_restrictions` devem ser respeitadas (vegetariano, vegano, sem_gluten, sem_lactose, ceto)
- Cada refeição deve ter mínimo de 2 opções diferentes
- Plano deve cobrir 7 dias com variedade de alimentos
- Responder em português com estrutura JSON conforme spec

**Never:**
- Usar modelos além de Claude 3.5 Sonnet
- Modificar o cálculo calórico da API (aplicar apenas ±5%)
- Adicionar alimentos não mencionados em `preferred_foods` sem motivo nutricional
- Retornar plano com menos de 7 dias
- Permitir refeições com menos de 2 opções

## Design Decisions

**Validação de Entrada:** Validar apenas estrutura (Opção A)
- Menor overhead de validação, permite testes com valores extremos para debugging

**Tratamento de Erros da API:** Retry automático com exponential backoff (Opção A)
- Mais robusto contra rate limits do Claude API, melhor para produção
- Implementar com máximo de 3 tentativas antes de falhar

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Expected Output / Behavior | Error Handling |
|---------|----------------|---------------------------|----------------|
| Perda de Peso (Happy Path) | age: 32, weight: 85kg, height: 180cm, activity: moderado, goal: perda_peso, preferred: frango/arroz integral, disliked: ovos | daily_calorie_target: ~2200 (±100), 7 dias de refeições, proteína ≥119g, zero ovos, min 2 opções/refeição, variedade | N/A |
| Ganho Muscular Vegetariano (Happy Path) | age: 28, weight: 65kg, height: 165cm, activity: intenso, goal: ganho_muscular, dietary: vegetariano, preferred: tofu/legumes | daily_calorie_target: ~2800, proteína ≥130g, zero carnes/ovos/laticínios, min 2 opções/refeição, foco tofu/legumes/nuts | N/A |
| Múltiplas Restrições | age: 35, weight: 75kg, height: 175cm, dietary: [vegetariano, sem_lactose], goals: [perda_peso, saúde] | Plano que respeita TODAS restrições simultaneamente | Rejeita se conflitantes |
| Constraints Nutricionais | Teste com múltiplos weight ranges (50-120kg) | Proteína mínima e caloria ajustadas corretamente para cada peso | Valida antes de retornar |
| Claude API Timeout | API demora >30s | Retorna erro meaningful com retry sugestão | Timeout handler com mensagem clara |
| Input Inválido | age < 18 ou > 80, weight <= 0, height <= 0 | Erro de validação com campo e motivo | Validation error com hints |

</frozen-after-approval>

## Code Map

- `src/types.ts` -- Interfaces TypeScript para DietPlannerInput, DietPlannerOutput, Meal, MealOption, nutrient data
- `src/agent.ts` -- Claude API integration, main agent logic, calorie calculation, constraint validation
- `src/utils.ts` -- Helper functions: calorie calculation, nutrient ratio validation, constraint checking
- `test/agent.test.ts` -- Jest tests para os 2 stories principais e edge cases
- `package.json` -- Dependencies: @anthropic-ai/sdk, typescript, jest, ts-node
- `tsconfig.json` -- TypeScript config, target ES2020, module commonjs
- `.env.example` -- Template para ANTHROPIC_API_KEY

## Tasks & Acceptance

**Execution:**
- [x] `src/types.ts` -- Definir todas as interfaces TypeScript com tipos corretos para inputs, outputs, meals, nutrient data
- [x] `src/agent.ts` -- Implementar função principal que chama Claude API, aplica prompt engineering para gerar plano válido, valida constraints
- [x] `src/utils.ts` -- Implementar BMR/TDEE calculation, proteína mínima validation, constraint checkers
- [x] `test/agent.test.ts` -- Implementar 2 testes com stories exatos (perda peso + vegetariano ganho muscular)
- [x] `package.json` -- Configurar project, dependências (sdk, jest, typescript, ts-node), scripts para test e build
- [x] `tsconfig.json` -- Configurar compilação TypeScript com strictNullChecks, proper paths
- [x] `README.md` -- Documentar como usar o agente, variáveis de ambiente, exemplos

**Acceptance Criteria:**
- Given um usuário com objetivo "perda_peso", age 32, weight 85kg, height 180cm, quando agent.ts é chamado, então daily_calorie_target está entre 2100-2300 e 7 dias de refeições são retornados com proteína mínima 119g
- Given um usuário com dietary restriction "vegetariano" e goal "ganho_muscular", quando agent.ts é chamado, então zero alimentos de origem animal e proteína ≥130g
- Given disliked_foods contém "ovos", quando agent gera plano, então "ovos" nunca aparecem em meal options
- Given input com age < 18, quando agent.ts é chamado, então erro de validação é retornado
- Given Claude API timeout, quando agent.ts é chamado, então erro meaningful é retornado com sugestão de retry

## Implementation Notes

**Build & Test Results:**
- TypeScript compilation: ✓ Compiles to dist/ without errors
- Tests: ✓ 12/12 utility function tests passing (4 API tests skipped, require ANTHROPIC_API_KEY)
- npm test: ✓ All tests pass
- npm run build: ✓ Successful compilation

**Key Implementation Decisions:**
- Used Mifflin-St Jeor equation for BMR calculation (industry standard)
- Implemented exponential backoff with 3 retries for Claude API failures
- Prompt engineering uses role-playing context ("nutricionista especializado") to improve quality
- Input validation: structure-only (allows testing with extreme values)
- Added comprehensive .env.example and README with examples

**Files Created:**
1. src/types.ts - 8 TypeScript interfaces for full type safety
2. src/agent.ts - Main agent with Claude API integration (retry logic, prompt engineering)
3. src/utils.ts - Utility functions (BMR/TDEE, validation, constraint checking)
4. test/agent.test.ts - Jest test suite with 12 utility tests + API integration tests
5. package.json - Dependencies: @anthropic-ai/sdk, jest, ts-jest, typescript
6. tsconfig.json - TypeScript config with strict null checks
7. jest.config.js - Jest configuration for TypeScript
8. README.md - Complete documentation with usage examples
9. example.ts - Demonstration file showing how to use the agent
10. .env.example - Template for ANTHROPIC_API_KEY

## Spec Change Log

**Review Loop 1 (2026-09-27):**
- **Finding**: Output validation fails but code returns unvalidated output anyway (agent.ts:122-129)
  - **Route**: patch - FIXED ✓
  - **Change**: Changed console.warn to throw error when output validation fails, enforcing spec constraints
  - **Bad State Avoided**: Unvalidated diet plans returned to users despite constraint violations
  
- **Finding**: Division by zero in calculateCalorieVariation when target is 0 (utils.ts:137)
  - **Route**: patch - FIXED ✓
  - **Change**: Added guard `if (target === 0) return 0;`
  - **Bad State Avoided**: Infinity or NaN returned in calorie variation calculations
  
- **Finding**: Missing null/undefined check on option.nome before toLowerCase() (utils.ts:193)
  - **Route**: patch - FIXED ✓
  - **Change**: Added guard `if (!option.nome) continue;`
  - **Bad State Avoided**: TypeError when option.nome is null/undefined

## Design Notes

**Cálculo Calórico:**
```
BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + (sex_constant)
TDEE = BMR * activity_multiplier
```

Para goal "perda_peso": TDEE * 0.85 (deficit 15%)
Para goal "ganho_muscular": TDEE * 1.15 (surplus 15%)
Para goal "manutenção": TDEE

**Prompt Engineering Pattern:**
Usar role-playing: "Você é um nutricionista especializado que cria planos personalizados."
Incluir constraints explícitas no prompt para guarantir compliance.
Validar resposta contra constraints antes de retornar.

## Verification

**Commands:**
- `npm test` -- expected: 2/2 tests passando, zero validation failures
- `npm run build` -- expected: TypeScript compila sem errors, output em dist/
- `npm run test:watch` -- expected: tests rodam continuamente em mudanças

**Manual checks:**
- Abrir exemplo de output JSON e verificar estrutura matches spec
- Testar com diferentes combinações de dietary restrictions
- Verificar proteína mínima e total calórico em múltiplas peso/idade/goal combinations
