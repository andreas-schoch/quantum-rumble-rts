import { GRID, HALF_GRID, SceneKeys } from '../constants';
import { drawStar } from '../util';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({key: SceneKeys.PRELOAD_SCENE});
  }

  preload() {
    this.load.audio('place_structure', ['assets/audio/sfx/place_structure/click.wav',]);
    this.load.audio('start_collect', ['assets/audio/sfx/start_collect/sharp_echo.wav',]);
    this.load.audio('attack_turret', ['assets/audio/sfx/attack_turret/footstep_concrete_001.ogg',]);
    this.load.audio('theme', ['assets/audio/music/Kevin MacLeod/Shadowlands 4 - Breath.mp3',]);
    this.load.html('dom_game_ui', 'assets/html/game_ui.html');
    this.generateTextures(); // needs to be in preload for the UI textures to be created in time
  }

  create() {
    this.scene.start(SceneKeys.GAME_SCENE);
  }

  private generateTextures() {
    // Textures are kept minimal and generated dynamically because I have no art skills to make proper ones myself
    const graphics = this.add.graphics();

    // EMITTER TEXTURE
    graphics.fillStyle(0x0000ff, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 12, HALF_GRID * 3 * 0.9, HALF_GRID * 3 * 0.4);
    graphics.generateTexture('Emitter', GRID * 3, GRID * 3);
    graphics.clear();

    // CITY TEXTURE
    graphics.fillStyle(0xa88924, 1);
    graphics.lineStyle(2, 0x000000 , 1);
    drawStar(graphics, HALF_GRID * 9, HALF_GRID * 9, 8, HALF_GRID * 9 - 5, HALF_GRID * 9 * 0.8);
    graphics.fillStyle(0xa88924 + 0x333333, 1);
    drawStar(graphics, HALF_GRID * 9, HALF_GRID * 9, 8, HALF_GRID * 5, HALF_GRID * 9 * 0.6);
    graphics.generateTexture('City', GRID * 9, GRID * 9);
    graphics.clear();

    // COLLECTOR TEXTURE
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 2);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, GRID - 1);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 1);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 1);
    graphics.generateTexture('Collector', GRID * 3, GRID * 3);
    graphics.clear();

    // RELAY TEXTURE
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x000000, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 3, GRID * 0.4 * 3, GRID * 0.2 * 3);
    graphics.fillStyle(0xffffff, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 3, GRID * 0.2 * 3, GRID * 0.1 * 3);
    graphics.generateTexture('Relay', GRID * 3, GRID * 3);
    graphics.clear();

    // BLASTER
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(1, 0x000000, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 3, GRID * 0.4 * 3, GRID * 0.2 * 3);
    graphics.fillStyle(0x87692d, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, GRID * 0.8);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, GRID * 0.8 - 1);
    graphics.generateTexture('Blaster', GRID * 3, GRID * 3);
    graphics.clear();
    // BLASTER_TOP
    graphics.lineStyle(HALF_GRID * 0.8, 0x000000, 1);
    graphics.lineBetween(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 3, 0);
    graphics.fillStyle(0xa88924, 1);
    graphics.lineStyle(2, 0x000000, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 3, GRID * 0.15 * 3, GRID * 0.1 * 3);
    graphics.lineStyle(HALF_GRID * 0.8 - 4, 0xa88924, 1);
    graphics.lineBetween(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 3, 2);
    graphics.fillStyle(0xffffff, 1);
    graphics.generateTexture('Blaster_top', GRID * 3, GRID * 3);
    graphics.clear();
    // BLASTER UI TEXTURE
    const blasterUI = this.add.renderTexture(0, 0, GRID * 3, GRID * 3);
    blasterUI.draw('Blaster', 0, 0);
    blasterUI.draw('Blaster_top', 0, 0);
    blasterUI.snapshot(image => {
      this.textures.addBase64('Blaster_ui', (image as HTMLImageElement).src);
      blasterUI.destroy();
    });

    // MORTAR TEXTURE
    const offsetXY = HALF_GRID * 3;
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(1, 0x000000, 1);
    const inset = 3;
    const pointsTL = [{x: HALF_GRID + inset, y: HALF_GRID + inset}, {x: GRID * 2, y: GRID}, {x: GRID, y: GRID * 2}];
    const pointsTR = [{x: HALF_GRID * 5 - inset, y: HALF_GRID + inset}, {x: HALF_GRID * 2, y: HALF_GRID * 2}, {x: HALF_GRID * 4, y: HALF_GRID * 4}];
    const pointsBR = [{x: HALF_GRID * 5 - inset, y: HALF_GRID * 5 - inset}, {x: GRID * 2, y: GRID}, {x: GRID, y: GRID * 2}];
    const pointsBL = [{x: HALF_GRID + inset, y: HALF_GRID * 5 - inset}, {x: HALF_GRID * 2, y: HALF_GRID * 2}, {x: HALF_GRID * 4, y: HALF_GRID * 4}];
    graphics.fillPoints(pointsTL, true).strokePoints(pointsTL, true);
    graphics.fillPoints(pointsTR, true).strokePoints(pointsTR, true);
    graphics.fillPoints(pointsBR, true).strokePoints(pointsBR, true);
    graphics.fillPoints(pointsBL, true).strokePoints(pointsBL, true);
    graphics.fillStyle(0x87692d, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(offsetXY, offsetXY, GRID * 0.8);
    graphics.strokeCircle(offsetXY, offsetXY, GRID * 0.8 - 1);
    graphics.fillStyle(0x777777, 1);
    graphics.fillCircle(offsetXY, offsetXY, GRID * 0.4);
    graphics.strokeCircle(offsetXY, offsetXY, GRID * 0.4 - 1);
    graphics.generateTexture('Mortar', GRID * 3, GRID * 3);
    graphics.clear();
    // MORTAR SHELL TEXTURE
    graphics.fillStyle(0xff0000, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 4, GRID * 0.15 * 3, GRID * 0.075 * 3);
    graphics.generateTexture('Mortar_shell', GRID * 3, GRID * 3);
    graphics.clear();

    // STORAGE TEXTURE
    graphics.fillStyle(0x187f18, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 2);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, GRID - 1);
    graphics.fillStyle(0x777777, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 1);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 1);
    graphics.generateTexture('Storage', GRID * 3, GRID * 3);
    graphics.clear();

    // REACTOR TEXTURE
    graphics.fillStyle(0x2e5982, 1);
    graphics.lineStyle(2, 0x000000, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 4, (HALF_GRID * 3 * 0.8) - 2, HALF_GRID * 3 * 0.35);
    graphics.generateTexture('Reactor', GRID * 3, GRID * 3);
    graphics.clear();

    // SPEED TEXTURE
    graphics.fillStyle(0xff0000, 1);
    graphics.lineStyle(2, 0x000000, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 2, (HALF_GRID * 3) - 8, (HALF_GRID * 3) - 8);
    graphics.generateTexture('Speed', GRID * 3, GRID * 3);
    graphics.clear();

    // background cell white
    graphics.fillStyle(0xffffff, 0.4);
    graphics.lineStyle(1, 0xcccccc, 1);
    graphics.fillRect(0, 0, GRID, GRID);
    graphics.strokeRect(0, 0, GRID, GRID);
    graphics.generateTexture('cell_white', GRID, GRID);
    graphics.clear();

    // Background cell green
    graphics.fillStyle(0xff0000, 0.4);
    graphics.lineStyle(1, 0xcccccc, 1);
    graphics.fillRect(0, 0, GRID, GRID);
    graphics.strokeRect(0, 0, GRID, GRID);
    graphics.generateTexture('cell_red', GRID, GRID);
    graphics.clear();

    // Energy Ball gray
    const radius = GRID * 0.8;
    const strokeWidth = radius / 4;
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.fillCircle(radius, radius, radius - strokeWidth);
    graphics.setScale(0.5);
    graphics.generateTexture('energy', radius, radius);
    graphics.clear();

    // Energy Ball red
    graphics.setScale(1);
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(radius, radius, radius - strokeWidth);
    graphics.setScale(0.5);
    graphics.generateTexture('energy_red', radius, radius);
    graphics.destroy();
  }
}

// TODOS
// - Add sfx back again
// - Re-run pathfinding every once in a while
// - Refactor to not rely on phaser followers for energy balls
// - Disconnect entities from the network when part of their path gets destroyed. Ideally keep a set of node ids for each entity and iterate over all entities to check if they were affected by a path destruction.
//   If yes, try to find a new path for them. If no path is found, disconnect them from the network.
// - Ability to move weapons
// - Display health bar while building and when damaged until health is full again.
// - Add a win condition. I guess the original 3 totems the city has to connect to is fine
// - Refactor UI to use solidJS
// - Add multiple levels that can be selected from a menu
// - Remove connections when node gets destroyed or deleted
// - Show UI when selecting a unit with buttons to deactivate and destroy unit
