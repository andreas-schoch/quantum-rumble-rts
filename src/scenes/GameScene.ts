import {DEFAULT_WIDTH, DEFAULT_ZOOM, GRID, MAX_ZOOM, MIN_ZOOM, STRUCTURE_BY_NAME, SceneKeys, WORLD_DATA, WORLD_X, WORLD_Y} from '..';
import { Cell, City } from '../City';
import { Network } from '../Network';
import { BaseStructure } from '../structures/BaseStructure';
import { Collector } from '../structures/Collector';
import { Relay } from '../structures/Relay';
import { Weapon } from '../structures/Weapon';

type CameraRotations = '0' | '90' | '180' | '270';
export default class GameScene extends Phaser.Scene {
  observer: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();
  controls!: Phaser.Cameras.Controls.SmoothedKeyControl;
  city!: City;
  network!: Network;
  private numTicks = 0;

  private structureToBuild: string | null = null; // TODO fix this
  pointerX: number;
  pointerY: number;
  pointerCoordX: number;
  pointerCoordY: number;

  constructor() {
    super({key: SceneKeys.GAME_SCENE});
    for (let y = 0; y < WORLD_Y; y++) {
      const row : Cell[]= [];
      for (let x = 0; x < WORLD_X; x++) {
        row.push({x, y, ref: null});
      }
      WORLD_DATA.push(row);
    }

    console.log('worldData', WORLD_DATA);
  }

  private create() {
    this.setupCameraAndInput();
    this.observer.removeAllListeners();
    this.network = new Network(this);

    this.city = new City(this, Math.floor(WORLD_X / 2), Math.floor(WORLD_Y / 2));
    this.network.placeStructure(this.city.coordX, this.city.coordY, this.city);
    this.city.activate();

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.lineStyle(1, 0xcccccc, 1);
    graphics.fillRect(0, 0, GRID, GRID);
    graphics.strokeRect(0, 0, GRID, GRID);
    graphics.generateTexture('cell_white', GRID, GRID);
    graphics.clear();
    this.add.tileSprite(0, 0, GRID * WORLD_X,GRID * WORLD_Y, 'cell_white').setOrigin(0, 0);

    graphics.fillStyle(0xe2ffe9, 1);
    graphics.lineStyle(1, 0xcccccc, 1);
    graphics.fillRect(0, 0, GRID, GRID);
    graphics.strokeRect(0, 0, GRID, GRID);
    graphics.generateTexture('cell_green', GRID, GRID);
    graphics.destroy();

    const tickEvent = this.time.addEvent({
      delay: 500,
      timeScale: 1,
      callback: () => {
        for(const structure of BaseStructure.structuresInUpdatePriorityOrder) structure.update();
      },
      callbackScope: this,
      loop: true
    });

    // console.log('tickevent', tickEvent);

  }

  // tick() {
  //   this.numTicks++;
  //   const time = this.game.getTime();
  //   const frame = this.game.getFrame();
  //   // console.log('tick', time, frame);
  //   for(const id of BaseStructure.activeStructureIds) {
  //     const structure = BaseStructure.structuresById.get(id);
  //     if (!structure) throw new Error('structure is null');
  //     structure.tick(this.numTicks);
  //   }

  // }

  update(time: number, delta: number) {
    this.controls.update(delta);
    // this.network.update();

    // this.network.previewStructure(this.pointerX, this.pointerY, this.structureToBuild);
  }

