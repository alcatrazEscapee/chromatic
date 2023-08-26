import { AxisId, ColorId, DirectionId, GridId, NetworkPuzzle, TileId } from '../src/constants';
import { Navigator } from '../src/navigator';
import { Tile } from '../src/tile';


test('updateTileProperties() inherit pressure EDGE -> STRAIGHT', () => {
    const { map, index } = mapOf({
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.RIGHT, ColorId.RED, 3]
        ],
        outputs: [],
    }, [
        [0, 0, TileId.STRAIGHT, DirectionId.LEFT]
    ]);

    expect(map.tiles[index]!.property(DirectionId.INTERNAL)).toStrictEqual({ color: null, pressure: 3 });
});

test('updateTileProperties() inherit pressure EDGE -> STRAIGHT -> STRAIGHT', () => {
    const { map, index } = mapOf({
        size: GridId._3x3,
        inputs: [
            [0, 0, DirectionId.RIGHT, ColorId.RED, 3]
        ],
        outputs: [],
    }, [
        [0, 0, TileId.STRAIGHT, DirectionId.LEFT],
        [1, 0, TileId.STRAIGHT, DirectionId.LEFT]
    ]);

    expect(map.tiles[index]!.property(DirectionId.INTERNAL)).toStrictEqual({ color: null, pressure: 3 });
});

test('updateTileProperties() inherit pressure EDGE -> CURVE -> STRAIGHT', () => {
    const { map, index } = mapOf({
        size: GridId._3x3,
        inputs: [
            [0, 2, DirectionId.RIGHT, ColorId.RED, 3]
        ],
        outputs: [],
    }, [
        [0, 2, TileId.CURVE, DirectionId.LEFT],
        [0, 1, TileId.STRAIGHT, DirectionId.UP]
    ]);

    expect(map.tiles[index]!.property(DirectionId.INTERNAL)).toStrictEqual({ color: null, pressure: 3 });
});

test('updateTileProperties() inherit pressure EDGE -> STRAIGHT -> CURVE', () => {
    const { map, index } = mapOf({
        size: GridId._3x3,
        inputs: [
            [1, 0, DirectionId.DOWN, ColorId.RED, 3]
        ],
        outputs: [],
    }, [
        [1, 0, TileId.STRAIGHT, DirectionId.UP],
        [1, 1, TileId.CURVE, DirectionId.LEFT]
    ]);

    expect(map.tiles[index]!.property(DirectionId.INTERNAL)).toStrictEqual({ color: null, pressure: 3 });
});

test('updateTileProperties() inherit pressure EDGE -> CROSS -> CURVE -> CROSS x2', () => {
    const { map, index } = mapOf({
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

    expect(map.tiles[index]!.property(AxisId.HORIZONTAL)).toStrictEqual({ color: null, pressure: 3 });
    expect(map.tiles[index]!.property(AxisId.VERTICAL)).toStrictEqual({ color: null, pressure: 2 });
});


function mapOf(puzzle: Omit<NetworkPuzzle, 'id'>, tiles: [number, number, TileId, DirectionId][]): { map: Navigator.Map, index: number } {
    const map: Navigator.Map = {
        grid: puzzle.size,
        tiles: [null, null, null, null, null, null, null, null, null],
        puzzle: puzzle as NetworkPuzzle,
    };

    let index: number = -1;
    for (const [x, y, tileId, rotationId] of tiles) {
        const tile = new Tile(tileId);
        for (let i = 0; i < rotationId; i++) tile.rotate();

        index = x + y * 3;
        map.tiles[index] = tile;
        
        Navigator.updateTileProperties(map, { x, y }, map.tiles[index]!);
    }

    return { map, index };
}