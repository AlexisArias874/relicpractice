import { useCallback, useMemo } from 'react';
import type { ExerciseResult, MethodStats } from '../types/exercise';
import { useLocalStorage } from './useLocalStorage';

const KEY = 'relicpractice.history.v1';

export interface StatsSummary {
  completed: number;
  averageScore: number;
  averageSeconds: number;
  accuracy: number;
  byMethod: Record<string, MethodStats>;
  recent: ExerciseResult[];
  commonErrors: Array<{ label: string; count: number }>;
}

export function useStats() {
  const [history, setHistory] = useLocalStorage<ExerciseResult[]>(KEY, []);

  const addResult = useCallback(
    (result: ExerciseResult) => {
      setHistory((previous) => {
        const next = [result, ...previous].slice(0, 100);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          // The in-memory state still works if storage is unavailable.
        }
        return next;
      });
    },
    [setHistory],
  );

  const clearHistory = useCallback(() => {
    try {
      localStorage.setItem(KEY, '[]');
    } catch {
      // Ignore storage failures.
    }
    setHistory([]);
  }, [setHistory]);

  const summary = useMemo<StatsSummary>(() => {
    const completed = history.length;
    const averageScore = completed
      ? Math.round(history.reduce((t, r) => t + r.score, 0) / completed)
      : 0;
    const averageSeconds = completed
      ? Math.round(history.reduce((t, r) => t + r.timeSeconds, 0) / completed)
      : 0;
    const totalSteps = history.reduce((t, r) => t + r.steps.length, 0);
    const correctSteps = history.reduce(
      (t, r) => t + r.steps.filter((s) => s.correct).length,
      0,
    );
    const accuracy = totalSteps ? Math.round((correctSteps / totalSteps) * 100) : 0;
    const byMethod: Record<string, MethodStats> = {};
    for (const result of history) {
      const current = byMethod[result.method] ?? {
        attempts: 0,
        totalScore: 0,
        totalSeconds: 0,
        bestScore: 0,
      };
      current.attempts += 1;
      current.totalScore += result.score;
      current.totalSeconds += result.timeSeconds;
      current.bestScore = Math.max(current.bestScore, result.score);
      byMethod[result.method] = current;
    }
    const errorCounts = new Map<string, number>();
    for (const result of history) {
      for (const step of result.steps) {
        if (!step.correct) {
          const label = step.errorType ?? 'otro';
          errorCounts.set(label, (errorCounts.get(label) ?? 0) + 1);
        }
      }
    }
    const labels: Record<string, string> = {
      arithmetic: 'Errores aritméticos',
      method: 'Decisiones metodológicas',
      'invalid-assignment': 'Asignaciones inválidas',
      incomplete: 'Procedimientos incompletos',
      alternative: 'Soluciones alternativas',
      otro: 'Otros',
    };
    const commonErrors = [...errorCounts.entries()]
      .map(([label, count]) => ({ label: labels[label] ?? label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return {
      completed,
      averageScore,
      averageSeconds,
      accuracy,
      byMethod,
      recent: history.slice(0, 8),
      commonErrors,
    };
  }, [history]);

  return { history, addResult, clearHistory, summary };
}