  private setupCameraAndInput() {
    // CAMERA STUFF
    const camera = this.cameras.main;
    const resolutionMod = this.cameras.main.width / DEFAULT_WIDTH;
    camera.setZoom(DEFAULT_ZOOM * resolutionMod);    camera.setBackgroundColor(0x333333);
    camera.centerOnX(GRID * WORLD_X / 2);
    camera.centerOnY(GRID * WORLD_Y / 2);

    // KEYBOARD STUFF
    let cameraRotationDeg = 0;
    let rotating = false;
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('cursors is null');
    const keyW = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const keyA = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const keyS = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const keyD = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyR = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    const keyONE = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    const keyTWO = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    const keyTHREE = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    const keyESC = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const keyX = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    const rotKeyMap: {[key in CameraRotations]: [Phaser.Input.Keyboard.Key, Phaser.Input.Keyboard.Key, Phaser.Input.Keyboard.Key, Phaser.Input.Keyboard.Key]} = {
      '0': [keyW, keyA, keyS, keyD],
      '90': [keyD, keyW, keyA, keyS],
      '180': [keyS, keyD, keyW, keyA],
      '270': [keyA, keyS, keyD, keyW],
    };

    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl({
      camera,
      up: rotKeyMap[String(cameraRotationDeg) as CameraRotations][0],
      left: rotKeyMap[String(cameraRotationDeg) as CameraRotations][1],
      down: rotKeyMap[String(cameraRotationDeg) as CameraRotations][2],
      right: rotKeyMap[String(cameraRotationDeg) as CameraRotations][3],
      zoomIn: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      zoomOut: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      acceleration: 10,
      drag: 0.1,
      maxSpeed: 0.75,
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
      zoomSpeed: 0.05,
    });

    keyR.onDown = evt => {
      if (rotating) return;
      if(evt.ctrlKey) return;
      rotating = true;
      cameraRotationDeg = cameraRotationDeg + 90;
      if (cameraRotationDeg >= 360) cameraRotationDeg = 0;
      camera.rotateTo(Phaser.Math.DegToRad(cameraRotationDeg), false, 350, 'Linear', false, (ref, progress) => {if (progress === 1) rotating = false;});
      if (!this.controls) return;
      this.controls.up = rotKeyMap[String(cameraRotationDeg) as CameraRotations][0];
      this.controls.left = rotKeyMap[String(cameraRotationDeg) as CameraRotations][1];
      this.controls.down = rotKeyMap[String(cameraRotationDeg) as CameraRotations][2];
      this.controls.right = rotKeyMap[String(cameraRotationDeg) as CameraRotations][3];
    };

    keyONE.onDown = () => this.structureToBuild = Collector.name;
    keyTWO.onDown = () => this.structureToBuild = Weapon.name;
    keyTHREE.onDown = () => this.structureToBuild = Relay.name;
    keyESC.onDown = () => {
      this.structureToBuild = null;
      this.network.previewCancel();
    };
    // keyX.onDown = () => this.structureToBuild = null;
    keyX.onDown = () => this.network.update();

    // MOUSE AND POINTER STUFF
    const input = this.input;
    input.mousePointer.motionFactor = 0.5;
    input.pointer1.motionFactor = 0.5;

    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const { worldX, worldY } = p;
      this.pointerX = worldX;
      this.pointerY = worldY;
      const pointerCoordX = Math.floor(worldX / GRID);
      const pointerCoordY = Math.floor(worldY / GRID);
      if (!p.isDown && this.structureToBuild && (this.pointerCoordX !== pointerCoordX || this.pointerCoordY !== pointerCoordY)) {
        this.network.previewStructure(pointerCoordX, pointerCoordY, this.structureToBuild);
        this.pointerCoordX = pointerCoordX;
        this.pointerCoordY = pointerCoordY;
      }
    //   if (p.leftButtonDown() || ) return;
    //   const { x, y } = p.velocity;
    //   camera.scrollX -= x / camera.zoom;
    //   camera.scrollY -= y / camera.zoom;
    });

    input.on('pointerdown', () => {
      if (!this.structureToBuild) return;
      const {pointerCoordX, pointerCoordY} = this;
      if (pointerCoordX < 0 || pointerCoordY < 0 || pointerCoordX >= WORLD_DATA[0].length || pointerCoordY >= WORLD_DATA.length) return; // skip out of bounds
      const structure = new STRUCTURE_BY_NAME[this.structureToBuild](this, this.pointerCoordX, this.pointerCoordY);
      this.network.placeStructure(this.pointerCoordX, this.pointerCoordY, structure);
      // else console.log('TODO implement select'); // TODO find structure under click and select it (show info about it in the UI)
    });

    input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: unknown[], deltaX: number, deltaY: number) => {
      const newZoom = camera.zoom - (deltaY > 0 ? 0.025 : -0.025);
      const clampedZoom = Phaser.Math.Clamp(newZoom, 2/3, 4/3);
      camera.zoom = clampedZoom;
    });
  }
}
