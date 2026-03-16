import Phaser from 'phaser';
import { GameState } from './GameState';
import itemsFile from '../data/items.json';

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  usableOn?: string[];
  carriesForward?: boolean;
}

const SLOT_SIZE = 32;
const BAR_HEIGHT = 38;
const BAR_PADDING = 3;

// Parse items from JSON (keyed object format)
const itemsData = (itemsFile as any).items as Record<string, ItemDefinition>;
const ITEM_DEFS: Record<string, ItemDefinition> = {};
for (const [id, def] of Object.entries(itemsData)) {
  ITEM_DEFS[id] = { ...def, id };
}

// Placeholder colors for items (since JSON doesn't include colors)
const ITEM_COLORS: Record<string, number> = {
  temporary_badge: 0x44ff88,
  paper_cup: 0xeeeeee,
  cup_of_water: 0x4488ff,
  lost_cat_flyer: 0xffaa44,
};

function getItemColor(id: string): number {
  return ITEM_COLORS[id] ?? 0xaaaaaa;
}

export class InventoryUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private slots: Phaser.GameObjects.Container[] = [];
  private selectedItem: string | null = null;
  private ghostIcon: Phaser.GameObjects.Container | null = null;
  private inspectPanel: Phaser.GameObjects.Container | null = null;

  onExamineItem: ((text: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(800);
    this.container.setScrollFactor(0);
    this.createBar();
  }

  private createBar(): void {
    const cam = this.scene.cameras.main;
    const barY = cam.height - BAR_HEIGHT;

    const bg = this.scene.add.rectangle(
      cam.width / 2, barY + BAR_HEIGHT / 2,
      cam.width, BAR_HEIGHT, 0x111122, 0.85,
    );
    bg.setStrokeStyle(1, 0x333355, 0.6);
    this.container.add(bg);
  }

  refresh(): void {
    for (const slot of this.slots) slot.destroy();
    this.slots = [];

    const state = GameState.getInstance();
    const items = state.getInventory();
    const cam = this.scene.cameras.main;
    const barY = cam.height - BAR_HEIGHT;
    const startX = BAR_PADDING + SLOT_SIZE / 2;

    items.forEach((itemId, i) => {
      const def = ITEM_DEFS[itemId];
      if (!def) return;

      const x = startX + i * (SLOT_SIZE + BAR_PADDING);
      const y = barY + BAR_HEIGHT / 2;

      const slotContainer = this.scene.add.container(x, y);

      const isSelected = this.selectedItem === itemId;
      const slotBg = this.scene.add.rectangle(0, 0, SLOT_SIZE, SLOT_SIZE, 0x222244, 0.6);
      slotBg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffff44 : 0x555577);
      slotContainer.add(slotBg);

      // Icon: sprite if loaded, else colored placeholder
      if (this.scene.textures.exists(def.icon)) {
        const icon = this.scene.add.image(0, 0, def.icon);
        icon.setDisplaySize(SLOT_SIZE - 8, SLOT_SIZE - 8);
        slotContainer.add(icon);
      } else {
        const color = getItemColor(itemId);
        const icon = this.scene.add.rectangle(0, 0, SLOT_SIZE - 8, SLOT_SIZE - 8, color);
        slotContainer.add(icon);

        const initials = def.name.split(' ').map((w) => w.charAt(0)).join('').substring(0, 2);
        const label = this.scene.add.text(0, 0, initials, {
          fontFamily: 'monospace', fontSize: '9px', color: '#000000', fontStyle: 'bold',
        });
        label.setOrigin(0.5);
        slotContainer.add(label);
      }

      slotBg.setInteractive();
      slotBg.setScrollFactor(0);

      slotBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          this.showInspectPanel(def);
          return;
        }

        if (this.scene.cache.audio.exists('sfx_ui_click')) {
          this.scene.sound.play('sfx_ui_click', { volume: 0.3 });
        }

        if (this.selectedItem === itemId) {
          this.deselectItem();
          this.refresh();
        } else if (this.selectedItem) {
          this.deselectItem();
          this.refresh();
        } else {
          this.selectItem(itemId);
        }
      });

      slotBg.on('pointerover', () => {
        if (this.selectedItem !== itemId) slotBg.setStrokeStyle(2, 0xffffff);
      });
      slotBg.on('pointerout', () => {
        const sel = this.selectedItem === itemId;
        slotBg.setStrokeStyle(sel ? 2 : 1, sel ? 0xffff44 : 0x555577);
      });

      this.container.add(slotContainer);
      this.slots.push(slotContainer);
    });
  }

  private selectItem(itemId: string): void {
    this.deselectItem();
    this.selectedItem = itemId;
    this.refresh();

    const color = getItemColor(itemId);
    this.ghostIcon = this.scene.add.container(0, 0);
    this.ghostIcon.setDepth(1100).setScrollFactor(0);

    if (this.scene.textures.exists(ITEM_DEFS[itemId]?.icon ?? '')) {
      const ghost = this.scene.add.image(0, 0, ITEM_DEFS[itemId].icon);
      ghost.setDisplaySize(16, 16);
      ghost.setAlpha(0.6);
      this.ghostIcon.add(ghost);
    } else {
      const ghost = this.scene.add.rectangle(0, 0, 16, 16, color, 0.6);
      this.ghostIcon.add(ghost);
    }

    this.scene.input.on('pointermove', this.updateGhost, this);
  }

  private deselectItem(): void {
    this.selectedItem = null;
    if (this.ghostIcon) { this.ghostIcon.destroy(); this.ghostIcon = null; }
    this.scene.input.off('pointermove', this.updateGhost, this);
  }

  private updateGhost = (pointer: Phaser.Input.Pointer): void => {
    if (this.ghostIcon) this.ghostIcon.setPosition(pointer.x, pointer.y - 12);
  };

  getSelectedItem(): string | null {
    return this.selectedItem;
  }

  clearSelection(): void {
    this.deselectItem();
    this.refresh();
  }

  static getItemDef(itemId: string): ItemDefinition | undefined {
    return ITEM_DEFS[itemId];
  }

  private showInspectPanel(def: ItemDefinition): void {
    this.dismissInspectPanel();

    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2 - 20;
    const panelW = 260;
    const iconSize = 48;
    const padding = 12;

    this.inspectPanel = this.scene.add.container(0, 0).setDepth(2000).setScrollFactor(0);

    // Dim overlay
    const overlay = this.scene.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x000000, 0.5);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.dismissInspectPanel());
    this.inspectPanel.add(overlay);

    // Item name
    const nameText = this.scene.add.text(cx, cy - iconSize / 2 - padding - 4, def.name.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '9px', color: '#ffdd44', fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 1);
    this.inspectPanel.add(nameText);

    // Icon (scaled up)
    if (this.scene.textures.exists(def.icon)) {
      const icon = this.scene.add.image(cx, cy, def.icon);
      icon.setDisplaySize(iconSize, iconSize);
      this.inspectPanel.add(icon);

      // Icon border
      const border = this.scene.add.rectangle(cx, cy, iconSize + 4, iconSize + 4);
      border.setStrokeStyle(1, 0x555577);
      border.setFillStyle(0x222244, 0.4);
      this.inspectPanel.add(border);
      this.inspectPanel.moveTo(border, 1); // behind icon
    }

    // Description text (word-wrapped)
    const descText = this.scene.add.text(cx, cy + iconSize / 2 + padding, def.description, {
      fontFamily: 'monospace', fontSize: '7px', color: '#cccccc',
      align: 'center', wordWrap: { width: panelW - padding * 2 }, lineSpacing: 3,
    }).setOrigin(0.5, 0);
    this.inspectPanel.add(descText);

    // "Right-click to close" hint
    const hint = this.scene.add.text(cx, descText.y + descText.height + padding + 2, '[ click to close ]', {
      fontFamily: 'monospace', fontSize: '6px', color: '#666688',
      align: 'center',
    }).setOrigin(0.5, 0);
    this.inspectPanel.add(hint);

    // Panel background (sized to fit content)
    const topY = nameText.y - nameText.height - padding;
    const bottomY = hint.y + hint.height + padding;
    const panelH = bottomY - topY;
    const panelBg = this.scene.add.rectangle(cx, topY + panelH / 2, panelW, panelH, 0x0a0a1a, 0.92);
    panelBg.setStrokeStyle(1, 0x444466);
    this.inspectPanel.add(panelBg);
    this.inspectPanel.moveTo(panelBg, 1); // behind everything except overlay

    // SFX
    if (this.scene.cache.audio.exists('sfx_ui_click')) {
      this.scene.sound.play('sfx_ui_click', { volume: 0.2 });
    }
  }

  private dismissInspectPanel(): void {
    if (this.inspectPanel) {
      this.inspectPanel.destroy();
      this.inspectPanel = null;
    }
  }

  get isInspecting(): boolean {
    return this.inspectPanel !== null;
  }

  destroy(): void {
    this.deselectItem();
    this.dismissInspectPanel();
    this.container.destroy();
  }
}
