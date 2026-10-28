/**
 * Minimum-cost transportation value, solved independently of the greedy
 * construction methods. Successive shortest augmenting paths on a residual
 * network with SPFA, valid with negative residual arcs.
 *
 * Used only to check whether an initial solution is also optimal; the training
 * flow never presents it before the exercise is finished.
 */
export function optimalTransportCost(
  costs: number[][],
  supply: number[],
  demand: number[],
): number {
  const m = costs.length;
  const n = costs[0].length;
  const source = 0;
  const rowStart = 1;
  const colStart = rowStart + m;
  const sink = colStart + n;
  const N = sink + 1;

  interface Edge {
    to: number;
    cap: number;
    cost: number;
    rev: number;
  }
  const graph: Edge[][] = Array.from({ length: N }, () => []);
  const addEdge = (from: number, to: number, cap: number, cost: number) => {
    graph[from].push({ to, cap, cost, rev: graph[to].length });
    graph[to].push({ to: from, cap: 0, cost: -cost, rev: graph[from].length - 1 });
  };

  const totalSupply = supply.reduce((a, b) => a + b, 0);
  for (let r = 0; r < m; r++) addEdge(source, rowStart + r, supply[r], 0);
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      addEdge(rowStart + r, colStart + c, Math.min(supply[r], demand[c]), costs[r][c]);
    }
  }
  for (let c = 0; c < n; c++) addEdge(colStart + c, sink, demand[c], 0);

  let flow = 0;
  let cost = 0;
  while (flow < totalSupply) {
    const dist = Array<number>(N).fill(Infinity);
    const inQueue = Array<boolean>(N).fill(false);
    const prevNode = Array<number>(N).fill(-1);
    const prevEdge = Array<number>(N).fill(-1);
    dist[source] = 0;
    const queue: number[] = [source];
    inQueue[source] = true;
    while (queue.length) {
      const u = queue.shift()!;
      inQueue[u] = false;
      for (let i = 0; i < graph[u].length; i++) {
        const e = graph[u][i];
        if (e.cap <= 0) continue;
        if (dist[u] + e.cost < dist[e.to] - 1e-9) {
          dist[e.to] = dist[u] + e.cost;
          prevNode[e.to] = u;
          prevEdge[e.to] = i;
          if (!inQueue[e.to]) {
            queue.push(e.to);
            inQueue[e.to] = true;
          }
        }
      }
    }
    if (prevNode[sink] === -1) break;
    let push = totalSupply - flow;
    for (let v = sink; v !== source; v = prevNode[v]) {
      push = Math.min(push, graph[prevNode[v]][prevEdge[v]].cap);
    }
    for (let v = sink; v !== source; v = prevNode[v]) {
      const e = graph[prevNode[v]][prevEdge[v]];
      e.cap -= push;
      graph[v][e.rev].cap += push;
      cost += push * e.cost;
    }
    flow += push;
  }
  if (flow !== totalSupply) {
    throw new Error('No se pudo resolver el problema de transporte balanceado.');
  }
  return cost;
}
