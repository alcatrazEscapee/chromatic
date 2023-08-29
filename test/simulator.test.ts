import { ColorId, Constants, DirectionId, NetworkPuzzle, TileId } from "../src/constants";
import { Leak } from "../src/leak";
import { IncomingFlow, Simulator } from "../src/simulator";
import { Tile } from "../src/tile";
import { Util } from "../src/util";


test('simulator id=0 -> leak from input', () => {
    const map = mapOf(0);

    map.run(1);

    expect(map.victory()).toBe(false);
    expect(map.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> leak from straight', () => {
    const map = mapOf(0);

    map.tile(0, 1, TileId.STRAIGHT);
    map.run(2);

    expect(map.victory()).toBe(false);
    expect(map.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> leak into straight perpendicular', () => {
    const map = mapOf(0);

    map.tiles([
        [0, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 1, TileId.CURVE, DirectionId.LEFT],
        [1, 0, TileId.CURVE, DirectionId.DOWN],
        [0, 0, TileId.CURVE, DirectionId.RIGHT],
    ]);
    map.run(5);

    expect(map.victory()).toBe(false);
    expect(map.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 0, y: 1}, 120)]);
});

test('simulator id=0 -> straight path wrong label', () => {
    const map = mapOf(0);

    map.tiles([
        [0, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [2, 1, TileId.STRAIGHT, DirectionId.LEFT],
    ])
    map.label(1, 1, DirectionId.INTERNAL, { color: ColorId.RED });
    map.run(4);

    expect(map.victory()).toBe(false);
    expect(map.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> straight path victory', () => {
    const map = mapOf(0);

    map.tiles([
        [0, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [2, 1, TileId.STRAIGHT, DirectionId.LEFT],
    ])
    map.run(4);

    expect(map.victory()).toBe(true);
});



interface MapOf {
    puzzle: NetworkPuzzle,
    sim: Simulator.Kind & {
        leaks: Leak[],
        outputs: (IncomingFlow & { satisfied: boolean })[],
    },

    tiles(tiles: [number, number, Exclude<TileId, TileId.EMPTY>, DirectionId][]): void;
    tile(x: number, y: number, tileId: Exclude<TileId, TileId.EMPTY>, rot?: DirectionId): void;
    label(x: number, y: number, key: DirectionId, label?: { color?: ColorId | null, pressure?: 1 | 2 | 3 | 4 }): void;
    run(n: number): void;
    victory(): boolean;
}

function mapOf(puzzle: NetworkPuzzle | number): MapOf {
    if (typeof puzzle === 'number') {
        puzzle = (global as any).PUZZLES[puzzle] as NetworkPuzzle;
    }
    const width = puzzle.size + Constants.GRID_ID_TO_WIDTH;
    const palette = Util.buildPalettes({} as any, false)[puzzle.size];
    const map: MapOf & { _tiles: (Tile | null)[] } = {
        puzzle: puzzle,
        sim: Simulator.create(new (global as any).PIXI.Container()) as any,

        _tiles: [],

        tiles(tiles: [number, number, Exclude<TileId, TileId.EMPTY>, DirectionId][]): void {
            for (const [x, y, tileId, rot] of tiles) {
                map.tile(x, y, tileId, rot);
            }
        },
        tile(x: number, y: number, tileId: Exclude<TileId, TileId.EMPTY>, rot: DirectionId = DirectionId.LEFT): void {
            map._tiles[x + y * width] = new Tile(tileId);
            for (let i = 0; i < rot; i++) {
                map._tiles[x + y * width]?.rotate();
            }
        },
        label(x: number, y: number, key: DirectionId, label?: { color?: ColorId | null, pressure?: 1 | 2 | 3 | 4 }) {
            const property = map._tiles[x + width * y]!.property(key);
            if (label?.color !== undefined) property.color = label.color;
            if (label?.pressure !== undefined) property.pressure = label.pressure;
        },
        run(n: number): void {
            for (let i = 0; i < n; i++) map.sim.tick(Constants.TICKS_PER_SIMULATOR_STEP, palette, map._tiles);
        },
        victory(): boolean {
            for (const out of map.sim.outputs)
                if (!out.satisfied)
                    return false;
            return true;
        }
    };

    map.sim.init(palette, puzzle);
    for (let i = 0; i < width * width; i++) {
        map._tiles.push(null);
    }
    return map;
}
