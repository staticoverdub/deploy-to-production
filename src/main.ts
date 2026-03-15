import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { BootScene } from './scenes/BootScene';
import { TestScene } from './scenes/TestScene';
import { LobbyScene } from './scenes/LobbyScene';
import { EndSliceScene } from './scenes/EndSliceScene';
import { BullpenScene } from './scenes/BullpenScene';
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
  scene: [TitleScene, BootScene, LobbyScene, TestScene, EndSliceScene, BullpenScene, PauseMenuScene],
};

const game = new Phaser.Game(config);

// Nuclear cursor hide: observe DOM for any new elements Phaser creates
// and force cursor:none on them (Phaser's scale manager creates wrapper divs)
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        node.style.setProperty('cursor', 'none', 'important');
      }
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Also force on existing elements after a tick
requestAnimationFrame(() => {
  document.querySelectorAll('*').forEach((el) => {
    (el as HTMLElement).style.setProperty('cursor', 'none', 'important');
  });
});
