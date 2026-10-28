import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { Exercise, ExerciseResult } from '../types/exercise';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SessionValue {
  exercise: Exercise | null;
  result: ExerciseResult | null;
  setExercise: (exercise: Exercise | null) => void;
  setResult: (result: ExerciseResult | null) => void;
  clear: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function ExerciseSessionProvider({ children }: { children: ReactNode }) {
  const [exercise, setExerciseStored] = useLocalStorage<Exercise | null>(
    'relicpractice.active-exercise.v1',
    null,
  );
  const [result, setResultStored] = useLocalStorage<ExerciseResult | null>(
    'relicpractice.active-result.v1',
    null,
  );

  const setExercise = useCallback(
    (next: Exercise | null) => {
      setExerciseStored(next);
      if (next) setResultStored(null);
    },
    [setExerciseStored, setResultStored],
  );
  const setResult = useCallback(
    (next: ExerciseResult | null) => setResultStored(next),
    [setResultStored],
  );
  const clear = useCallback(() => {
    setExerciseStored(null);
    setResultStored(null);
  }, [setExerciseStored, setResultStored]);

  const value = useMemo(
    () => ({ exercise, result, setExercise, setResult, clear }),
    [exercise, result, setExercise, setResult, clear],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useExerciseSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useExerciseSession debe usarse dentro de ExerciseSessionProvider');
  }
  return context;
}
