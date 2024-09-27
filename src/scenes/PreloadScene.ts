import { GRID, HALF_GRID, SceneKeys } from '../constants';
import { Storage } from '../units/Storage';
import { City } from '../units/City';
import { Collector } from '../units/Collector';
import { Relay } from '../units/Relay';
import { Reactor } from '../units/Reactor';
import { Speed } from '../units/Speed';
import { drawStar } from '../util';
// import { EmitterManager } from '../Emitter';

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
  }

  create() {
    this.generateTextures();
    this.scene.start(SceneKeys.GAME_SCENE);
  }

  private generateTextures() {
    City.generateTextures(this);
    Collector.generateTextures(this);
    Relay.generateTextures(this);
    Storage.generateTextures(this);
    Reactor.generateTextures(this);
    Speed.generateTextures(this);

    const graphics = this.add.graphics();

    // EMITTER TEXTURE
    graphics.fillStyle(0x0000ff, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 12, HALF_GRID * 3 * 0.9, HALF_GRID * 3 * 0.4);
    graphics.generateTexture('emitter', GRID * 3, GRID * 3);
    graphics.clear();

    // background cell white
    graphics.fillStyle(0xffffff, 1);
    graphics.lineStyle(1, 0xcccccc, 1);
    graphics.fillRect(0, 0, GRID, GRID);
    graphics.strokeRect(0, 0, GRID, GRID);
    graphics.generateTexture('cell_white', GRID, GRID);
    graphics.clear();

    // Background cell green
    graphics.fillStyle(0xe2ffe9, 1);
    graphics.lineStyle(1, 0xcccccc, 1);
    graphics.fillRect(0, 0, GRID, GRID);
    graphics.strokeRect(0, 0, GRID, GRID);
    graphics.generateTexture('cell_green', GRID, GRID);
    graphics.clear();

    // Energy Ball gray
    const radius = GRID;
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
