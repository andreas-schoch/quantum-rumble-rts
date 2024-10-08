export type EdgeId = string;
export type VertexId = string;

export interface Edge<T = unknown> {
  id: EdgeId;
  vertA: VertexId;
  vertB: VertexId;
  weight: number;
  data: T;
}

export interface Vertex<T = unknown> {
  x: number;
  y: number;
  id: VertexId;
  data: T;
}

export interface PathfinderResult<V = unknown> {
  distance: number;
  path: Vertex<V>[];
  ids: Set<VertexId>;
  found: boolean;
}

export type Heuristic = 'euclidian' | 'manhattan' | 'chebyshev' | 'octile';

// Custom Graph implementation loosely based on "graph-typed" interface (npm package)
// TODO remove debugging code and write unit tests
export class Graph<V = {x: number, y: number}, E = unknown> {
  readonly vertices: Map<string, Vertex<V>> = new Map();
  readonly edges: Map<string, Edge<E>> = new Map();
  readonly edgesByVertex: Map<string, Edge<E>[]> = new Map();
  private NOT_FOUND: PathfinderResult<V> = {distance: Infinity, path: [], ids: new Set(), found: false};

  private readonly heuristics: {[key in Heuristic]: (a: Vertex<V>, b: Vertex<V>) => number }= {
    euclidian: this.heuristicEuclidian,
    manhattan: this.heuristicManhattan,
    chebyshev: this.heuristicChebyshev,
    octile: this.heuristicOctile,
  };

  createVertex(id: VertexId, x: number, y: number, value: V): Vertex<V> {
    if (this.vertices.has(id)) throw new Error(`Vertex with id ${id} already exists`);
    const vertex: Vertex<V> = { id: id, data: value, x, y};
    this.vertices.set(id, vertex);
    this.edgesByVertex.set(id, []);
    return vertex;
  }

  removeVertex(id: VertexId): boolean {
    const deleted = this.vertices.delete(id);
    if (!deleted) return false;
    const edges = this.edgesByVertex.get(id);
    this.edgesByVertex.delete(id);
    if (!edges) return true;
    edges.forEach(edge => {
      const otherVertId = edge.vertA === id ? edge.vertB : edge.vertA;
      // remove the edge from the other vertex map as well
      const filtered = this.edgesByVertex.get(otherVertId)?.filter(e => e.id !== edge.id) || [];
      this.edgesByVertex.set(otherVertId, filtered);
      this.edges.delete(edge.id);
    });

    return true;
  }

  removeAllVertices(): boolean {
    let success = true;
    this.vertices.forEach(vertex => {
      const deleted = this.removeVertex(vertex.id);
      if (!deleted) success = false;
    });
    return success && this.vertices.size === 0 && this.edges.size === 0;
  }

  getNeighbourVertices(id: VertexId): Vertex['id'][] {
    const edges = this.edgesByVertex.get(id);
    if (!edges) return [];
    const neighbours: Vertex['id'][] = [];
    edges.forEach(edge => {
      const neighbourId = edge.vertA === id ? edge.vertB : edge.vertA;
      const vert = this.vertices.get(neighbourId);
      if (vert) neighbours.push(vert.id);
    });
    return neighbours;
  }

  createEdge(v1: VertexId, v2: VertexId, weight: number, data: E): Edge<E> {
    const edge = { id: v1 + v2, vertA: v1, vertB: v2, weight, data };
    this.edges.set(edge.id, edge);
    this.edgesByVertex.get(v1)?.push(edge);
    this.edgesByVertex.get(v2)?.push(edge);
    return edge;
  }

  getEdgeBetween(v1: VertexId, v2: VertexId): Edge<E> | null {
    return this.edges.get(v1 + v2) || this.edges.get(v2 + v1) || null;
  }

