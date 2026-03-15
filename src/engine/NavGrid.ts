import Phaser from 'phaser';

const CELL = 8; // grid cell size in pixels

export interface Obstacle {
  x: number; y: number; w: number; h: number;
}

export class NavGrid {
  private cols: number;
  private rows: number;
  private originX: number;
  private originY: number;
  private blocked: boolean[][];
  private obstacles: Obstacle[] = [];

  constructor(
    private minX: number, private minY: number,
    private maxX: number, private maxY: number,
  ) {
    this.originX = minX;
    this.originY = minY;
    this.cols = Math.ceil((maxX - minX) / CELL);
    this.rows = Math.ceil((maxY - minY) / CELL);
    this.blocked = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
  }

  addObstacle(x: number, y: number, w: number, h: number, padding = 6): void {
    this.obstacles.push({ x: x - padding, y: y - padding, w: w + padding * 2, h: h + padding * 2 });
    this.rebuildGrid();
  }

  private rebuildGrid(): void {
    // Clear
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.blocked[r][c] = false;
      }
    }
    // Mark cells overlapping obstacles
    for (const obs of this.obstacles) {
      const c0 = Math.max(0, Math.floor((obs.x - this.originX) / CELL));
      const c1 = Math.min(this.cols - 1, Math.floor((obs.x + obs.w - this.originX) / CELL));
      const r0 = Math.max(0, Math.floor((obs.y - this.originY) / CELL));
      const r1 = Math.min(this.rows - 1, Math.floor((obs.y + obs.h - this.originY) / CELL));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          this.blocked[r][c] = true;
        }
      }
    }
  }

  findPath(sx: number, sy: number, ex: number, ey: number): { x: number; y: number }[] {
    const sc = this.worldToGrid(sx, sy);
    const ec = this.worldToGrid(ex, ey);

    // If end is blocked, find nearest unblocked cell
    if (this.isBlocked(ec.r, ec.c)) {
      const nearest = this.findNearestOpen(ec.r, ec.c);
      if (!nearest) return [{ x: ex, y: ey }]; // fallback
      ec.r = nearest.r;
      ec.c = nearest.c;
    }

    // If start is blocked, allow it (Casey might be standing in an obstacle)
    // A* pathfinding
    const path = this.astar(sc.r, sc.c, ec.r, ec.c);
    if (!path) return [{ x: ex, y: ey }]; // fallback: straight line

    // Convert grid path to world waypoints, simplify to corners only
    return this.simplifyPath(path);
  }

  private worldToGrid(wx: number, wy: number): { r: number; c: number } {
    return {
      c: Phaser.Math.Clamp(Math.floor((wx - this.originX) / CELL), 0, this.cols - 1),
      r: Phaser.Math.Clamp(Math.floor((wy - this.originY) / CELL), 0, this.rows - 1),
    };
  }

  private gridToWorld(r: number, c: number): { x: number; y: number } {
    return {
      x: this.originX + c * CELL + CELL / 2,
      y: this.originY + r * CELL + CELL / 2,
    };
  }

  private isBlocked(r: number, c: number): boolean {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
    return this.blocked[r][c];
  }

  private findNearestOpen(r: number, c: number): { r: number; c: number } | null {
    // BFS spiral from target to find nearest open cell
    for (let radius = 1; radius < Math.max(this.rows, this.cols); radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
          const nr = r + dr, nc = c + dc;
          if (!this.isBlocked(nr, nc)) return { r: nr, c: nc };
        }
      }
    }
    return null;
  }

  private astar(sr: number, sc: number, er: number, ec: number): { r: number; c: number }[] | null {
    const key = (r: number, c: number) => r * this.cols + c;
    const open = new Map<number, { r: number; c: number; g: number; f: number }>();
    const closed = new Set<number>();
    const parent = new Map<number, number>();

    const h = (r: number, c: number) => Math.abs(r - er) + Math.abs(c - ec);
    const startKey = key(sr, sc);
    open.set(startKey, { r: sr, c: sc, g: 0, f: h(sr, sc) });

    // 8-directional movement
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    const costs = [1, 1, 1, 1, 1.41, 1.41, 1.41, 1.41];

    let iterations = 0;
    while (open.size > 0 && iterations < 5000) {
      iterations++;
      // Find lowest f
      let best: { r: number; c: number; g: number; f: number } | null = null;
      let bestKey = -1;
      for (const [k, node] of open) {
        if (!best || node.f < best.f) { best = node; bestKey = k; }
      }
      if (!best) break;
      open.delete(bestKey);
      closed.add(bestKey);

      if (best.r === er && best.c === ec) {
        // Reconstruct path
        const path: { r: number; c: number }[] = [];
        let k = key(er, ec);
        while (k !== startKey) {
          const r = Math.floor(k / this.cols);
          const c = k % this.cols;
          path.unshift({ r, c });
          const p = parent.get(k);
          if (p === undefined) break;
          k = p;
        }
        return path;
      }

      for (let d = 0; d < dirs.length; d++) {
        const nr = best.r + dirs[d][0];
        const nc = best.c + dirs[d][1];
        if (this.isBlocked(nr, nc)) continue;
        // For diagonal movement, check that both adjacent cardinal cells are open
        if (d >= 4) {
          if (this.isBlocked(best.r + dirs[d][0], best.c) || this.isBlocked(best.r, best.c + dirs[d][1])) continue;
        }
        const nk = key(nr, nc);
        if (closed.has(nk)) continue;
        const ng = best.g + costs[d];
        const existing = open.get(nk);
        if (existing && existing.g <= ng) continue;
        open.set(nk, { r: nr, c: nc, g: ng, f: ng + h(nr, nc) });
        parent.set(nk, bestKey);
      }
    }
    return null; // no path found
  }

  private simplifyPath(gridPath: { r: number; c: number }[]): { x: number; y: number }[] {
    if (gridPath.length === 0) return [];
    if (gridPath.length === 1) return [this.gridToWorld(gridPath[0].r, gridPath[0].c)];

    // Keep waypoints where direction changes
    const waypoints: { x: number; y: number }[] = [];
    let prevDr = gridPath[0].r;
    let prevDc = gridPath[0].c;

    for (let i = 1; i < gridPath.length; i++) {
      const dr = gridPath[i].r - gridPath[i - 1].r;
      const dc = gridPath[i].c - gridPath[i - 1].c;
      if (i === 1 || dr !== (gridPath[i - 1].r - gridPath[i - 2].r) || dc !== (gridPath[i - 1].c - gridPath[i - 2].c)) {
        waypoints.push(this.gridToWorld(gridPath[i - 1].r, gridPath[i - 1].c));
      }
    }
    // Always include final point
    const last = gridPath[gridPath.length - 1];
    waypoints.push(this.gridToWorld(last.r, last.c));

    return waypoints;
  }

  // Debug: draw grid on a Phaser graphics object
  drawDebug(graphics: Phaser.GameObjects.Graphics): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.blocked[r][c]) {
          const wx = this.originX + c * CELL;
          const wy = this.originY + r * CELL;
          graphics.fillStyle(0xff0000, 0.3);
          graphics.fillRect(wx, wy, CELL, CELL);
        }
      }
    }
    // Draw grid lines faintly
    graphics.lineStyle(1, 0xffffff, 0.05);
    for (let r = 0; r <= this.rows; r++) {
      graphics.lineBetween(this.originX, this.originY + r * CELL, this.originX + this.cols * CELL, this.originY + r * CELL);
    }
    for (let c = 0; c <= this.cols; c++) {
      graphics.lineBetween(this.originX + c * CELL, this.originY, this.originX + c * CELL, this.originY + this.rows * CELL);
    }
  }
}
