import { GRID, TICK_DELTA } from './constants';

export class EmitterManager {
  scene: Phaser.Scene;
  emitters: Emitter[] = [];
  onemit: (xCoord: number, yCoord: number, amount: number, pattern: number[][]) => void = () => {}; // to be implemented by whoever uses this class
  private readonly defaultEmitPattern = [[0, 0]]; // all edges of cell

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addEmitter(emitter: Omit<Emitter, 'id' | 'sprite' | 'active'>) {
    const id = Math.random().toString(36).substring(2, 10);
    this.emitters.push({...emitter, id, active: true, sprite: this.scene.add.sprite(emitter.xCoord * GRID, emitter.yCoord * GRID, 'emitter').setOrigin(0, 0).setDepth(10000)});
    return id;
  }

  removeEmitter(id: string) {
    const index = this.emitters.findIndex((e) => e.id === id);
    if (index !== -1) this.emitters.splice(index, 1);
    return index !== -1;
  }

  tick(tickCounter: number) {
    for (const emitter of this.emitters) {
      if (emitter.ticksDelay > tickCounter) continue;
      if (emitter.ticksCooldown > 1  && tickCounter % emitter.ticksCooldown !== 1) continue;
      this.onemit(emitter.xCoord, emitter.yCoord, emitter.fluidPerSecond * TICK_DELTA, this.defaultEmitPattern);
    }
  }
}

export interface Emitter {
  id: string;
  xCoord: number;
  yCoord: number;
  fluidPerSecond: number;
  ticksCooldown: number; // how many ticks it pauses before emitting again
  ticksDelay: number; // how many ticks it waits before starting to emit
  active: boolean;
  sprite?: Phaser.GameObjects.Sprite;
}
