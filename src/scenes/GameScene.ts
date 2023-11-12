import { DEFAULT_WIDTH, DEFAULT_ZOOM, GRID, MAX_ZOOM, MIN_ZOOM, TICK_RATE, SceneKeys, WORLD_X, WORLD_Y, EVENT_UNIT_SELECTION_CHANGE } from '../constants';
import { UNITS, Unit } from '..';
import { City } from '../units/City';
import { Network } from '../Network';
import { BaseStructure } from '../units/BaseUnit';
import { CreeperFlow } from '../Enemy/CreeperFlow';

type CameraRotations = '0' | '90' | '180' | '270';
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
  creeperFlow: CreeperFlow;
  private selectedUnitClass: Unit | null;

  constructor() {
    super({key: SceneKeys.GAME_SCENE});
  }

  private create() {
    // TODO render thresholds as needed depending on max density + elevation (once there is a non-flat terrain)
    this.creeperFlow = new CreeperFlow(this);
    this.sfx_start_collect = this.sound.add('start_collect', {detune: 600, rate: 1.25, volume: 0.5 , loop: false});
    this.sfx_place_structure = this.sound.add('place_structure', {detune: 200, rate: 1.25, volume: 1 , loop: false});
    this.add.tileSprite(0, 0, GRID * WORLD_X,GRID * WORLD_Y, 'cell_white').setOrigin(0, 0).setDepth(10000).setAlpha(0.2);

    this.scene.launch(SceneKeys.GAME_UI_SCENE, [this, () => {
      this.scene.restart();
    }]);

    this.setupCameraAndInput();
    this.observer.removeAllListeners();
    this.network = new Network(this);

    this.city = new City(this, Math.floor(WORLD_X / 2), Math.floor(WORLD_Y / 2));
    this.network.placeUnit(this.city.coordX, this.city.coordY, this.city);

    this.creeperFlow.addEmitter(2, 2, 512);
    this.creeperFlow.addEmitter(WORLD_X - 2, 2, 512);
    this.creeperFlow.addEmitter(2, WORLD_Y - 2, 512);
    this.creeperFlow.addEmitter(WORLD_X - 2, WORLD_Y - 2, 512);

    this.tickCounter = 0;
    // Only rendering related things should happen every frame. I potentially want to be able to simulate this game on a server, so it needs to be somewhat deterministic
    this.time.addEvent({
      delay: TICK_RATE,
      timeScale: 1,
      callback: () => {
        this.tickCounter++;
        this.creeperFlow.diffuse(this.tickCounter);
        this.creeperFlow.tick();
        this.network.tick(this.tickCounter);
        for(const structure of BaseStructure.structuresInUpdatePriorityOrder) structure.tick(this.tickCounter);
      },
      callbackScope: this,
      loop: true
    });

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
    camera.centerOnX(GRID * WORLD_X / 2);
    camera.centerOnY(GRID * WORLD_Y / 2);
    // KEYBOARD STUFF
    let cameraRotationDeg = 0;
    let rotating = false;
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('cursors is null');
    const keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyR = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
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

    const texts: Record<string, Phaser.GameObjects.Text> = {};
    keyX.onDown = () => {
      // this.structureToBuild = null;
      // this.network.previewCancel();
      // this.network.previewStructure(this.pointerCoordX, this.pointerCoordY, this.structureToBuild);

      console.time('x');

      this.creeperFlow.diffuse(++this.tickCounter);
      this.creeperFlow.tick();
      console.timeEnd('x');
      for (const [y, densityY] of this.creeperFlow.creeper.entries()) {
        for (const [x, density] of densityY.entries()) {
          const key = `${y}-${x}`;
          const text = texts[key]
            ? texts[key].setText((density + this.creeperFlow.terrain[y][x]).toFixed(2))
            : this.add.text(x * GRID, y * GRID, (density + this.creeperFlow.terrain[y][x]).toFixed(2), {fontSize: '10px', color: '#ffffff'}).setDepth(100000000);
          texts[key] = text;
        }
      }
    };

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
      if (pointerCoordX < 0 || pointerCoordY < 0 || pointerCoordX > WORLD_X || pointerCoordY > WORLD_Y) return; // skip out of bounds

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
