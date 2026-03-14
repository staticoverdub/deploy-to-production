import Phaser from 'phaser';
import cfaLogo from '../assets/ui/cfa-logo.png';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image('cfa-logo', cfaLogo);
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#2b1a78');

    const title = this.add.text(width / 2, height / 2 - 40, 'DEPLOY TO PRODUCTION', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#e0e0e0',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // "A [logo] Adventure" — position the three elements inline
    const subtitleY = height / 2 + 4;
    const subtitleStyle = {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#888888',
    };

    const aText = this.add.text(0, subtitleY, 'A ', subtitleStyle).setOrigin(0, 0.5);
    const logo = this.add.image(0, subtitleY, 'cfa-logo');
    const logoScale = 0.36;
    logo.setScale(logoScale);
    logo.setOrigin(0, 0.5);
    const adventureText = this.add.text(0, subtitleY, ' Adventure', subtitleStyle).setOrigin(0, 0.5);

    // Calculate total width and center the row
    const logoDisplayWidth = logo.width * logoScale;
    const totalWidth = aText.width + logoDisplayWidth + adventureText.width;
    const startX = (width - totalWidth) / 2;

    aText.setX(startX);
    logo.setX(startX + aText.width);
    adventureText.setX(startX + aText.width + logoDisplayWidth);

    const clickToStart = this.add.text(width / 2, height / 2 + 50, 'Click to Start', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#666688',
    });
    clickToStart.setOrigin(0.5);

    // Pulse animation
    this.tweens.add({
      targets: clickToStart,
      alpha: { from: 1, to: 0.3 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      this.scene.start('LobbyScene');
    });

    const version = this.add.text(width / 2, height - 20, 'v0.1.0', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#555555',
    });
    version.setOrigin(0.5);
  }
}
