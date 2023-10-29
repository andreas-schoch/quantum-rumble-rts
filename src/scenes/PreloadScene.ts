import {GRID, SceneKeys} from '..';
import { City } from '../City';
import { Collector } from '../structures/Collector';
import { Relay } from '../structures/Relay';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({key: SceneKeys.PRELOAD_SCENE});
  }

  preload() {
    this.load.audio('place_structure', ['assets/audio/sfx/place_structure/boink.ogg', 'assets/audio/sfx/place_structure/boink.mp3']);
    this.load.audio('start_collect', ['assets/audio/sfx/start_collect/sharp_echo.wav',]);
    this.load.audio('attack_turret', ['assets/audio/sfx/attack_turret/footstep_concrete_001.ogg',]);
  }

  create() {
    this.generateTextures();
    this.scene.start(SceneKeys.GAME_SCENE);
  }

  private generateTextures() {
    City.generateTextures(this);
    Collector.generateTextures(this);
    Relay.generateTextures(this);

    // background cell white
    const graphics = this.add.graphics();
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
    const radius = 8;
    const strokeWidth = 1.5;
    graphics.lineStyle(strokeWidth, 0x000000, 1);
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.strokeCircle(radius, radius, radius - (strokeWidth / 2));
    graphics.generateTexture('energy', radius * 2, radius * 2);
    graphics.clear();

    // Energy Ball red
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.strokeCircle(radius, radius, radius - (strokeWidth / 2));
    graphics.generateTexture('energy_red', radius * 2, radius * 2);
    graphics.destroy();
  }
}
