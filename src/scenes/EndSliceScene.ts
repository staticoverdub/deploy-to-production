import Phaser from 'phaser';

export class EndSliceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndSliceScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.add.text(width / 2, height / 2 - 20, 'End of Vertical Slice', {
      fontFamily: 'monospace', fontSize: '20px', color: '#e0e0e0', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, 'The Bullpen awaits...', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);
  }
}
