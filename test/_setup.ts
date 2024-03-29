import { AxisId, ColorId, Constants, DirectionId, GridId, NetworkPuzzle, TexturePalette, TileId } from '../src/constants';
import type { Leak } from '../src/game/leak';
import { Navigator } from '../src/game/navigator';
import { IncomingFlow, Simulator } from '../src/game/simulator';
import { Tile, TileProperties } from '../src/game/tile';
import { Util } from '../src/game/util';

import fs from 'fs';


/**
 * A test DSL for the navigator and simulator modules.
 */
export function DSL(puzzle: Partial<NetworkPuzzle> | number = -1): Impl {
    return new Impl(puzzle);
}

class Impl implements Simulator.Callback, Navigator.Map {
    
    readonly grid: GridId;
    readonly palette: TexturePalette;
    readonly puzzle: NetworkPuzzle;
    readonly sim: Simulator.Kind & {
        readonly leaks: Leak[],
        readonly queue: IncomingFlow[],
        readonly outputs: (IncomingFlow & { satisfied: boolean })[],
    };
    readonly tiles: (Tile | null)[];
    
    victory: boolean;

    constructor(puzzleIn: Partial<NetworkPuzzle> | number) {
        if (puzzleIn === -1) {
            puzzleIn = { id: -1, size: GridId._5x5, inputs: [], outputs: [] };
        } else if (typeof puzzleIn === 'number') {
            puzzleIn = (global as any).PUZZLES[puzzleIn] as NetworkPuzzle;
        }
        
        const puzzle: NetworkPuzzle = {
            id: puzzleIn.id ?? -1,
            size: puzzleIn.size ?? GridId._5x5,
            inputs: puzzleIn.inputs ?? [],
            outputs: puzzleIn.outputs ?? [],
            filters: puzzleIn?.filters ?? [],
        } as NetworkPuzzle;

        const spritesheet: any = { textures: {} };
        const bundle: any = { puzzles: { puzzles: [] }, core: spritesheet, pipe_72: spritesheet, pipe_90: spritesheet, pipe_120: spritesheet };

        this.grid = puzzle.size;
        this.palette = Util.buildPalettes(bundle)[puzzle.size];
        this.puzzle = puzzle as NetworkPuzzle;
        this.sim = Simulator.create(new (global as any).PIXI.Container()) as any;
        this.victory = false;
        this.tiles = Util.nulls(this.palette.width * this.palette.width);
        this.sim.init(this.palette, this);
    }

    place(...tiles: ([number, number, Exclude<TileId, TileId.EMPTY>, DirectionId] | [number, number, Exclude<TileId, TileId.EMPTY>])[]): void {
        for (const [x, y, tileId, rot] of tiles) {
            this.place1(x, y, tileId, rot !== undefined ? rot : DirectionId.LEFT);
        }
    }

    place1(x: number, y: number, tileId: Exclude<TileId, TileId.EMPTY>, rot: DirectionId = DirectionId.LEFT): void {
        const tile = new Tile(this.palette, tileId, x, y);
        this.tiles[x + y * this.palette.width] = tile;
        for (let i = 0; i < rot; i++) {
            tile?.rotate();
        }
        Navigator.updateTile(this, { x, y }, tile);
    }

    label(x: number, y: number, label: { color?: ColorId | null, pressure?: 1 | 2 | 3 | 4 }, key: DirectionId | 0 | 1 = DirectionId.INTERNAL) {
        const tile = this.tiles[x + this.palette.width * y]!;
        const property = tile.property(key);
        
        if (label?.color !== undefined) property.color = label.color;
        if (label?.pressure !== undefined) property.pressure = label.pressure;
        
        Navigator.updateFrom(this, { x, y }, tile, key);
    }

    run(): number {
        let n: number = 0;
        for (; (this.sim as any).queue.length > 0; n++) {
            this.sim.tick(Constants.TICKS_PER_SIMULATOR_STEP, this.palette, this);
        }
        return n;
    }

    at(x: number, y: number, key: DirectionId | AxisId = DirectionId.INTERNAL): TileProperties {
        return this.tiles[x + y * this.palette.width]!.property(key);
    }

    onVictory(): void { this.victory = true; }
    updateTile(): void {}
}


// Mock PIXI
class Point {
    set(): any {}
}

(global as any).PIXI = {
    Container: class {
        children: any[] = [];
        position: Point = new Point();

        constructor() {}
        
        addChild(): void {}
    },
    Graphics: class {
        position: Point = new Point();
        pivot: Point = new Point();

        constructor() {}

        beginFill(): void {}
        drawRect(): void {}
    },
    Sprite: class {
        anchor: Point = new Point();

        constructor() {}
    },
    Ticker: {
        shared: {
            add(): any {}
        }
    },
};

// Load puzzles
(global as any).PUZZLES = JSON.parse(fs.readFileSync('./out/puzzles.json', 'utf8')).puzzles;