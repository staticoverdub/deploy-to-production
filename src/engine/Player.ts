import Phaser from 'phaser';

const WALK_SPEED = 120; // px/sec at native res
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 48;
const PLAYER_COLOR = 0x4488cc;

export class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private cLabel: Phaser.GameObjects.Text;

  private targetX: number | null = null;
  private targetY: number | null = null;
  private isWalking: boolean = false;
  private onArrival: (() => void) | null = null;
  private facingRight: boolean = true;
  private walkTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.container(x, y);
    this.sprite.setDepth(500);

    // Placeholder body (30x48 blue rectangle, origin at feet)
    this.body = scene.add.rectangle(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_COLOR);
    this.body.setOrigin(0.5, 1);
    this.sprite.add(this.body);

    // "C" label on the body
    this.cLabel = scene.add.text(0, -PLAYER_HEIGHT / 2, 'C', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.cLabel.setOrigin(0.5);
    this.sprite.add(this.cLabel);

    // Name label above (not part of the flippable body)
    this.label = scene.add.text(0, -PLAYER_HEIGHT - 4, 'Casey', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#88ccff',
    });
    this.label.setOrigin(0.5, 1);
    this.sprite.add(this.label);
  }

  walkTo(x: number, y: number, onArrival?: () => void): void {
    this.targetX = x;
    this.targetY = y;
    this.isWalking = true;
    this.walkTime = 0;
    this.onArrival = onArrival ?? null;

    // Face direction of movement
    if (x > this.sprite.x) {
      this.faceRight();
    } else if (x < this.sprite.x) {
      this.faceLeft();
    }
  }

  private faceRight(): void {
    this.facingRight = true;
    this.body.setX(0);
    this.cLabel.setX(0);
    this.cLabel.setScale(1, 1);
  }

  private faceLeft(): void {
    this.facingRight = false;
    this.body.setX(0);
    this.cLabel.setX(0);
    this.cLabel.setScale(1, 1);
  }

  update(_time: number, delta: number): void {
    if (!this.isWalking || this.targetX === null || this.targetY === null) {
      // Idle — reset any walk bob
      this.body.setY(0);
      return;
    }

    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const step = (WALK_SPEED * delta) / 1000;

    if (dist <= step) {
      // Arrived
      this.sprite.setPosition(this.targetX, this.targetY);
      this.isWalking = false;
      this.targetX = null;
      this.targetY = null;
      this.body.setY(0);

      if (this.onArrival) {
        const cb = this.onArrival;
        this.onArrival = null;
        cb();
      }
    } else {
      // Move toward target
      const nx = dx / dist;
      const ny = dy / dist;
      this.sprite.x += nx * step;
      this.sprite.y += ny * step;

      // Walk bob animation — subtle up/down cycle
      this.walkTime += delta;
      const bob = Math.sin(this.walkTime * 0.012) * 2;
      this.body.setY(bob);
      this.cLabel.setY(-PLAYER_HEIGHT / 2 + bob);
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
  }

  getIsWalking(): boolean {
    return this.isWalking;
  }

  getSprite(): Phaser.GameObjects.Container {
    return this.sprite;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
