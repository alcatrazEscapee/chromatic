import { AxisId, ColorId, Constants, DirectionId, GridId, NetworkPuzzle, TileId } from '../src/game/constants';
import { Tile, TileProperties } from '../src/game/tile';
import { Navigator } from '../src/game/navigator';
import { Util } from '../src/game/util';


test('updateTile() inherit pressure EDGE -> STRAIGHT', () => {
    const map = mapOf({
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.RIGHT, ColorId.RED, 3]
        ],
        outputs: [],
    }, [
        [0, 0, TileId.STRAIGHT, DirectionId.LEFT]
    ]);

    expect(map.at(0, 0, DirectionId.INTERNAL).pressure).toBe(3);
});

test('updateTile() inherit pressure EDGE -> STRAIGHT -> STRAIGHT', () => {
    const map = mapOf({
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.RIGHT, ColorId.RED, 3]
        ],
        outputs: [],
    }, [
        [0, 0, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 0, TileId.STRAIGHT, DirectionId.LEFT]
    ]);

    expect(map.at(0, 0, DirectionId.INTERNAL).pressure).toBe(3);
});

test('updateTile() inherit pressure EDGE -> CURVE -> STRAIGHT', () => {
    const map = mapOf({
        size: GridId._3x3,
        inputs: [
            [0, 2, DirectionId.RIGHT, ColorId.RED, 3]
        ],
        outputs: [],
    }, [
        [0, 2, TileId.CURVE, DirectionId.LEFT],
        [0, 1, TileId.STRAIGHT, DirectionId.UP]
    ]);

    expect(map.at(0, 1, DirectionId.INTERNAL).pressure).toBe(3);
});

test('updateTile() inherit pressure EDGE -> STRAIGHT -> CURVE', () => {
    const map = mapOf({
        size: GridId._3x3,
        inputs: [
            [1, 0, DirectionId.DOWN, ColorId.RED, 3]
        ],
        outputs: [],
    }, [
        [1, 0, TileId.STRAIGHT, DirectionId.UP],
        [1, 1, TileId.CURVE, DirectionId.LEFT]
    ]);

    expect(map.at(1, 1, DirectionId.INTERNAL).pressure).toBe(3);
});

test('updateTile() inherit pressure EDGE -> CROSS -> CURVE -> CROSS x2', () => {
    const map = mapOf({
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.DOWN, ColorId.RED, 3],
            [0, 0, DirectionId.RIGHT, ColorId.BLUE, 2],
        ],
        outputs: [],
    }, [
        [0, 0, TileId.CROSS, DirectionId.UP],
        [0, 1, TileId.CURVE, DirectionId.UP],
        [1, 0, TileId.CURVE, DirectionId.DOWN],
        [1, 1, TileId.CROSS, DirectionId.LEFT],
    ]);

    expect(map.at(1, 1, AxisId.HORIZONTAL).pressure).toBe(3);
    expect(map.at(1, 1, AxisId.VERTICAL).pressure).toBe(2);
});

test('updateTile() inherit pressure EDGE + EDGE + CURVE -> ACTION', () => {
    const map = mapOf({
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.DOWN, ColorId.RED, 2],
            [0, 0, DirectionId.RIGHT, ColorId.BLUE, 3],
        ],
        outputs: [
            [1, -1, DirectionId.UP, ColorId.YELLOW, 4],
        ]
    }, [
        [1, 0, TileId.CURVE, DirectionId.LEFT],
        [0, 0, TileId.MIX, DirectionId.LEFT]
    ]);

    expect(map.at(0, 0, DirectionId.LEFT).pressure).toBe(3);
    expect(map.at(0, 0, DirectionId.UP).pressure).toBe(2);
    expect(map.at(0, 0, DirectionId.RIGHT).pressure).toBe(4);
});

test('updateTile() inherit pressure recursive STRAIGHT <- STRAIGHT <- CURVE <- EDGE', () => {
    const map = mapOf({
        size: GridId._3x3,
        inputs: [
            [2, 0, DirectionId.DOWN, ColorId.RED, 4],
        ],
        outputs: []
    }, [
        [0, 0, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 0, TileId.STRAIGHT, DirectionId.LEFT],
        [2, 0, TileId.CURVE, DirectionId.LEFT],
    ]);

    expect(map.at(2, 0, DirectionId.INTERNAL).pressure).toBe(4);
    expect(map.at(0, 0, DirectionId.INTERNAL).pressure).toBe(4);
});

test('updateFrom() apply color to STRAIGHT -> CROSS -> STRAIGHT', () => {
    const map = mapOf(empty(), [
        [0, 0, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 0, TileId.CROSS, DirectionId.LEFT],
        [2, 0, TileId.STRAIGHT, DirectionId.LEFT],
    ]);

    map.color(0, 0, DirectionId.INTERNAL, ColorId.RED);
    
    expect(map.at(0, 0, DirectionId.INTERNAL).color).toBe(ColorId.RED);
    expect(map.at(1, 0, AxisId.HORIZONTAL).color).toBe(ColorId.RED);
    expect(map.at(1, 0, AxisId.VERTICAL).color).toBe(null);
    expect(map.at(2, 0, DirectionId.INTERNAL).color).toBe(ColorId.RED);
});

test('updateFrom() apply color to STRAIGHT -> CROSS (rotated) -> STRAIGHT', () => {
    const map = mapOf(empty(), [
        [0, 0, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 0, TileId.CROSS, DirectionId.UP],
        [2, 0, TileId.STRAIGHT, DirectionId.LEFT],
    ]);

    map.color(0, 0, DirectionId.INTERNAL, ColorId.RED);
    
    expect(map.at(0, 0, DirectionId.INTERNAL).color).toBe(ColorId.RED);
    expect(map.at(1, 0, AxisId.VERTICAL).color).toBe(ColorId.RED);
    expect(map.at(1, 0, AxisId.HORIZONTAL).color).toBe(null);
    expect(map.at(2, 0, DirectionId.INTERNAL).color).toBe(ColorId.RED);
});


function empty(): Omit<NetworkPuzzle, 'id'> {
    return { size: GridId._5x5, inputs: [], outputs: [] };
}

type MapOf = Navigator.Map & {
    width: number;
    
    at(x: number, y: number, key: 0 | 1 | 2 | 3): TileProperties;
    color(x: number, y: number, key: 0 | 1 | 2 | 3, color: ColorId): void;
}

function mapOf(puzzle: Omit<NetworkPuzzle, 'id'>, tiles: [number, number, Exclude<TileId, TileId.EMPTY>, DirectionId][]): MapOf {
    const width: number = puzzle.size + Constants.GRID_ID_TO_WIDTH;
    const map: MapOf = {
        width,
        grid: puzzle.size,
        tiles: Util.nulls(width * width),
        puzzle: puzzle as NetworkPuzzle,

        at(x: number, y: number, key: 0 | 1 | 2 | 3): TileProperties {
            return map.tiles[x + y * width]!.property(key);
        },
        color(x: number, y: number, key: 0 | 1 | 2 | 3, color: ColorId): void {
            map.tiles[x + y * width]!.property(key).color = color;
            Navigator.updateFrom(map, { x, y }, map.tiles[x + y * width]!);
        },

        updateTile(): void {}
    };

    for (const [x, y, tileId, rotationId] of tiles) {
        const tile = new Tile(tileId);
        for (let i = 0; i < rotationId; i++) tile.rotate();

        map.tiles[x + y * width] = tile;
        
        Navigator.updateTile(map, { x, y }, map.tiles[x + y * width]!);
    }

    return map;
}