import Phaser from 'phaser';
import { GameState } from './GameState';

const DEBUG_ENABLED: boolean = import.meta.env.DEV;

const PANEL_W = 260;
const PANEL_H = 360;
const DEBUG_FONT = 'Arial, Helvetica, sans-serif';
const FONT = { fontFamily: DEBUG_FONT, fontSize: '10px', color: '#cccccc' };
const FONT_SMALL = { fontFamily: DEBUG_FONT, fontSize: '9px', color: '#aaaaaa' };
const FONT_BTN = { fontFamily: DEBUG_FONT, fontSize: '10px', color: '#88ccff' };
const FONT_BTN_SEL = { fontFamily: DEBUG_FONT, fontSize: '10px', color: '#ffffff' };

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
  private selectedIndex = 0;
  private flagsText: Phaser.GameObjects.Text | null = null;
  private inventoryText: Phaser.GameObjects.Text | null = null;
  private fpsText: Phaser.GameObjects.Text | null = null;
  private sceneText: Phaser.GameObjects.Text | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!DEBUG_ENABLED) return;

    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === '^') {
        this.toggle();
      }
    });
  }

  toggle(): void {
    if (!DEBUG_ENABLED) return;
    this.visible = !this.visible;
    if (this.visible) this.show();
    else this.hide();
  }

  update(): void {
    if (!DEBUG_ENABLED || !this.visible || !this.container) return;

    if (this.fpsText) {
      this.fpsText.setText(`FPS: ${Math.round(this.scene.game.loop.actualFps)}`);
    }
    if (this.sceneText) {
      this.sceneText.setText(`Scene: ${this.scene.scene.key}`);
    }
    if (this.flagsText) {
      const flags = GameState.getInstance().flags;
      const flagList = Object.entries(flags).map(([k, v]) => `  ${k}: ${v}`).join('\n');
      this.flagsText.setText(flagList || '  (none)');
    }
    if (this.inventoryText) {
      const items = GameState.getInstance().getInventory();
      this.inventoryText.setText(items.length > 0 ? items.map(i => `  ${i}`).join('\n') : '  (empty)');
    }
  }

  private show(): void {
    if (this.container) this.hide();
    this.selectedIndex = 0;

    this.container = this.scene.add.container(8, 8).setDepth(99999).setScrollFactor(0);

    const bg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x000000, 0.85).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x444466);
    this.container.add(bg);

    this.container.add(
      this.scene.add.text(8, 6, 'DEBUG MENU  ^ close  \u2191\u2193 Enter', {
        ...FONT, color: '#ffcc00', fontStyle: 'bold',
      })
    );

    this.sceneText = this.scene.add.text(8, 20, `Scene: ${this.scene.scene.key}`, FONT);
    this.container.add(this.sceneText);
    this.fpsText = this.scene.add.text(180, 20, 'FPS: --', FONT);
    this.container.add(this.fpsText);

    let btnY = 36;
    this.buttons = [];

    this.addButton('Skip to Lobby', btnY, () => {
      GameState.getInstance().reset();
      this.scene.scene.start('LobbyScene');
    }); btnY += 14;

    this.addButton('Skip to Bullpen', btnY, () => {
      const st = GameState.getInstance(); st.reset();
      for (const f of ['scene_lobby_entered', 'badge_quest_active', 'wait_for_voss',
        'voss_convinced', 'has_temp_badge', 'lobby_complete', 'intro_complete'])
        st.setFlag(f, true);
      st.addItem('temporary_badge');
      this.scene.scene.start('BullpenScene');
    }); btnY += 14;

    this.addButton('Skip to Bullpen (with items)', btnY, () => {
      const st = GameState.getInstance(); st.reset();
      for (const f of ['scene_lobby_entered', 'badge_quest_active', 'wait_for_voss',
        'voss_convinced', 'has_temp_badge', 'lobby_complete', 'intro_complete',
        'talked_to_mrs_g', 'casey_motivation'])
        st.setFlag(f, true);
      st.addItem('temporary_badge'); st.addItem('cup_of_water'); st.addItem('lost_cat_flyer');
      this.scene.scene.start('BullpenScene');
    }); btnY += 14;

    this.addButton('Skip to Mail Cart', btnY, () => {
      const st = GameState.getInstance(); st.reset();
      for (const f of ['scene_lobby_entered', 'lobby_complete', 'intro_complete'])
        st.setFlag(f, true);
      this.scene.scene.start('MailCartScene');
    }); btnY += 14;

    this.addButton('Skip to Mail Cart (+coffee)', btnY, () => {
      const st = GameState.getInstance(); st.reset();
      for (const f of ['scene_lobby_entered', 'lobby_complete', 'intro_complete'])
        st.setFlag(f, true);
      st.addItem('lobby_coffee');
      this.scene.scene.start('MailCartScene');
    }); btnY += 14;

    this.addButton('---', btnY, () => {}); btnY += 10;

    this.addButton('Give All Items', btnY, () => {
      const st = GameState.getInstance();
      for (const id of ['paper_cup', 'cup_of_water', 'lost_cat_flyer', 'temporary_badge',
        'faded_password_note', 'umbrella', 'supply_closet_code', 'laptop'])
        if (!st.hasItem(id)) st.addItem(id);
    }); btnY += 14;

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
        'has_laptop', 'bullpen_complete', 'chapter_1_complete',
        'mailcart_complete'])
        st.setFlag(f, true);
    }); btnY += 14;

    this.addButton('Clear State', btnY, () => {
      GameState.getInstance().reset();
    }); btnY += 14;

    this.addButton('Toggle Hitbox Debug', btnY, () => {
      this.scene.input.keyboard?.emit('keydown-D');
    }); btnY += 18;

    // Flags
    this.container.add(
      this.scene.add.text(8, btnY, 'FLAGS:', { ...FONT_SMALL, color: '#ffaa44' })
    ); btnY += 12;
    this.flagsText = this.scene.add.text(8, btnY, '  (loading...)', FONT_SMALL);
    this.container.add(this.flagsText);

    // Inventory
    this.container.add(
      this.scene.add.text(8, PANEL_H - 60, 'INVENTORY:', { ...FONT_SMALL, color: '#44ff88' })
    );
    this.inventoryText = this.scene.add.text(8, PANEL_H - 48, '  (loading...)', FONT_SMALL);
    this.container.add(this.inventoryText);

    // Highlight first button
    this.updateSelection();

    // Keyboard navigation
    this.keyHandler = (event: KeyboardEvent) => {
      if (!this.visible) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
        this.updateSelection();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
        this.updateSelection();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (this.buttons[this.selectedIndex]) {
          this.buttons[this.selectedIndex].action();
          this.update();
        }
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // Mouse clicks
    this.scene.game.canvas.addEventListener('mousedown', this._clickHandler);
  }

  private hide(): void {
    this.scene.game.canvas.removeEventListener('mousedown', this._clickHandler);
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.container?.destroy();
    this.container = null;
    this.buttons = [];
    this.selectedIndex = 0;
    this.flagsText = null;
    this.inventoryText = null;
    this.fpsText = null;
    this.sceneText = null;
  }

  private updateSelection(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn.textObj) {
        if (i === this.selectedIndex) {
          btn.textObj.setColor('#ffffff');
          btn.textObj.setText(`\u25B6 ${btn.label}`);
        } else {
          btn.textObj.setColor('#88ccff');
          btn.textObj.setText(`  ${btn.label}`);
        }
      }
    }
  }

  private addButton(label: string, y: number, action: () => void): void {
    if (!this.container) return;
    if (label === '---') {
      this.container.add(
        this.scene.add.rectangle(8, y + 3, PANEL_W - 16, 1, 0x444466).setOrigin(0, 0.5)
      );
      return;
    }
    const textObj = this.scene.add.text(12, y, `  ${label}`, FONT_BTN);
    this.container.add(textObj);
    this.buttons.push({ label, action, y: y + 8, textObj });
  }

  private _clickHandler = (e: MouseEvent): void => {
    if (!this.visible || !this.container || e.button !== 0) return;

    const rect = this.scene.game.canvas.getBoundingClientRect();
    const scaleX = this.scene.game.canvas.width / rect.width;
    const scaleY = this.scene.game.canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    if (px < 8 || px > 8 + PANEL_W || py < 8 || py > 8 + PANEL_H) return;

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (btn.textObj) {
        const bx = 8 + 12;
        const by = 8 + btn.y - 8;
        const bw = PANEL_W - 24;
        const bh = 12;
        if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
          this.selectedIndex = i;
          this.updateSelection();
          btn.action();
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
