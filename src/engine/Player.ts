import Phaser from 'phaser';

const WALK_SPEED = 120;
const IDLE_TRIGGER_MS = 10000;

export const CHAR_FRAMES = {
  IDLE_S: 0,
  IDLE_W: 1,
  IDLE_E: 2,
  IDLE_N: 3,
  WALK_S: { start: 4, end: 9 },
  WALK_E: { start: 10, end: 15 },
  // Casey custom idle animations (16 frames each)
  IDLE_SHIFT: { start: 16, end: 31 },
  IDLE_PHONE: { start: 32, end: 47 },
  IDLE_LOOK:  { start: 48, end: 63 },
  IDLE_SIGH:  { start: 64, end: 79 },
};

export const VOSS_FRAMES = {
  ...CHAR_FRAMES,
  WALK_N: { start: 16, end: 21 },
};

// NPC animation frame ranges
export const GLADYS_FRAMES = {
  CROSSWORD: { start: 4, end: 19 },
};

export const MRSG_FRAMES = {
  SEATED: { start: 4, end: 19 },
};

const IDLE_ANIMS = ['idle_shift', 'idle_phone', 'idle_look', 'idle_sigh'];

export class Player {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;

  private targetX: number | null = null;
  private targetY: number | null = null;
  private isWalking = false;
  private onArrival: (() => void) | null = null;
  private facing: 'south' | 'west' | 'east' | 'north' = 'south';
  private textureKey: string;

  private idleTimer = 0;
  private idlePlaying = false;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey = 'char_casey') {
    this.scene = scene;
    this.textureKey = textureKey;

    this.container = scene.add.container(x, y);
    this.container.setDepth(500);

    this.sprite = scene.add.sprite(0, 0, textureKey, CHAR_FRAMES.IDLE_S);
    this.sprite.setOrigin(0.5, 1);
    this.container.add(this.sprite);

    this.createAnims();
  }

  private createAnims(): void {
    const key = this.textureKey;
    if (this.scene.anims.exists(`${key}_walk_s`)) return;

    this.scene.anims.create({
      key: `${key}_walk_s`,
      frames: this.scene.anims.generateFrameNumbers(key, {
        start: CHAR_FRAMES.WALK_S.start, end: CHAR_FRAMES.WALK_S.end,
      }),
      frameRate: 10, repeat: -1,
    });

    this.scene.anims.create({
      key: `${key}_walk_e`,
      frames: this.scene.anims.generateFrameNumbers(key, {
        start: CHAR_FRAMES.WALK_E.start, end: CHAR_FRAMES.WALK_E.end,
      }),
      frameRate: 10, repeat: -1,
    });

    // Casey idle behavior animations (play once, return to idle frame)
    const idleAnims: { name: string; frames: { start: number; end: number } }[] = [
      { name: 'idle_shift', frames: CHAR_FRAMES.IDLE_SHIFT },
      { name: 'idle_phone', frames: CHAR_FRAMES.IDLE_PHONE },
      { name: 'idle_look',  frames: CHAR_FRAMES.IDLE_LOOK },
      { name: 'idle_sigh',  frames: CHAR_FRAMES.IDLE_SIGH },
    ];

    for (const anim of idleAnims) {
      this.scene.anims.create({
        key: `${key}_${anim.name}`,
        frames: this.scene.anims.generateFrameNumbers(key, {
          start: anim.frames.start, end: anim.frames.end,
        }),
        frameRate: 6, repeat: 0,
      });
    }
  }

  walkTo(x: number, y: number, onArrival?: () => void): void {
    this.targetX = x;
    this.targetY = y;
    this.isWalking = true;
    this.idleTimer = 0;
    this.idlePlaying = false;
    this.onArrival = onArrival ?? null;

    const dx = x - this.container.x;
    const dy = y - this.container.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'east' : 'west';
    } else {
      this.facing = dy > 0 ? 'south' : 'north';
    }

    this.playWalkAnim();
  }

  private playWalkAnim(): void {
    const key = this.textureKey;
    switch (this.facing) {
      case 'south':
        this.sprite.setFlipX(false);
        this.sprite.play(`${key}_walk_s`);
        break;
      case 'east':
        this.sprite.setFlipX(false);
        this.sprite.play(`${key}_walk_e`);
        break;
      case 'west':
        this.sprite.setFlipX(true);
        this.sprite.play(`${key}_walk_e`);
        break;
      case 'north':
        this.sprite.setFlipX(false);
        this.sprite.setFrame(CHAR_FRAMES.IDLE_N);
        break;
    }
  }

  private setIdleFrame(): void {
    this.sprite.stop();
    this.sprite.setFlipX(false);
    switch (this.facing) {
      case 'south': this.sprite.setFrame(CHAR_FRAMES.IDLE_S); break;
      case 'west': this.sprite.setFrame(CHAR_FRAMES.IDLE_W); break;
      case 'east': this.sprite.setFrame(CHAR_FRAMES.IDLE_E); break;
      case 'north': this.sprite.setFrame(CHAR_FRAMES.IDLE_N); break;
    }
  }

  update(_time: number, delta: number): void {
    if (this.isWalking && this.targetX !== null && this.targetY !== null) {
      this.idleTimer = 0;

      const dx = this.targetX - this.container.x;
      const dy = this.targetY - this.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = (WALK_SPEED * delta) / 1000;

      if (dist <= step) {
        this.container.setPosition(this.targetX, this.targetY);
        this.isWalking = false;
        this.targetX = null;
        this.targetY = null;
        this.setIdleFrame();

        if (this.onArrival) {
          const cb = this.onArrival;
          this.onArrival = null;
          cb();
        }
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        this.container.x += nx * step;
        this.container.y += ny * step;
      }
    } else if (!this.idlePlaying) {
      this.idleTimer += delta;
      if (this.idleTimer > IDLE_TRIGGER_MS) {
        this.idleTimer = 0;
        this.playIdleBehavior();
      }
    }
  }

  private playIdleBehavior(): void {
    if (this.idlePlaying) return;
    this.idlePlaying = true;

    const animName = IDLE_ANIMS[Math.floor(Math.random() * IDLE_ANIMS.length)];
    const key = `${this.textureKey}_${animName}`;

    this.sprite.play(key);
    this.sprite.once('animationcomplete', () => {
      this.setIdleFrame();
      this.idlePlaying = false;
    });
  }

  getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  getIsWalking(): boolean {
    return this.isWalking;
  }

  getSprite(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy();
  }
}
