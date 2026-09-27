# Diet Planner Agent

Um agente TypeScript que utiliza Claude API para gerar planos de dieta personalizados de 7 dias, considerando características físicas, objetivos de fitness e restrições alimentares.

## Características

- **Cálculo Nutricional Preciso**: Calcula BMR e TDEE personalizados usando a equação Mifflin-St Jeor
- **Restrições Alimentares**: Suporta vegetariano, vegano, sem gluten, sem lactose e ceto
- **Múltiplos Objetivos**: Perda de peso, ganho muscular, manutenção e saúde
- **Planos Variados**: Gera 7 dias com no mínimo 2 opções por refeição
- **Validação Robusta**: Valida entrada e saída contra constraints nutricionais
- **Retry Automático**: Implementa exponential backoff para lidar com rate limits da API

## Instalação

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Configure a variável de ambiente:

```bash
cp .env.example .env
# Edite .env e adicione sua ANTHROPIC_API_KEY
```

## Uso

### Como Biblioteca TypeScript

```typescript
import { generateDietPlan } from './src/agent';
import { DietPlannerInput } from './src/types';

const input: DietPlannerInput = {
  age: 32,
  weight_kg: 85,
  height_cm: 180,
  sex: 'masculino',
  activity_level: 'moderado',
  fitness_goals: ['perda_peso'],
  dietary_restrictions: [],
  preferred_foods: ['frango', 'arroz integral'],
  disliked_foods: ['ovos'],
};

const plan = await generateDietPlan(input);
console.log(JSON.stringify(plan, null, 2));
```

### Inputs Suportados

#### DietPlannerInput

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|-----------|
| age | number | Sim | Idade (18-80 anos) |
| weight_kg | number | Sim | Peso em kg (> 0) |
| height_cm | number | Sim | Altura em cm (> 0) |
| sex | 'masculino' \| 'feminino' | Não | Sexo (padrão: masculino) |
| activity_level | ActivityLevel | Sim | Nível de atividade: sedentário, leve, moderado, intenso, muito_intenso |
| fitness_goals | FitnessGoal[] | Sim | Objetivos: perda_peso, ganho_muscular, manutenção, saúde |
| dietary_restrictions | DietaryRestriction[] | Não | Restrições: vegetariano, vegano, sem_gluten, sem_lactose, ceto |
| preferred_foods | string[] | Não | Alimentos preferidos para incluir no plano |
| disliked_foods | string[] | Não | Alimentos que NÃO podem aparecer |

### Output

A função retorna um `DietPlannerOutput` contendo:

```typescript
{
  usuario: {
    idade: number,
    peso_kg: number,
    altura_cm: number,
    sexo: Sex,
    nivel_atividade: ActivityLevel,
    objetivos: FitnessGoal[],
    restricoes_alimentares: DietaryRestriction[]
  },
  plano_nutricional: {
    bmr: number,           // Taxa metabólica basal
    tdee: number,          // Gasto energético total
    calorias_diarias_alvo: number,
    proteina_minima_diaria_g: number
  },
  plano_7_dias: DayPlan[],  // 7 dias com refeições e opções
  resumo: {
    calorias_totais_semana: number,
    proteina_total_semana_g: number,
    variacao_caloria_percentual: number
  }
}
```

## Cálculos Nutricionais

### BMR (Basal Metabolic Rate)
Utiliza a equação Mifflin-St Jeor:
```
BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + sex_constant
```

### TDEE (Total Daily Energy Expenditure)
```
TDEE = BMR * activity_multiplier
```

### Calorias Diárias por Objetivo
- **Perda de Peso**: TDEE * 0.85 (deficit 15%)
- **Ganho Muscular**: TDEE * 1.15 (surplus 15%)
- **Manutenção/Saúde**: TDEE

### Proteína Mínima
- **Ganho Muscular**: 2.0g/kg
- **Perda de Peso**: 1.4g/kg
- **Outro**: 1.2g/kg

## Constraints Garantidos

- ✅ Calorias diárias dentro de ±5% do alvo
- ✅ Proteína mínima atendida diariamente
- ✅ Nenhum alimento disliked nos planos
- ✅ Todas as restrições alimentares respeitadas
- ✅ Mínimo 2 opções por refeição
- ✅ 7 dias de plano com variedade de alimentos
- ✅ Resposta em português com estrutura JSON válida

## Scripts NPM

```bash
# Compilar TypeScript
npm run build

# Executar testes
npm test

# Executar testes em modo watch
npm run test:watch

# Iniciar a aplicação
npm start
```

## Testes

O projeto inclui testes para:

1. **Funções Utilitárias**: Validação de cálculos nutricionais
2. **Testes de API** (requer ANTHROPIC_API_KEY):
   - Story 1: Perda de peso (32 anos, 85kg, 180cm)
   - Story 2: Ganho muscular vegetariano (28 anos, 65kg, 165cm)
3. **Edge Cases**: Múltiplas restrições, diferentes ranges de peso

Execute os testes com:
```bash
npm test
```

## Tratamento de Erros

A API implementa retry automático com exponential backoff:
- Máximo de 3 tentativas
- Backoff inicial: 1000ms
- Multiplicador exponencial: 2x

Erros de timeout retornam mensagem clara com sugestão de retry.

## Estrutura do Projeto

```
.
├── src/
│   ├── types.ts          # Interfaces TypeScript
│   ├── agent.ts          # Lógica principal e integração com Claude API
│   └── utils.ts          # Funções utilitárias
├── test/
│   └── agent.test.ts     # Testes Jest
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
└── README.md
```

## Versão do Modelo

Utiliza **Claude 3.5 Sonnet** (claude-3-5-sonnet-20241022)

## Requisitos

- Node.js 16+
- npm ou yarn
- Chave API Anthropic (ANTHROPIC_API_KEY)

## Licença

Este projeto faz parte do sistema de planejamento de dieta personalizado.
