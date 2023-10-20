import {SceneKeys} from '..';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({key: SceneKeys.PRELOAD_SCENE});
  }

  preload() {
  }

  create() {
    console.log('--> PreloadScene create');
    this.scene.start(SceneKeys.GAME_SCENE);
  }
}
