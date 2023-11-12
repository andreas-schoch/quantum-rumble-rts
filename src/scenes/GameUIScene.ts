import { GameObjects, Scene } from 'phaser';
import { DEFAULT_WIDTH, EVENT_UNIT_SELECTION_CHANGE, SceneKeys } from '../constants';
import { UNITS as UNIT_CLASSES } from '..';
import { Collector } from '../structures/Collector';
import { EVENT_ENERGY_CONSUMPTION_CHANGE, EVENT_ENERGY_PRODUCTION_CHANGE, EVENT_ENERGY_STORAGE_CHANGE } from '../constants';
import GameScene from './GameScene';

export default class GameUIScene extends Scene {
  private observer: Phaser.Events.EventEmitter;
  private restartGame: () => void;

  private music: Phaser.Sound.BaseSound;
  private resolutionMod: number;
  mainScene: GameScene;

  constructor() {
    super({key: SceneKeys.GAME_UI_SCENE});
  }

  init([mainScene, restartGameCB]: [GameScene, () => void]) {
    this.mainScene = mainScene;
    this.observer = mainScene.observer;
    this.restartGame = restartGameCB;
    this.resolutionMod = this.game.canvas.width / DEFAULT_WIDTH;

  }

  create() {
    this.initDomUi();
    this.music = this.sound.add('theme', {loop: true, volume: 0.4, rate: 1, delay: 0, detune: 400});
    this.music.play();
  }

  private initDomUi(): GameObjects.DOMElement {
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;
    const element = this.add.dom(screenCenterX, screenCenterY).createFromCache('dom_game_ui').setScale(this.resolutionMod);
    element.pointerEvents = 'none'; // Important to allow pointer events of main scene through UI layer

    // INIT UNIT SELECTOR
    const unitList = document.querySelector('#unit-selector')!;
    const unitTemplate: HTMLTemplateElement | null = document.getElementById('unit-template') as HTMLTemplateElement;
    UNIT_CLASSES.forEach((unit, i) => {
      const clone = unitTemplate.content.cloneNode(true) as HTMLElement;
      (clone.querySelector('.unit-img') as HTMLImageElement).src = this.textures.getBase64(unit.name) || this.textures.getBase64(Collector.name);
      clone.querySelector('.unit')!.id = unit.unitName;
      clone.querySelector('.unit-name')!.innerHTML = unit.unitName;
      clone.querySelector('.unit-cost')!.innerHTML = String(unit.buildCost);
      clone.querySelector('.unit-hotkey')!.innerHTML = String(i + 1);
      unitList.appendChild(clone);
      (unitList.querySelector('#' + unit.unitName) as HTMLElement).onclick =  () => this.observer.emit(EVENT_UNIT_SELECTION_CHANGE, i);
    });
    // UPDATE SELECTED UNIT
    const units = unitList.querySelectorAll('.unit');
    this.observer.on(EVENT_UNIT_SELECTION_CHANGE, (unitIndex: number) => {
      if (unitIndex !== -1) units.forEach((u, i) => i === unitIndex ? u.classList.add('selected') : u.classList.remove('selected'));
      else units.forEach(u => u.classList.remove('selected'));
    });

    // UPDATE ENERGY STORAGE
    const energyStorageText = document.querySelector('#energy-storage-text') as HTMLElement;
    const energyStorageProgress = document.querySelector('#energy-storage-progress') as HTMLElement;
    this.observer.on(EVENT_ENERGY_STORAGE_CHANGE, (current: number, max: number) => {
      energyStorageText.innerText = `${current.toFixed(1)}/${max}`;
      energyStorageProgress.style.width = `${(current / max) * 100}%`;
    });
    // UPDATE ENERGY PRODUCTION
    const energyProduction = document.querySelector('#energy-production') as HTMLElement;
    this.observer.on(EVENT_ENERGY_PRODUCTION_CHANGE, (energyPerSecond: number) => energyProduction.innerText = `+ ${energyPerSecond.toFixed(2)}`);
    // UPDATE ENERGY CONSUMPTION
    const energyConsumption = document.querySelector('#energy-consumption') as HTMLElement;
    this.observer.on(EVENT_ENERGY_CONSUMPTION_CHANGE, (energyPerSecond: number) => energyConsumption.innerText = `- ${energyPerSecond.toFixed(2)}`);

    return element;
  }
}
