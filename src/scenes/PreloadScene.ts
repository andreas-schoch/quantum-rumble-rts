import {SceneKeys} from '..';
import { City } from '../City';
import { Collector } from '../structures/Collector';
import { Weapon } from '../structures/Weapon';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({key: SceneKeys.PRELOAD_SCENE});
  }

  preload() {
  }

  create() {
    console.log('--> PreloadScene create');

    City.generateTextures(this);
    Collector.generateTextures(this);
    Weapon.generateTextures();
    this.scene.start(SceneKeys.GAME_SCENE);
  }
}
