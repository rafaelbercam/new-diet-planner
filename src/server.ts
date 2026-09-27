import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { generateDietPlan } from './agent';
import { DietPlannerInput } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.post('/api/generate-plan', async (req: Request, res: Response) => {
  try {
    const input: DietPlannerInput = req.body;
    const plan = await generateDietPlan(input);
    res.json(plan);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erro desconhecido' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🍽️  Diet Planner rodando em http://localhost:${PORT}`);
  console.log(`📝 Abra o navegador e acesse: http://localhost:${PORT}`);
});
