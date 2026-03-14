import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TestScene } from './scenes/TestScene';
import { LobbyScene } from './scenes/LobbyScene';
import { EndSliceScene } from './scenes/EndSliceScene';

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
  scene: [BootScene, LobbyScene, TestScene, EndSliceScene],
};

new Phaser.Game(config);
