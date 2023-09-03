import { ColorId, DirectionId, NetworkPuzzle, TileId } from "../src/gen/constants";
import { IncomingFlow, Simulator } from "../src/game/simulator";
import { Leak } from "../src/game/leak";
import { Tile } from "../src/game/tile";
import { Util } from "../src/game/util";
import { Navigator } from "../src/game/navigator";


test('simulator id=0 -> leak from input', () => {
    const map = mapOf(0);

    expect(map.run()).toBe(1);
    expect(map.victory).toBe(false);
    expect(map.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> leak from straight', () => {
    const map = mapOf(0);

    map.place1(0, 1, TileId.STRAIGHT);

    expect(map.run()).toBe(2);
    expect(map.victory).toBe(false);
    expect(map.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> leak into straight perpendicular', () => {
    const map = mapOf(0);

    map.place([
        [0, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 1, TileId.CURVE, DirectionId.LEFT],
        [1, 0, TileId.CURVE, DirectionId.DOWN],
        [0, 0, TileId.CURVE, DirectionId.RIGHT],
    ]);

    expect(map.run()).toBe(5);
    expect(map.victory).toBe(false);
    expect(map.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 0, y: 1}, 120)]);
});

test('simulator id=0 -> straight path wrong label', () => {
    const map = mapOf(0);

    map.place([
        [0, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [2, 1, TileId.STRAIGHT, DirectionId.LEFT],
    ])
    map.label(1, 1, DirectionId.INTERNAL, { color: ColorId.RED });

    expect(map.run()).toBe(1);
    expect(map.victory).toBe(false);
    expect(map.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> straight path victory', () => {
    const map = mapOf(0);

    map.place([
        [0, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 1, TileId.STRAIGHT, DirectionId.LEFT],
        [2, 1, TileId.STRAIGHT, DirectionId.LEFT],
    ])

    expect(map.run()).toBe(4);
    expect(map.victory).toBe(true);
});

test('simulator id=80 -> victory, filter works', () => {
    const map = mapOf(80);

    map.place([
        [0, 0, TileId.CURVE, DirectionId.RIGHT],
        [1, 0, TileId.UNMIX, DirectionId.DOWN],
        [0, 1, TileId.CURVE, DirectionId.UP],
        [1, 1, TileId.MIX, DirectionId.DOWN],
        [1, 2, TileId.STRAIGHT, DirectionId.UP],
    ]);
    map.label(0, 0, DirectionId.INTERNAL, { color: ColorId.RED });

    expect(map.run()).toBe(6);
    expect(map.victory).toBe(true);
});



interface MapOf extends Simulator.Callback, Navigator.Map {
    readonly puzzle: NetworkPuzzle,
    readonly sim: Simulator.Kind & {
        leaks: Leak[],
        outputs: (IncomingFlow & { satisfied: boolean })[],
    },
    readonly victory: boolean,

    place(tiles: [number, number, Exclude<TileId, TileId.EMPTY>, DirectionId][]): void;
    place1(x: number, y: number, tileId: Exclude<TileId, TileId.EMPTY>, rot?: DirectionId): void
    label(x: number, y: number, key: DirectionId, label?: { color?: ColorId | null, pressure?: 1 | 2 | 3 | 4 }): void;
    run(): number;
}

function mapOf(puzzle: NetworkPuzzle | number): MapOf {
    if (typeof puzzle === 'number') {
        puzzle = (global as any).PUZZLES[puzzle] as NetworkPuzzle;
    }

    const width = puzzle.size + 3;
    const palette = Util.buildPalettes({} as any, false)[puzzle.size];
    const map: MapOf = {
        grid: puzzle.size,
        puzzle: puzzle,
        sim: Simulator.create(new (global as any).PIXI.Container()) as any,
        victory: false,
        tiles: Util.nulls(width * width),

        place(tiles: [number, number, Exclude<TileId, TileId.EMPTY>, DirectionId][]): void {
            for (const [x, y, tileId, rot] of tiles) {
                map.place1(x, y, tileId, rot);
            }
        },
        place1(x: number, y: number, tileId: Exclude<TileId, TileId.EMPTY>, rot: DirectionId = DirectionId.LEFT): void {
            map.tiles[x + y * width] = new Tile(tileId);
            for (let i = 0; i < rot; i++) {
                map.tiles[x + y * width]?.rotate();
            }
        },
        label(x: number, y: number, key: DirectionId, label?: { color?: ColorId | null, pressure?: 1 | 2 | 3 | 4 }) {
            const tile = map.tiles[x + width * y]!;
            const property = tile.property(key);
            
            if (label?.color !== undefined) property.color = label.color;
            if (label?.pressure !== undefined) property.pressure = label.pressure;
            
            Navigator.updateFrom(map, { x, y }, tile, key);
        },
        run(): number {
            let n: number = 0;
            for (; (map.sim as any).queue.length > 0; n++) {
                map.sim.tick(40, palette, map);
            }
            return n;
        },
        onVictory(): void {
            (map as any).victory = true;
        },
        updateTile(): void {},
    };

    map.sim.init(palette, map);
    return map;
}
