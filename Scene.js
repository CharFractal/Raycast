"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scene = void 0;
class Scene {
    constructor(cells) {
        this.height = cells.length;
        this.width = Number.MIN_VALUE;
        for (let row of cells) {
            this.width = Math.max(this.width, row.length);
        }
        this.cells = [];
        for (let row of cells) {
            this.cells = this.cells.concat(row);
            for (let i = 0; i < this.width - row.length; ++i) {
                this.cells.push(null);
            }
        }
    }
    size() {
        return new Vector2(this.width, this.height);
    }
    contains(p) {
        return 0 <= p.x && p.x < this.width && 0 <= p.y && p.y < this.height;
    }
    getCell(p) {
        if (!this.contains(p))
            return undefined;
        const fp = p.map(Math.floor);
        return this.cells[(fp.y * this.width) + fp.x];
    }
}
exports.Scene = Scene;
//# sourceMappingURL=Scene.js.map