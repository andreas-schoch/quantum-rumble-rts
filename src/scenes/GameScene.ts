import {SceneKeys} from '..';

interface Energy {
  follower: Phaser.GameObjects.PathFollower;
  id: string;
}

export default class GameScene extends Phaser.Scene {
  observer: Phaser.Events.EventEmitter | undefined;
  isPaused: boolean = false;
  flowingEnergy: Map<string, Energy> = new Map();
  private background: Phaser.GameObjects.TileSprite;
  private gridSize: number = 40;
  controls: Phaser.Cameras.Controls.SmoothedKeyControl;

  constructor() {
    super({key: SceneKeys.GAME_SCENE});
  }

  private create() {
    const camera = this.cameras.main;
    camera.zoom = 1;
    // this.cameras.main.scrollX = 320;
    // this.cameras.main.scrollY = 180;

    this.input.mousePointer.motionFactor = 0.5;
    this.input.pointer1.motionFactor = 0.5;

    this.input.on('pointermove', function (p) {
      if (!p.isDown) return;
      const { x, y } = p.velocity;
      camera.scrollX -= x / camera.zoom;
      camera.scrollY -= y / camera.zoom;
    });

    this.input.on('wheel',  (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      const newZoom = camera.zoom - (deltaY > 0 ? 0.025 : -0.025);
      const clampedZoom = Phaser.Math.Clamp(newZoom, 0.5, 1.5);
      camera.zoom = clampedZoom;

      // this.camera.centerOn(pointer.worldX, pointer.worldY);
      // this.camera.pan(pointer.worldX, pointer.worldY, 2000, "Power2");

    });

    camera.setViewport(0, 0, this.gridSize * 64, this.gridSize * 32);

    if (!this.input.keyboard) throw new Error('cursors is null');

    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl({
      camera: this.cameras.main,
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      acceleration: 10,
      drag: 0.1,
      maxSpeed: 0.5,
      maxZoom: 1.5,
      minZoom: 0.5
    });

    // Ensure that listeners from previous runs are cleared. Otherwise for a single emit it may call the listener multiple times depending on amount of game-over/replays
    if (this.observer) this.observer.destroy();
    this.observer = new Phaser.Events.EventEmitter();

    // this.scene.launch(SceneKeys.GAME_UI_SCENE, [this.observer, () => {
    //     this.scene.restart();
    // }]);

    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x888888, 1);
    graphics.strokeRect(0, 0, this.gridSize, this.gridSize);
    graphics.generateTexture('gridTexture', this.gridSize, this.gridSize);
    graphics.destroy();

    this.background = this.add.tileSprite(0, 0, camera.width * (1 / camera.zoom), camera.height * (1 / camera.zoom), 'gridTexture').setOrigin(0, 0);

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.isPaused) this.flowingEnergy.forEach(energy => energy.follower.resumeFollow());
      else this.flowingEnergy.forEach(energy => energy.follower.pauseFollow());
      this.isPaused = !this.isPaused;
    });

    //////////////////////////////////////////////////

    const points: number[] = [
      this.gridSize * 3.5, this.gridSize * 13,
      this.gridSize * 6, this.gridSize * 13,
      this.gridSize * 6, this.gridSize * 15,
      this.gridSize * 7, this.gridSize * 14,
      this.gridSize * 8, this.gridSize * 12,
      this.gridSize * 9, this.gridSize * 13,
      this.gridSize * 9, this.gridSize * 10,
      this.gridSize * 10, this.gridSize * 11,
      this.gridSize * 17, this.gridSize * 12,
      this.gridSize * 18, this.gridSize * 10,
      this.gridSize * 18, this.gridSize * 5,
      this.gridSize * 19, this.gridSize * 5,
      this.gridSize * 20, this.gridSize * 17,
      this.gridSize * 30, this.gridSize * 20,
      this.gridSize * 37, this.gridSize * 2
    ].map(p => p + (this.gridSize / 2));

    const path = new Phaser.Curves.Path(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
    const network = this.add.graphics();
    network.lineStyle(6, 0x000000, 1);
    path.draw(network, 1);
    network.lineStyle(3, 0xffffff, 1);
    path.draw(network, 1);

    //////////////////////////////////////////////////

    const collectors = this.add.graphics();
    collectors.lineStyle(2, 0x000000 , 1);
    for (let i = 0; i < points.length; i += 2) this.drawCollector(collectors, points[i], points[i + 1]);
    this.drawCollector(collectors, this.gridSize * 1, this.gridSize * 13.5);
    this.drawCollector(collectors, this.gridSize * 2.5, this.gridSize * 15);
    this.drawCollector(collectors, this.gridSize * 2.5, this.gridSize * 12);

    ///////////////////////////////////////////////////

    const radius = 8;
    const strokeWidth = 1.5;
    const circle = this.add.graphics({ lineStyle: { width: strokeWidth, color: 0x0000 }, fillStyle: { color: 0xd3d3d3 } });
    circle.fillCircle(radius, radius, radius); // Adjust the radius as needed
    circle.strokeCircle(radius, radius, radius - (strokeWidth / 2)); // Adjust the radius as needed
    circle.generateTexture('energy', radius * 2, radius * 2); // Adjust the size as needed

    const pathLength = path.getLength();
    const speed = 75; // units per second
    const duration = (pathLength / speed) * 1000; // convert to milliseconds

    let i = 0;
    let handle: NodeJS.Timeout | null = null;
    handle = setInterval(() => {
      const energyBall: Energy = {follower: this.add.follower(path, points[0], points[1], 'energy'), id: Math.random().toString(36).substring(2, 10)};
      energyBall.follower.setScale(1);
      this.flowingEnergy.set(energyBall.id, energyBall);
      energyBall.follower.startFollow({duration, repeat: 0, onComplete: () => {
        energyBall.follower.destroy(); // TODO maybe add follower to a pool instead
        this.flowingEnergy.delete(energyBall.id);

      }});
      if (++i >= 10000 && handle) clearInterval(handle);
    }, 500);

    ///////////////////////////////////////////////////

    const city = this.add.graphics();
    city.fillStyle(0xd3d3d3, 1);
    city.lineStyle(2, 0x000000 , 1);
    city.fillRoundedRect(this.gridSize, (this.gridSize * 13) - (this.gridSize * 1), this.gridSize * 3, this.gridSize * 3, 16);
    city.strokeRoundedRect(this.gridSize, (this.gridSize * 13) - (this.gridSize * 1), this.gridSize * 3, this.gridSize * 3, 16);
    city.fillStyle(0xffffff, 1);
    city.fillRoundedRect(this.gridSize + (this.gridSize / 4), (this.gridSize * 13) - (this.gridSize * 0.75), this.gridSize * 2.5, this.gridSize * 2.5, 10);
    city.strokeRoundedRect(this.gridSize + (this.gridSize / 4), (this.gridSize * 13) - (this.gridSize * 0.75), this.gridSize * 2.5, this.gridSize * 2.5, 10);

    //////////////////////////////////////////
  }

  private drawCollector(graphics: Phaser.GameObjects.Graphics, x: number, y: number) {
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.fillCircle(x, y, this.gridSize / 4);
    graphics.strokeCircle(x, y, this.gridSize / 4);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(x, y, this.gridSize / 8);
    graphics.strokeCircle(x, y, this.gridSize / 8);
  }

  update(time: number, delta: number) {
    this.controls.update(delta);
  }
}
