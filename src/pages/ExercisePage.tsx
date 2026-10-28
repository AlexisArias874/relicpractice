import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { StepResult } from '../types';
import { buildExerciseResult, createExercise } from '../engine/exerciseFactory';
import { useExerciseSession } from '../state/ExerciseSession';
import { useStats } from '../hooks/useStats';
import { TransportWorkspace } from '../components/workspace/TransportWorkspace';
import { HungarianWorkspace } from '../components/workspace/HungarianWorkspace';

export function ExercisePage() {
  const { exercise, setExercise, setResult } = useExerciseSession();
  const { addResult } = useStats();
  const navigate = useNavigate();
  const [sessionKey, setSessionKey] = useState(0);
  const [startedAt, setStartedAt] = useState(() => {
    if (!exercise) return Date.now();
    try {
      const raw = localStorage.getItem(`relicpractice.started.${exercise.id}`);
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
    } catch {
      return Date.now();
    }
  });

  useEffect(() => {
    if (!exercise) return;
    try {
      localStorage.setItem(`relicpractice.started.${exercise.id}`, String(startedAt));
    } catch {
      // Ignore storage failures.
    }
  }, [exercise, startedAt]);

  const config = useMemo(() => {
    if (!exercise) return null;
    return {
      category: exercise.category,
      method: exercise.method,
      difficulty: exercise.difficulty,
      mode: exercise.mode,
      rows: exercise.transportation
        ? exercise.transportation.costs.length
        : exercise.assignment!.values.length,
      cols: exercise.transportation
        ? exercise.transportation.costs[0].length
        : exercise.assignment!.values.length,
    };
  }, [exercise]);

  if (!exercise) return <Navigate to="/practicar" replace />;

  const clearStarted = (id: string) => {
    try {
      localStorage.removeItem(`relicpractice.started.${id}`);
    } catch {
      // Ignore storage failures.
    }
  };

  const finish = (steps: StepResult[], totalValue: number, totalLabel: string) => {
    const result = buildExerciseResult({
      exercise,
      steps,
      totalValue,
      totalLabel,
      timeSeconds: Math.max(1, Math.floor((Date.now() - startedAt) / 1000)),
    });
    clearStarted(exercise.id);
    addResult(result);
    setResult(result);
    navigate('/resultados');
  };

  const restart = () => {
    if (!config) return;
    try {
      const next = createExercise(config);
      clearStarted(exercise.id);
      setExercise(next);
      setStartedAt(Date.now());
      setSessionKey((value) => value + 1);
    } catch {
      setStartedAt(Date.now());
      setSessionKey((value) => value + 1);
    }
  };

  return (
    <div key={`${exercise.id}-${sessionKey}`}>
      {exercise.category === 'transportation' ? (
        <TransportWorkspace
          exercise={exercise}
          startedAt={startedAt}
          onFinish={finish}
          onRestart={restart}
        />
      ) : (
        <HungarianWorkspace
          exercise={exercise}
          startedAt={startedAt}
          onFinish={finish}
          onRestart={restart}
        />
      )}
    </div>
  );
}
