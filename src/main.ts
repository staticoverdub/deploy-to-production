import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { BootScene } from './scenes/BootScene';
import { TestScene } from './scenes/TestScene';
import { LobbyScene } from './scenes/LobbyScene';
import { EndSliceScene } from './scenes/EndSliceScene';
import { PauseMenuScene } from './scenes/PauseMenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 360,
  parent: 'game-container',
  backgroundColor: '#000000',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  callbacks: {
    postBoot: (game) => {
      game.canvas.style.cursor = 'none';
    },
  },
  scene: [TitleScene, BootScene, LobbyScene, TestScene, EndSliceScene, PauseMenuScene],
};

new Phaser.Game(config);
