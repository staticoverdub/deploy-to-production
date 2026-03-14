export interface GameStateData {
  flags: Record<string, boolean | string>;
  inventory: string[];
  relationships: Record<string, number>;
  sceneData: Record<string, Record<string, unknown>>;
}

const SAVE_KEY = 'deploy-to-production-save';

export class GameState {
  private static instance: GameState;

  flags: Record<string, boolean | string> = {};
  private inventory: string[] = [];
  private relationships: Record<string, number> = {};
  private sceneData: Record<string, Record<string, unknown>> = {};

  private constructor() {}

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  // --- Flags (supports boolean and string values) ---

  setFlag(key: string, value: boolean | string = true): void {
    this.flags[key] = value;
  }

  getFlag(key: string): boolean | string | undefined {
    return this.flags[key];
  }

  hasFlag(key: string): boolean {
    return this.flags[key] === true;
  }

  getFlagValue(key: string): boolean | string | undefined {
    return this.flags[key];
  }

  // --- Inventory ---

  addItem(itemId: string): void {
    if (!this.inventory.includes(itemId)) {
      this.inventory.push(itemId);
    }
  }

  removeItem(itemId: string): void {
    this.inventory = this.inventory.filter((id) => id !== itemId);
  }

  hasItem(itemId: string): boolean {
    return this.inventory.includes(itemId);
  }

  getInventory(): string[] {
    return [...this.inventory];
  }

  // --- Relationships ---

  setRelationship(npcId: string, value: number): void {
    this.relationships[npcId] = Math.max(0, Math.min(3, value));
  }

  getRelationship(npcId: string): number {
    return this.relationships[npcId] ?? 0;
  }

  modifyRelationship(npcId: string, delta: number): void {
    const current = this.getRelationship(npcId);
    this.setRelationship(npcId, current + delta);
  }

  // --- Scene Data ---

  setSceneData(sceneKey: string, key: string, value: unknown): void {
    if (!this.sceneData[sceneKey]) {
      this.sceneData[sceneKey] = {};
    }
    this.sceneData[sceneKey][key] = value;
  }

  getSceneData<T = unknown>(sceneKey: string, key: string): T | undefined {
    return this.sceneData[sceneKey]?.[key] as T | undefined;
  }

  // --- Persistence ---

  save(): void {
    const data: GameStateData = {
      flags: { ...this.flags },
      inventory: [...this.inventory],
      relationships: { ...this.relationships },
      sceneData: JSON.parse(JSON.stringify(this.sceneData)),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  load(): boolean {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    try {
      const data: GameStateData = JSON.parse(raw);
      this.flags = data.flags;
      this.inventory = data.inventory;
      this.relationships = data.relationships;
      this.sceneData = data.sceneData;
      return true;
    } catch {
      return false;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  reset(): void {
    this.flags = {};
    this.inventory = [];
    this.relationships = {};
    this.sceneData = {};
    localStorage.removeItem(SAVE_KEY);
  }

  toJSON(): GameStateData {
    return {
      flags: { ...this.flags },
      inventory: [...this.inventory],
      relationships: { ...this.relationships },
      sceneData: JSON.parse(JSON.stringify(this.sceneData)),
    };
  }
}
