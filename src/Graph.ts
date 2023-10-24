type EdgeId = string;
type VertexId = string;

interface Edge<T = unknown> {
  id: EdgeId;
  vertA: VertexId;
  vertB: VertexId;
  weight: number;
  data: T;
}

interface Vertex<T = unknown> {
  x: number;
  y: number;
  id: VertexId;
  data: T;
}

interface DijkstraResult<V = unknown> {
  distance: number;
  path: Vertex<V>[];
  found: boolean;
}

// Custom Graph implementation loosely based on "graph-typed" interface (npm package)
// TODO write unit tests
export class Graph<V = {x: number, y: number}, E = unknown> {
  readonly vertices: Map<string, Vertex<V>> = new Map();
  readonly edges: Map<string, Edge<E>> = new Map();
  readonly edgesByVertex: Map<string, Edge<E>[]> = new Map();

  createVertex(id: VertexId, x: number, y: number, value: V): Vertex<V> {
    if (this.vertices.has(id)) throw new Error(`Vertex with id ${id} already exists`);
    const vertex = { id: id, data: value, x, y};
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
    edges.forEach(edge => this.edges.delete(edge.id));
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

  getNeighbourVertices(id: VertexId): Vertex<V>[] {
    const edges = this.edgesByVertex.get(id);
    if (!edges) return [];
    const neighbours: Vertex<V>[] = [];
    edges.forEach(edge => {
      const neighbourId = edge.vertA === id ? edge.vertB : edge.vertA;
      const vert = this.vertices.get(neighbourId);
      if (vert) neighbours.push(vert);
    });
    return neighbours;
  }

  ///////////////////////////////////////////////////////////

  createEdge(v1: VertexId, v2: VertexId, weight: number, data: E): Edge<E> {
    const edge = { id: `${v1}-${v2}`, vertA: v1, vertB: v2, weight, data };
    this.edges.set(edge.id, edge);
    this.edgesByVertex.get(v1)?.push(edge);
    this.edgesByVertex.get(v2)?.push(edge);
    return edge;
  }

  getEdgeBetween(v1: VertexId, v2: VertexId): Edge<E> | null {
    // This is a bit of a hack, but it should work as long as unique ids are enforced
    return this.edges.get(`${v1}-${v2}`) || this.edges.get(`${v2}-${v1}`) || null;
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

  // Sort of an A* implementation
  getShortestPath(startId: VertexId, endId: VertexId): DijkstraResult<V> {
    console.time('getShortestPath');
    const startVertex = this.vertices.get(startId);
    const endVertex = this.vertices.get(endId);
    if (!endVertex || !startVertex) return {distance: Infinity, path: [], found: false};

    const distances: { [key: string]: number } = {};
    const previous: { [key: string]: Vertex<V> | null } = {};
    distances[startId] = 0;

    const items: { value: Vertex<V>, priority: number }[] = [];
    let needsSorting = false;
    items.push({ value: startVertex, priority: 0 });
    while (items.length) {
      const currentVertex = items.pop()!.value;
      if (currentVertex.id === endId) break; // Stop if the end vertex is reached

      needsSorting = false;
      const currentEdges = this.edgesByVertex.get(currentVertex.id) || [];
      for (const edge of currentEdges) {
        const adjacentVertexId = edge.vertA === currentVertex.id ? edge.vertB : edge.vertA;
        const newDistance = distances[currentVertex.id] + edge.weight;

        if (newDistance < (distances[adjacentVertexId] || Infinity)) {
          distances[adjacentVertexId] = newDistance;
          previous[adjacentVertexId] = currentVertex;
          const adjacentVertex = this.vertices.get(adjacentVertexId)!;
          const heuristicCost = Math.sqrt(Math.pow(adjacentVertex.x - endVertex.x, 2) + Math.pow(adjacentVertex.y - endVertex.y, 2));
          items.push({ value: adjacentVertex, priority: newDistance + heuristicCost});
          needsSorting = true;
        }
      }
      needsSorting && items.sort((a, b) => b.priority - a.priority);
    }

    // Extract the shortest path from startId to endId using the previous map
    const path: Vertex<V>[] = [];
    let current = endVertex;
    while (current && current.id !== startId) {
      if (previous[current.id] === null) return {distance: Infinity, path: [], found: false}; // No path found
      path.push(current);
      current = previous[current.id]!;
    }
    path.push(startVertex);
    path.reverse();

    const distance = distances[endId];
    console.timeEnd('getShortestPath');
    return distance ? {distance, path, found: true} : {distance: Infinity, path: [], found: false};
  }
}
