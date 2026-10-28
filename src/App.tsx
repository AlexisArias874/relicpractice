import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ExerciseSessionProvider } from './state/ExerciseSession';
import { HomePage } from './pages/HomePage';
import { MethodSelectionPage } from './pages/MethodSelectionPage';
import { ExercisePage } from './pages/ExercisePage';
import { ResultsPage } from './pages/ResultsPage';
import { StatisticsPage } from './pages/StatisticsPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ExerciseSessionProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="practicar" element={<MethodSelectionPage />} />
            <Route path="ejercicio" element={<ExercisePage />} />
            <Route path="resultados" element={<ResultsPage />} />
            <Route path="estadisticas" element={<StatisticsPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </ExerciseSessionProvider>
    </BrowserRouter>
  );
}
