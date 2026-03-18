import Phaser from 'phaser';
import { isTouchDevice } from './TouchDetector';

/**
 * Adds a small pause button to the top-right corner on touch devices.
 * Returns the container (or null on desktop) so the caller can destroy it.
 */
export function createPauseButton(scene: Phaser.Scene, parentSceneKey: string): Phaser.GameObjects.Container | null {
  if (!isTouchDevice()) return null;

  const container = scene.add.container(620, 12).setDepth(900).setScrollFactor(0);

  const bg = scene.add.rectangle(0, 0, 28, 22, 0x0a0a1a, 0.7);
  bg.setStrokeStyle(1, 0x444466, 0.6);
  container.add(bg);

  const label = scene.add.text(0, 0, 'II', {
    fontFamily: 'monospace', fontSize: '10px', color: '#aaaacc', fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(label);

  bg.setInteractive();
  bg.on('pointerdown', () => {
    scene.scene.pause();
    scene.scene.launch('PauseMenuScene', { parentScene: parentSceneKey });
  });

  return container;
}