  removeEdgeBetween(v1: VertexId, v2: VertexId): Edge<E> | null {
    const edge = this.getEdgeBetween(v1, v2);
    if (!edge) return null;
    this.edges.delete(edge.id);
    this.edgesByVertex.get(v1)?.filter(e => e.id !== edge.id);
    this.edgesByVertex.get(v2)?.filter(e => e.id !== edge.id);
    return edge;
  }

  removeEdge(id: EdgeId): Edge<E> | null {
    const edgeToRemove = this.edges.get(id);
    if (!edgeToRemove) return null;
    this.edges.delete(id);
    this.edgesByVertex.get(edgeToRemove.vertA)?.filter(e => e.id !== id);
    this.edgesByVertex.get(edgeToRemove.vertB)?.filter(e => e.id !== id);
    return edgeToRemove;
  }

  // Sort of an A* implementation. Naming based on wikipedia pseudo code https://en.wikipedia.org/wiki/A*_search_algorithm
  // TODO remove debugging code
  findPath(startId: VertexId, endId: VertexId, heuristic: Heuristic = 'euclidian',  g: Phaser.GameObjects.Graphics | null = null): PathfinderResult<V> {
    const start = this.vertices.get(startId);
    const goal = this.vertices.get(endId);
    if (!goal || !start) return this.NOT_FOUND;
    if (this.edgesByVertex.get(startId)?.length === 0 || this.edgesByVertex.get(endId)?.length === 0) return this.NOT_FOUND;

    const openSet: { value: Vertex<V>, fScore: number }[] = [];
    const closedSet: Set<Vertex<V>> = new Set();
    const cameFrom: Map<Vertex<V>, Vertex<V>> = new Map();
    const gScore: Map<Vertex<V>, number> = new Map();

    gScore.set(start, 0);
    openSet.push({ value: start, fScore: this.heuristics[heuristic](start, goal) });

    let needsSorting = false;
    while (openSet.length) {
      const current = openSet.pop()!.value;
      g && g.fillCircle(current.x, current.y, 20);
      if (current.id === endId) break;
      needsSorting = false;

      const currentEdges = this.edgesByVertex.get(current.id) || [];
      for (const edge of currentEdges) {
        const neighbour = this.vertices.get(edge.vertA === current.id ? edge.vertB : edge.vertA)!;
        const tentativeGScore = (gScore.get(current) || 0) + edge.weight;

        if (tentativeGScore < (gScore.get(neighbour) || Infinity)) {
          cameFrom.set(neighbour, current);
          gScore.set(neighbour, tentativeGScore);
          if (!closedSet.has(neighbour)) {
            // tiebreaker prevents visits to unneeded vertices but sacrifices a bit of accuracy
            const tiebreaker = 0.275 * (goal.x - current.x + goal.y - current.y); // adjust the hard-coded constant to change the accuracy
            if (!neighbour || !goal) continue; // In case the vertices were destroyed while pathfinding
            openSet.push({ value: neighbour, fScore: tentativeGScore + this.heuristics[heuristic](neighbour, goal) + tiebreaker});
            needsSorting = true;
          }
          closedSet.add(neighbour);
        }
      }
      if (needsSorting) openSet.sort((a, b) => b.fScore - a.fScore);
    }

    // Extract the shortest path from startId to endId using the previous map
    const path: Vertex<V>[] = [];
    const ids = new Set<VertexId>();
    let current = goal;
    while (current && current.id !== startId) {
      if (!cameFrom.get(current)) return this.NOT_FOUND; // No path found
      path.push(current);
      ids.add(current.id);
      current = cameFrom.get(current)!;
    }
    path.push(start);
    path.reverse();

    const distance = gScore.get(goal);
    return distance ? {distance, path, ids, found: true} : this.NOT_FOUND;
  }

  private heuristicEuclidian(a: Vertex<V>, b: Vertex<V>): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  private heuristicManhattan(a: Vertex<V>, b: Vertex<V>): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private heuristicChebyshev(a: Vertex<V>, b: Vertex<V>): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  private heuristicOctile(a: Vertex<V>, b: Vertex<V>): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  }
}
