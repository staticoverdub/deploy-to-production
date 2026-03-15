import Phaser from 'phaser';
import { GameState } from './GameState';

// Only available in dev mode — Vite replaces import.meta.env.DEV at build time
// In production, this entire class is effectively a no-op
const DEBUG_ENABLED: boolean = import.meta.env.DEV;

const PANEL_W = 260;
const PANEL_H = 340;
const FONT = { fontFamily: 'monospace', fontSize: '8px', color: '#cccccc' };
const FONT_SMALL = { fontFamily: 'monospace', fontSize: '7px', color: '#aaaaaa' };
const FONT_BTN = { fontFamily: 'monospace', fontSize: '8px', color: '#88ccff' };

interface DebugButton {
  label: string;
  action: () => void;
  y: number;
  textObj?: Phaser.GameObjects.Text;
}

export class DebugMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private visible = false;
  private buttons: DebugButton[] = [];
  private flagsText: Phaser.GameObjects.Text | null = null;
  private inventoryText: Phaser.GameObjects.Text | null = null;
  private fpsText: Phaser.GameObjects.Text | null = null;
  private sceneText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!DEBUG_ENABLED) return;

    // Listen for ^ (Shift+6) to toggle
    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === '^') {
        this.toggle();
      }
    });
  }

  toggle(): void {
    if (!DEBUG_ENABLED) return;
    this.visible = !this.visible;
    if (this.visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  update(): void {
    if (!DEBUG_ENABLED || !this.visible || !this.container) return;

    // Update FPS
    if (this.fpsText) {
      this.fpsText.setText(`FPS: ${Math.round(this.scene.game.loop.actualFps)}`);
    }

    // Update scene name
    if (this.sceneText) {
      this.sceneText.setText(`Scene: ${this.scene.scene.key}`);
    }

    // Update flags
    if (this.flagsText) {
      const flags = GameState.getInstance().flags;
      const flagList = Object.entries(flags)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n');
      this.flagsText.setText(flagList || '  (none)');
    }

    // Update inventory
    if (this.inventoryText) {
      const items = GameState.getInstance().getInventory();
      this.inventoryText.setText(items.length > 0 ? items.map(i => `  ${i}`).join('\n') : '  (empty)');
    }
  }

  private show(): void {
    if (this.container) this.hide();

    this.container = this.scene.add.container(8, 8).setDepth(99999).setScrollFactor(0);

    // Background panel
    const bg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x000000, 0.85)
      .setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x444466);
    this.container.add(bg);

    // Title
    this.container.add(
      this.scene.add.text(8, 6, 'DEBUG MENU (^ to close)', {
        ...FONT, color: '#ffcc00', fontStyle: 'bold',
      })
    );

    // Scene + FPS
    this.sceneText = this.scene.add.text(8, 20, `Scene: ${this.scene.scene.key}`, FONT);
    this.container.add(this.sceneText);
    this.fpsText = this.scene.add.text(180, 20, 'FPS: --', FONT);
    this.container.add(this.fpsText);

    // Buttons
    let btnY = 36;
    this.buttons = [];

    this.addButton('Skip to Lobby', btnY, () => {
      GameState.getInstance().reset();
      this.scene.scene.start('LobbyScene');
    });
    btnY += 14;

    this.addButton('Skip to Bullpen', btnY, () => {
      const st = GameState.getInstance();
      st.reset();
      for (const f of ['scene_lobby_entered', 'badge_quest_active', 'wait_for_voss',
        'voss_convinced', 'has_temp_badge', 'lobby_complete', 'intro_complete']) {
        st.setFlag(f, true);
      }
      st.addItem('temporary_badge');
      this.scene.scene.start('BullpenScene');
    });
    btnY += 14;

    this.addButton('Skip to Bullpen (with items)', btnY, () => {
      const st = GameState.getInstance();
      st.reset();
      for (const f of ['scene_lobby_entered', 'badge_quest_active', 'wait_for_voss',
        'voss_convinced', 'has_temp_badge', 'lobby_complete', 'intro_complete',
        'talked_to_mrs_g', 'casey_motivation']) {
        st.setFlag(f, true);
      }
      st.addItem('temporary_badge');
      st.addItem('cup_of_water');
      st.addItem('lost_cat_flyer');
      this.scene.scene.start('BullpenScene');
    });
    btnY += 14;

    this.addButton('---', btnY, () => {}); // separator
    btnY += 10;

    this.addButton('Give All Items', btnY, () => {
      const st = GameState.getInstance();
      for (const id of ['paper_cup', 'cup_of_water', 'lost_cat_flyer', 'temporary_badge',
        'faded_password_note', 'umbrella', 'supply_closet_code', 'laptop']) {
        if (!st.hasItem(id)) st.addItem(id);
      }
    });
    btnY += 14;

    this.addButton('Set All Flags', btnY, () => {
      const st = GameState.getInstance();
      for (const f of ['intro_complete', 'scene_lobby_entered', 'badge_quest_active',
        'wait_for_voss', 'voss_present', 'voss_convinced', 'has_temp_badge',
        'lobby_complete', 'talked_to_mrs_g', 'casey_motivation',
        'examined_water_cooler', 'examined_bulletin_board', 'seen_cat_flyer',
        'flag_straightened', 'scene_bullpen_entered', 'needs_computer',
        'met_priya', 'examined_priya_whiteboard', 'casey_seen_dashboard',
        'priya_test_active', 'whiteboard_insight', 'printer_fixed',
        'prove_yourself_complete', 'has_supply_code', 'priya_ally',
        'has_laptop', 'bullpen_complete', 'chapter_1_complete']) {
        st.setFlag(f, true);
      }
    });
    btnY += 14;

    this.addButton('Clear State', btnY, () => {
      GameState.getInstance().reset();
    });
    btnY += 14;

    this.addButton('Toggle Hitbox Debug', btnY, () => {
      // Simulate D key press
      this.scene.input.keyboard?.emit('keydown-D');
    });
    btnY += 18;

    // Flags section
    this.container.add(
      this.scene.add.text(8, btnY, 'FLAGS:', { ...FONT_SMALL, color: '#ffaa44' })
    );
    btnY += 12;
    this.flagsText = this.scene.add.text(8, btnY, '  (loading...)', FONT_SMALL);
    this.container.add(this.flagsText);

    // Inventory section (positioned at bottom)
    this.container.add(
      this.scene.add.text(8, PANEL_H - 60, 'INVENTORY:', { ...FONT_SMALL, color: '#44ff88' })
    );
    this.inventoryText = this.scene.add.text(8, PANEL_H - 48, '  (loading...)', FONT_SMALL);
    this.container.add(this.inventoryText);

    // Wire button clicks via canvas mousedown (same pattern as dialogue)
    this.scene.game.canvas.addEventListener('mousedown', this._clickHandler);
  }

  private hide(): void {
    this.scene.game.canvas.removeEventListener('mousedown', this._clickHandler);
    this.container?.destroy();
    this.container = null;
    this.buttons = [];
    this.flagsText = null;
    this.inventoryText = null;
    this.fpsText = null;
    this.sceneText = null;
  }

  private addButton(label: string, y: number, action: () => void): void {
    if (!this.container) return;
    if (label === '---') {
      this.container.add(
        this.scene.add.rectangle(8, y + 3, PANEL_W - 16, 1, 0x444466)
          .setOrigin(0, 0.5)
      );
      return;
    }
    const textObj = this.scene.add.text(12, y, `> ${label}`, FONT_BTN);
    this.container.add(textObj);
    this.buttons.push({ label, action, y: y + 8, textObj }); // +8 for container offset
  }

  private _clickHandler = (e: MouseEvent): void => {
    if (!this.visible || !this.container || e.button !== 0) return;

    const rect = this.scene.game.canvas.getBoundingClientRect();
    const scaleX = this.scene.game.canvas.width / rect.width;
    const scaleY = this.scene.game.canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    // Check if click is inside the panel
    if (px < 8 || px > 8 + PANEL_W || py < 8 || py > 8 + PANEL_H) return;

    // Check each button
    for (const btn of this.buttons) {
      if (btn.textObj) {
        const bx = 8 + 12; // container x + text x offset
        const by = 8 + btn.y - 8; // container y + button y
        const bw = PANEL_W - 24;
        const bh = 12;
        if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
          btn.action();
          // Refresh display after action
          this.update();
          e.stopPropagation();
          e.preventDefault();
          return;
        }
      }
    }
  };

  destroy(): void {
    this.hide();
  }
}
