import Phaser from 'phaser';
import { GameState } from '../engine/GameState';
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

    const hasSave = GameState.getInstance().hasSave();

    if (hasSave) {
      // Continue button (primary)
      const continueBtn = this.add.text(width / 2, height / 2 + 44, 'Continue', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#aaccff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      continueBtn.setInteractive();
      continueBtn.on('pointerover', () => continueBtn.setColor('#ffffff'));
      continueBtn.on('pointerout', () => continueBtn.setColor('#aaccff'));
      continueBtn.on('pointerdown', () => {
        this.scene.start('LobbyScene', { loadSave: true });
      });

      this.tweens.add({
        targets: continueBtn,
        alpha: { from: 1, to: 0.4 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });

      // New Game button (secondary)
      const newGameBtn = this.add.text(width / 2, height / 2 + 66, 'New Game', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#666688',
      }).setOrigin(0.5);

      newGameBtn.setInteractive();
      newGameBtn.on('pointerover', () => newGameBtn.setColor('#aaaacc'));
      newGameBtn.on('pointerout', () => newGameBtn.setColor('#666688'));
      newGameBtn.on('pointerdown', () => {
        this.scene.start('LobbyScene');
      });
    } else {
      // No save — simple click to start
      const clickToStart = this.add.text(width / 2, height / 2 + 50, 'Click to Start', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#666688',
      }).setOrigin(0.5);

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
    }

    // Version
    this.add.text(width / 2, height - 20, 'v0.1.0', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#555555',
    }).setOrigin(0.5);
  }
}
