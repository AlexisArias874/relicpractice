# RelicPractice

Entrenador web interactivo para practicar **métodos de transporte** y **asignación** de Investigación de Operaciones. Genera ejercicios válidos, calcula una solución de referencia verificada y evalúa el procedimiento del estudiante paso a paso, no solo el resultado final.

La aplicación funciona completamente en el navegador: no requiere API, IA, cuentas ni servicios de pago.

## Puesta en marcha

```bash
npm install
npm run dev        # servidor de desarrollo Vite
npm run build      # comprobación TypeScript + build de producción
npm run preview    # sirve el build de producción
npm test           # pruebas automatizadas con Vitest
```

Requiere Node.js 20 o superior. El resultado de producción queda en `dist/`.

## Métodos implementados

| Categoría | Método | Flujo |
| --- | --- | --- |
| Transporte | Esquina noroeste | Asignación guiada desde la esquina superior izquierda, saldos en vivo, costo inicial y degeneración. |
| Transporte | Costo mínimo | Selección de la celda de menor costo disponible, saturación máxima y actualización de oferta/demanda. |
| Transporte | Vogel | Penalizaciones editables, elección de línea, elección de celda, cantidad y actualización por iteración. |
| Asignación | Húngaro min | Transformación/reducción por filas y columnas, cobertura mínima de ceros, ajustes y asignación final. |
| Asignación | Húngaro max | Transformación `máximo global − beneficio`, procedimiento húngaro completo y beneficio calculado con la matriz original. |

### Modos

- **Entrenamiento:** valida cada paso, explica errores aritméticos/metodológicos, permite corregir, ofrece pistas y la solución explicada. Solo registra los pasos finalmente correctos.
- **Examen:** oculta pistas y correcciones, registra el tiempo, permite entregar en cualquier momento y califica al final. El resultado muestra cada paso y la solución de referencia.

### Pantallas

1. Inicio con resumen de progreso y acceso a métodos.
2. Configuración: categoría, método, dificultad, dimensiones, modo y semilla opcional.
3. Resolución: cuadrícula editable, saldos, bloqueos, etapa actual, progreso, pistas, reinicio y entrega.
4. Resultados: puntuación ponderada, tiempo, comparación paso a paso, solución de referencia, costo/beneficio y acciones.
5. Estadísticas: ejercicios, puntuación media, acierto por paso, tiempo medio, rendimiento por método, errores frecuentes e historial.

## Reglas matemáticas y de evaluación

### Transporte

- Instancias balanceadas: `Σ oferta = Σ demanda`. Dimensiones 3×3 a 6×6.
- Todas las cantidades son enteras y positivas. La interfaz impide valores negativos y limita la cantidad al mínimo entre oferta y demanda restantes.
- **Costo mínimo:** política de asignación máxima (`min(oferta, demanda)`). La referencia usa el menor índice fila/columna en empates, pero el evaluador acepta **cualquier celda elegible de costo mínimo**. Una cantidad parcial se considera error aritmético.
- **Vogel:** penalización = diferencia entre los dos menores costos elegibles de la línea. Si solo hay un costo elegible, la penalización es ese costo. La referencia desempata filas antes que columnas y por índice; el evaluador acepta **cualquier línea de penalización máxima** y **cualquier celda de costo mínimo** dentro de la línea elegida.
- Las filas/columnas satisfechas se bloquean y las asignaciones simultáneas se manejan dejando ambos saldos en cero.
- Se detecta degeneración cuando hay menos de `m + n − 1` asignaciones positivas.
- El costo de la solución inicial usa la matriz original. El costo óptimo se calcula de forma independiente con un flujo de costo mínimo (SSP/SPFA) y **no se afirma que la solución inicial sea óptima** salvo que coincida con ese valor verificado.

### Asignación

- Matrices cuadradas 3×3 a 6×6 con valores enteros positivos.
- Reducciones por filas y columnas deterministas.
- Cobertura de ceros: se acepta cualquier cobertura de tamaño mínimo; se calcula con emparejamiento bipartito máximo y el teorema de König.
- El ajuste se valida contra **la cobertura elegida por el estudiante**, por lo que coberturas mínimas alternativas producen ajustes alternativos válidos.
- La asignación final debe ser independiente (una por fila y columna), usar ceros de la matriz de trabajo y alcanzar el óptimo. La optimalidad se verifica por enumeración exhaustiva de las `n!` asignaciones (máximo 720 para 6×6), independientemente del algoritmo húngaro.
- **Maximización:** se acepta la transformación `máximo global − beneficio`. El beneficio final se calcula exclusivamente con la matriz original. Cualquier asignación óptima alternativa es aceptada.
- Los valores originales y la matriz de trabajo se mantienen separados y visibles.

