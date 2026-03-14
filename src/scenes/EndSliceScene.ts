import Phaser from 'phaser';
import { GameState } from '../engine/GameState';

export class EndSliceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndSliceScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Save state on arrival
    GameState.getInstance().save();

    // Content (hidden behind wipe initially)
    const title = this.add.text(width / 2, height / 2 - 40, 'End of Vertical Slice', {
      fontFamily: 'monospace', fontSize: '20px', color: '#e0e0e0', fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height / 2, 'The Bullpen awaits...', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ccaaff',
    }).setOrigin(0.5);

    const hint = this.add.text(width / 2, height / 2 + 40, 'Casey Park made it through the lobby.', {
      fontFamily: 'monospace', fontSize: '10px', color: '#666688',
    }).setOrigin(0.5);

    const state = GameState.getInstance();
    const impression = state.getFlagValue('voss_impression');
    const impressionText = impression
      ? `Voss impression: ${impression}`
      : '';
    const items = state.getInventory().length;
    const statsLine = [
      impressionText,
      items > 1 ? `${items} items collected` : '',
    ].filter(Boolean).join(' | ');

    if (statsLine) {
      this.add.text(width / 2, height / 2 + 60, statsLine, {
        fontFamily: 'monospace', fontSize: '8px', color: '#555577',
      }).setOrigin(0.5);
    }

    // Fade in content
    [title, subtitle, hint].forEach((obj) => {
      obj.setAlpha(0);
    });

    // Wipe reveal: black rectangle slides off to the right
    const wipe = this.add.rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0, 0)
      .setDepth(2000);

    this.tweens.add({
      targets: wipe,
      x: width,
      duration: 600,
      ease: 'Power2',
      delay: 200,
      onComplete: () => {
        wipe.destroy();
        // Fade in text after wipe clears
        this.tweens.add({
          targets: [title, subtitle, hint],
          alpha: 1,
          duration: 800,
          ease: 'Sine.easeIn',
        });
      },
    });
  }
}
