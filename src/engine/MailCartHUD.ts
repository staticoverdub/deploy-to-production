import Phaser from 'phaser';
import { GameState } from './GameState';

export class MailCartHUD {
  private scene: Phaser.Scene;
  private cups: Phaser.GameObjects.Image[] = [];
  private phaseText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private bossBar: Phaser.GameObjects.Rectangle | null = null;
  private bossBarBg: Phaser.GameObjects.Rectangle | null = null;
  private score = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Coffee cup health icons (top-left) — up to 4 if lobby bonus
    const maxCups = GameState.getInstance().hasItem('lobby_coffee') ? 4 : 3;
    // We check this early; MailCartScene handles the actual health bump
    // But to avoid timing issues, just always create 4 cups and hide the 4th if not needed
    for (let i = 0; i < 4; i++) {
      const cup = scene.add.image(20 + i * 24, 18, 'mc_coffee_cup')
        .setScrollFactor(0)
        .setDepth(100)
        .setScale(0.7)
        .setVisible(false);
      this.cups.push(cup);
    }

    // Phase name (top-center)
    this.phaseText = scene.add.text(320, 16, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#FFD000',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100).setAlpha(0);

    // Score (top-right)
    this.scoreText = scene.add.text(620, 16, 'Score: 0', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#FFD000',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Hint text (bottom-center)
    this.hintText = scene.add.text(320, 330, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100).setAlpha(0);
  }

  setHealth(health: number, maxHealth: number = 3): void {
    for (let i = 0; i < this.cups.length; i++) {
      if (i < maxHealth) {
        this.cups[i].setVisible(true);
        this.cups[i].setAlpha(i < health ? 1 : 0.25);
        this.cups[i].setTint(i < health ? 0xffffff : 0x444444);
      } else {
        this.cups[i].setVisible(false);
      }
    }
  }

  addScore(points: number): void {
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  getScore(): number {
    return this.score;
  }

  showPhase(name: string): void {
    this.phaseText.setText(name).setAlpha(1);
    this.scene.tweens.add({
      targets: this.phaseText,
      alpha: 0,
      delay: 2000,
      duration: 500,
    });
  }

  showHint(text: string): void {
    this.hintText.setText(text).setAlpha(1);
    this.scene.tweens.add({
      targets: this.hintText,
      alpha: 0,
      delay: 3000,
      duration: 500,
    });
  }

  showBossBar(_maxHealth: number): void {
    this.bossBarBg = this.scene.add.rectangle(320, 340, 200, 10, 0x333333)
      .setScrollFactor(0).setDepth(100).setOrigin(0.5);
    this.bossBar = this.scene.add.rectangle(320, 340, 200, 10, 0xcc0000)
      .setScrollFactor(0).setDepth(101).setOrigin(0.5);
  }

  updateBossBar(current: number, max: number): void {
    if (this.bossBar) {
      this.bossBar.width = 200 * (current / max);
    }
  }

  hideBossBar(): void {
    this.bossBar?.destroy();
    this.bossBarBg?.destroy();
    this.bossBar = null;
    this.bossBarBg = null;
  }

  destroy(): void {
    this.cups.forEach(c => c.destroy());
    this.phaseText.destroy();
    this.scoreText.destroy();
    this.hintText.destroy();
    this.hideBossBar();
  }
}