### Puntuación

La nota es el porcentaje de peso conseguido sobre los pesos de los pasos registrados. Los pesos distinguen selección de línea/celda, penalizaciones, reducciones, coberturas, ajustes, cantidades, asignación y costo/beneficio final. La puntuación es determinista para una secuencia de pasos dada.

## Generación y reproducibilidad

- PRNG determinista Mulberry32. La semilla se muestra y se guarda en cada ejercicio.
- La misma semilla + método + dificultad + dimensiones reproduce el enunciado.
- Cada instancia se valida antes de mostrarse: dimensiones, positividad, balance, no trivialidad y optimalidad de la referencia cuando corresponde.
- Dificultad:
  - **Fácil:** valores holgados, dimensión sugerida 3, se favorecen óptimos únicos en asignación.
  - **Intermedio:** más empates y decisiones menos evidentes.
  - **Difícil:** muchos empates, búsqueda de degeneración en transporte y de óptimos alternativos en asignación.
- Las soluciones de referencia se calculan al crear el ejercicio. La interfaz de práctica no las muestra hasta que el usuario pide la solución o finaliza.
- Reiniciar genera un ejercicio nuevo con la misma configuración y limpia los avances del anterior.

## Arquitectura

```text
src/
  components/
    common/        Button, Badge, Card, Feedback, ProgressBar…
    grid/          TransportGrid, MatrixGrid
    layout/        AppShell
    workspace/     TransportWorkspace, HungarianWorkspace, ExerciseHeader
  constants/       Etiquetas y metadatos de métodos
  engine/          exerciseFactory, buildExerciseResult
  hooks/           useLocalStorage, useStats, useElapsed, useDraft
  lib/             Stub/documentación de Supabase futura
  modules/
    transportation/ common, northwest, leastCost, vogel, generator, optimal
    assignment/     hungarian, validator, generator
  pages/            Home, MethodSelection, Exercise, Results, Statistics
  state/            ExerciseSession (ejercicio/resultado activo)
  types/            Tipos de dominio separados de React
  utils/            PRNG, matrices, formato
```

Los algoritmos y generadores no importan React. La interfaz consume funciones puras y guarda el estado de práctica localmente.

## Persistencia local

- `relicpractice.history.v1`: historial de resultados y estadísticas.
- `relicpractice.prefs.v1`: última configuración de práctica.
- `relicpractice.active-exercise.v1` y `relicpractice.active-result.v1`: sesión y resultado activos.
- `relicpractice.started.<id>`: marca de tiempo de inicio, para conservar el cronómetro al recargar.
- `relicpractice.draft.transport.<id>` y `relicpractice.draft.assignment.<id>`: borrador exacto del ejercicio en curso (cuadrícula, etapa, penalizaciones, cobertura, ajustes, pasos registrados, pistas y entradas pendientes). Al recargar se reanuda en el mismo punto; al finalizar o reiniciar se descarta.

Todo se guarda en LocalStorage. No se envía información a servidores.

## Pruebas

`npm test` cubre, entre otros:

- generadores válidos, balanceados, deterministas y no triviales;
- casos conocidos de esquina noroeste, costo mínimo y Vogel;
- conservación de oferta/demanda y costo calculado con la matriz original;
- penalizaciones, empates de línea y convención de una sola celda elegible;
- reducciones, cobertura mínima, ajuste y asignación húngara;
- optimalidad independiente por flujo de costo mínimo y enumeración;
- aceptación de soluciones alternativas válidas y rechazo de asignaciones factibles no óptimas;
- transformación de maximización y beneficio con la matriz original;
- puntuación reproducible, referencias ocultas en la instancia pública y nuevos IDs al reiniciar;
- serialización versionada de borradores, rechazo de versiones/JSON inválidos y claves separadas por categoría.

## Estado de la entrega

### Implementado

- Los cinco modos completos con cuadrículas interactivas y flujo por etapas.
- Generadores, validadores, referencias y verificadores independientes.
- Reglas de desempate documentadas y aceptación de alternativas válidas.
- Modo entrenamiento, modo examen, pistas, cronómetro y puntuación ponderada.
- Resultados comparativos, solución explicada y estadísticas locales.
- Reanudación exacta del ejercicio y del cronómetro tras recargar la página.
- Pruebas automatizadas y build de producción.

### Pendiente / ampliaciones futuras

- Problemas de transporte no balanceados y métodos de mejora posteriores (MODI).
- Entrada manual de matrices por el usuario (hoy se generan automáticamente).
- Sincronización con Supabase, cuentas y estadísticas multidispositivo.
- Exportación de resultados (CSV/PDF) y modo aula.
