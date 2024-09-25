import { DEFAULT_WIDTH, DEFAULT_ZOOM, GRID, MAX_ZOOM, MIN_ZOOM, TICK_RATE, SceneKeys, EVENT_UNIT_SELECTION_CHANGE, level } from '../constants';
import { UNITS, Unit } from '..';
import { City } from '../units/City';
import { Network } from '../Network';
import { BaseStructure } from '../units/BaseUnit';
import { TerrainRenderer as TerrainRenderer } from '../terrain/Terrain';
import { EmitterManager } from '../Emitter';
import { wrap, Remote } from 'comlink';
import SimulationWorker from 'worker-loader!../workers/simulation.worker.ts';
import { TerrainSimulation } from '../terrain/TerrainSimulation.js';
import { Tilemaps } from 'phaser';

export default class GameScene extends Phaser.Scene {
  observer: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();
  controls!: Phaser.Cameras.Controls.SmoothedKeyControl;
  city!: City;
  network!: Network;

  pointerX: number | null = null;
  pointerY: number | null = null;
  pointerCoordX: number | null = null;
  pointerCoordY: number;
  sfx_start_collect: Phaser.Sound.BaseSound;
  sfx_place_structure: Phaser.Sound.BaseSound;
  tickCounter: number;
  terrain: TerrainRenderer;
  private selectedUnitClass: Unit | null;
  simulation: Remote<TerrainSimulation>;
  emitterManager: EmitterManager;
  tilemap: Tilemaps.Tilemap;
  tileset: Tilemaps.Tileset | null;
  isPaused = false;

  constructor() {
    super({key: SceneKeys.GAME_SCENE});
  }

  private create() {
    this.sfx_start_collect = this.sound.add('start_collect', {detune: 600, rate: 1.25, volume: 0.5 , loop: false});
    this.sfx_place_structure = this.sound.add('place_structure', {detune: 200, rate: 1.25, volume: 1 , loop: false});

    // this.tilemap = this.make.tilemap({tileWidth: GRID, tileHeight: GRID, width: level.sizeX, height: level.sizeY, insertNull: true});
    // this.tileset = this.tilemap.addTilesetImage("terrain", "terrain", GRID, GRID, 0, 2, 0);
    // if (!this.tileset) throw new Error('tileset is null');

    // for (const {elevation, depth} of config.terrainLayers) {
    //   const layer = this.tilemap.createBlankLayer('terrain_' + elevation, this.tileset);
    //   if (!layer) throw new Error('layer is null');
    //   layer.setDepth(depth);
    // }

    this.scene.launch(SceneKeys.GAME_UI_SCENE, [this, () => {
      this.scene.restart();
    }]);

    this.setupCameraAndInput();
    this.observer.removeAllListeners();
    this.network = new Network(this);

    this.city = new City(this, Math.floor(level.cityCoords.x), Math.floor(level.cityCoords.y));
    this.network.placeUnit(this.city.coordX, this.city.coordY, this.city);
    this.simulation = wrap(new SimulationWorker());
    this.simulation.getData().then(({terrainData, fluidData, collectionData}) => {
      this.terrain = new TerrainRenderer(this, terrainData, fluidData, collectionData);

      this.emitterManager = new EmitterManager(this);

      level.emitters.forEach(em => this.emitterManager.addEmitter(em));
      this.emitterManager.onemit = async (xCoord, yCoord, amount, pattern) => await this.simulation.fluidChangeRequest(xCoord, yCoord, amount, pattern);

      this.tickCounter = 0;
      // Only rendering related things should happen every frame. I potentially want to be able to simulate this game on a server, so it needs to be somewhat deterministic
      this.time.addEvent({
        delay: TICK_RATE,
        timeScale: 1,
        callback: () => {
          if (this.isPaused) return;
          this.tickCounter++;
          this.simulation.tick(this.tickCounter).then(() => {
            this.emitterManager.tick(this.tickCounter);
            this.terrain.tick(this.tickCounter);
            this.network.tick(this.tickCounter);
            for(const structure of BaseStructure.structuresInUpdatePriorityOrder) structure.tick(this.tickCounter);
          });
        },
        callbackScope: this,
        loop: true
      });

      this.observer.on(EVENT_UNIT_SELECTION_CHANGE, (unitIndex: number) => this.selectUnit(unitIndex, false));
    });
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
    const keyEIGHT = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT);
    const keyNINE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NINE);
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

    // TODO deduplicate
    keyONE.onDown = () => this.selectUnit(0);
    keyTWO.onDown = () => this.selectUnit(1);
    keyTHREE.onDown = () => this.selectUnit(2);
    keyFOUR.onDown = () => this.selectUnit(3);
    keyFIVE.onDown = () => this.selectUnit(4);
    keySIX.onDown = () => this.selectUnit(5);
    keySEVEN.onDown = () => this.selectUnit(6);
    keyEIGHT.onDown = () => this.selectUnit(7);
    keyNINE.onDown = () => this.selectUnit(8);
    keyESC.onDown = () => this.selectUnit(-1);
    keyX.onDown = () => this.selectUnit(-1);
    keyP.onDown = () => this.isPaused = !this.isPaused;
    keySPACE.onDown = () => this.isPaused = !this.isPaused;

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
      if (!p.isDown && this.selectedUnitClass && (this.pointerCoordX !== pointerCoordX || this.pointerCoordY !== pointerCoordY)) {
        this.network.previewStructure(pointerCoordX, pointerCoordY, this.selectedUnitClass);
        this.pointerCoordX = pointerCoordX;
        this.pointerCoordY = pointerCoordY;
      }
    });

    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.selectedUnitClass) return;
      this.pointerCoordX = Math.floor(p.worldX / GRID);
      this.pointerCoordY = Math.floor(p.worldY / GRID);
      const {pointerCoordX, pointerCoordY} = this;
      if (pointerCoordX === null || pointerCoordY === null) return;
      if (pointerCoordX < 0 || pointerCoordY < 0 || pointerCoordX > level.sizeX || pointerCoordY > level.sizeY) return; // skip out of bounds

      if (this.selectedUnitClass) {
        const unit = new this.selectedUnitClass(this, pointerCoordX, pointerCoordY);
        this.network.placeUnit(pointerCoordX, pointerCoordY, unit);
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
    const unitClass: Unit | null = UNITS[index] || null;
    this.network.previewCancel();
    this.network.previewStructure(this.pointerCoordX, this.pointerCoordY, unitClass);
    this.selectedUnitClass = unitClass;
    notifyUI && this.observer.emit(EVENT_UNIT_SELECTION_CHANGE,  index);
  }
}
