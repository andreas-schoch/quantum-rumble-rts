interface Neighbor {
    node: GraphNode;
    euclideanDistance: number;
  }

class GraphNode {
  x: number;
  y: number;
  neighbors: Neighbor[];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.neighbors = [];
  }

  addNeighbor(node: GraphNode): void {
    const euclideanDistance = Math.sqrt(Math.pow(this.x - node.x, 2) + Math.pow(this.y - node.y, 2));
    this.neighbors.push({ node, euclideanDistance });
  }

  isWithinRadius(node: GraphNode, radius: number): boolean {
    const manhattanDistance = Math.abs(this.x - node.x) + Math.abs(this.y - node.y);
    return manhattanDistance <= radius;
  }
}

export class Graph {
  nodes: GraphNode[];

  constructor() {
    this.nodes = [];
  }

  addNode(x: number, y: number, radius: number): void {
    const newNode = new GraphNode(x, y);
    this.nodes.forEach((node) => {
      if (newNode.isWithinRadius(node, radius)) {
        newNode.addNeighbor(node);
        node.addNeighbor(newNode);
      }
    });
    this.nodes.push(newNode);
  }

  getNode(x: number, y: number): GraphNode | undefined {
    return this.nodes.find((node) => node.x === x && node.y === y);
  }

  removeNode(x: number, y: number): void {
    const index = this.nodes.findIndex((node) => node.x === x && node.y === y);
    if (index !== -1) {
      const [removedNode] = this.nodes.splice(index, 1);
      this.nodes.forEach((node) => {
        node.neighbors = node.neighbors.filter((neighbor) => neighbor.node !== removedNode);
      });
    }
  }
}
