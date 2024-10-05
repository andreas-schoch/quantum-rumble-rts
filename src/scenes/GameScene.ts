import { DEFAULT_WIDTH, DEFAULT_ZOOM, GRID, MAX_ZOOM, MIN_ZOOM, TICK_RATE, SceneKeys, EVENT_UNIT_SELECTION_CHANGE, level, EntityProps } from '../constants';
import { SELECTABLE_UNITS } from '..';
import { Simulation } from '../terrain/TerrainSimulation';
import { Tilemaps } from 'phaser';
import { Renderer } from '../terrain/Renderer';
import { Previewer } from '../Previewer';
import { canPlaceEntityAt } from '../util';

export default class GameScene extends Phaser.Scene {
  observer: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();
  controls!: Phaser.Cameras.Controls.SmoothedKeyControl;

  pointerX: number | null = null;
  pointerY: number | null = null;
  pointerCoordX: number | null = null;
  pointerCoordY: number;
  sfx_place_structure: Phaser.Sound.BaseSound;
  selectedUnit: EntityProps | null;
  simulation: Simulation;
  tilemap: Tilemaps.Tilemap;
  tileset: Tilemaps.Tileset | null;
  previewer: Previewer;

  constructor() {
    super({key: SceneKeys.GAME_SCENE});
  }

  private create() {
    this.sfx_place_structure = this.sound.add('place_structure', {detune: 200, rate: 1.25, volume: 1 , loop: false});

    this.scene.launch(SceneKeys.GAME_UI_SCENE, [this, () => {
      this.scene.restart();
    }]);

    this.setupCameraAndInput();
    this.observer.removeAllListeners();

    this.simulation = new Simulation(this, this.observer, new Renderer(this));
    this.previewer = new Previewer(this, this.simulation.state);

    setInterval(() => this.simulation.step(), TICK_RATE);

    this.observer.on(EVENT_UNIT_SELECTION_CHANGE, (unitIndex: number) => this.selectUnit(unitIndex, false));
  }

  update(time: number, delta: number) {
    this.controls.update(delta);
  }

  private setupCameraAndInput() {
    // CAMERA STUFF
    const camera = this.cameras.main;
    const resolutionMod = this.cameras.main.width / DEFAULT_WIDTH;
    camera.setZoom(DEFAULT_ZOOM * resolutionMod);
    camera.setBackgroundColor(0x333333);
    camera.centerOnX(GRID * level.sizeX / 2);
    camera.centerOnY(GRID * level.sizeY / 2);
    // KEYBOARD STUFF
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('cursors is null');
    const keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyONE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    const keyTWO = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    const keyTHREE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    const keyFOUR = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    const keyFIVE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);
    const keySIX = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX);
    const keySEVEN = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN);
    const keyESC = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const keyX = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    const keyP = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    const keySPACE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl({
      camera,
      up: keyW,
      left: keyA,
      down: keyS,
      right: keyD,
      zoomIn: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      zoomOut: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      acceleration: 10,
      drag: 0.1,
      maxSpeed: 0.75,
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
      zoomSpeed: 0.05,
    });

    keyONE.onDown = () => this.selectUnit(0);
    keyTWO.onDown = () => this.selectUnit(1);
    keyTHREE.onDown = () => this.selectUnit(2);
    keyFOUR.onDown = () => this.selectUnit(3);
    keyFIVE.onDown = () => this.selectUnit(4);
    keySIX.onDown = () => this.selectUnit(5);
    keySEVEN.onDown = () => this.selectUnit(6);
    keyESC.onDown = () => this.selectUnit(-1);
    keyX.onDown = () => this.selectUnit(-1);
    keyP.onDown = () => this.simulation.state.isPaused = !this.simulation.state.isPaused;
    keySPACE.onDown = () => this.simulation.state.isPaused = !this.simulation.state.isPaused;

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
      // Compare with previous to avoid unnecessary updates
      if (!p.isDown && this.selectedUnit && (this.pointerCoordX !== pointerCoordX || this.pointerCoordY !== pointerCoordY)) {
        this.previewer.previewEntity(pointerCoordX, pointerCoordY, this.selectedUnit);
        this.pointerCoordX = pointerCoordX;
        this.pointerCoordY = pointerCoordY;
      }
    });

    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.selectedUnit) return;
      this.pointerCoordX = Math.floor(p.worldX / GRID);
      this.pointerCoordY = Math.floor(p.worldY / GRID);
      const {pointerCoordX, pointerCoordY} = this;
      if (pointerCoordX === null || pointerCoordY === null) return;
      if (pointerCoordX < 0 || pointerCoordY < 0 || pointerCoordX > level.sizeX || pointerCoordY > level.sizeY) return; // skip out of bounds

      if (this.selectedUnit && canPlaceEntityAt(pointerCoordX, pointerCoordY, this.simulation.state)) {
        this.sfx_place_structure.play();
        this.simulation.addEntity({active: true, built: false, xCoord: pointerCoordX, yCoord: pointerCoordY, props: this.selectedUnit});
      }
      // else console.log('TODO implement select'); // TODO find structure under click and select it (show info about it in the UI)
    });

    input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: unknown[], deltaX: number, deltaY: number) => {
      const newZoom = camera.zoom - (deltaY > 0 ? 0.025 : -0.025);
      const clampedZoom = Phaser.Math.Clamp(newZoom, 2/3, 4/3);
      camera.zoom = clampedZoom;
    });
  }

  private selectUnit(index: number, notifyUI = true) {
    const unitProps: EntityProps | null = SELECTABLE_UNITS[index] || null;
    this.previewer.previewCancel();
    this.previewer.previewEntity(this.pointerCoordX, this.pointerCoordY, unitProps);
    this.selectedUnit = unitProps;
    notifyUI && this.observer.emit(EVENT_UNIT_SELECTION_CHANGE,  index);
  }
}
