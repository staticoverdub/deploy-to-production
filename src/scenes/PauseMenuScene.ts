import Phaser from 'phaser';
import { GameState } from '../engine/GameState';

export class PauseMenuScene extends Phaser.Scene {
  private parentSceneKey = '';
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'PauseMenuScene' });
  }

  init(data: { parentScene: string }): void {
    this.parentSceneKey = data.parentScene;
  }

  create(): void {
    const { width, height } = this.scale;

    // Semi-transparent overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    // Title
    this.add.text(width / 2, height / 2 - 70, 'PAUSED', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#e0e0e0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Buttons
    this.createButton(width / 2, height / 2 - 16, 'Save Game', () => this.saveGame());
    this.createButton(width / 2, height / 2 + 16, 'Load Game', () => this.loadGame());
    this.createButton(width / 2, height / 2 + 48, 'Resume', () => this.resumeGame());

    // Status text (for save/load confirmation)
    this.statusText = this.add.text(width / 2, height / 2 + 84, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#88cc88',
    }).setOrigin(0.5);

    // Escape to resume
    this.input.keyboard?.on('keydown-ESC', () => {
      this.resumeGame();
    });
  }

  private createButton(x: number, y: number, label: string, callback: () => void): void {
    const bg = this.add.rectangle(x, y, 160, 26, 0x222244, 0.9);
    bg.setStrokeStyle(1, 0x444466);

    const text = this.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#aaaacc',
    }).setOrigin(0.5);

    bg.setInteractive();
    bg.on('pointerover', () => {
      bg.setFillStyle(0x333366, 0.9);
      text.setColor('#ffffff');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x222244, 0.9);
      text.setColor('#aaaacc');
    });
    bg.on('pointerdown', callback);
  }

  private saveGame(): void {
    GameState.getInstance().save();
    this.showStatus('Game saved.');
  }

  private loadGame(): void {
    const state = GameState.getInstance();
    if (!state.hasSave()) {
      this.showStatus('No save data found.');
      return;
    }
    this.scene.stop(this.parentSceneKey);
    this.scene.start('LobbyScene', { loadSave: true });
  }

  private resumeGame(): void {
    this.scene.resume(this.parentSceneKey);
    this.scene.stop();
  }

  private showStatus(message: string): void {
    if (!this.statusText) return;
    this.statusText.setText(message);
    this.statusText.setAlpha(1);
    this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      delay: 1500,
      duration: 500,
    });
  }
}
