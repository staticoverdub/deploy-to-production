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

      slotBg.setInteractive({ useHandCursor: true });

      slotBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          if (this.onExamineItem) this.onExamineItem(def.description);
          return;
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
    this.ghostIcon.setDepth(1100);

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

  destroy(): void {
    this.deselectItem();
    this.container.destroy();
  }
}
