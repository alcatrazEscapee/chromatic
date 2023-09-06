import { AxisId, ColorId, DirectionId, GridId, TileId } from '../src/gen/constants';
import { DSL } from './_setup';


test('updateTile() inherit pressure EDGE -> STRAIGHT', () => {
    const dsl = DSL({ inputs: [
        [0, 0, DirectionId.RIGHT, ColorId.RED, 3]
    ]});

    dsl.place1(0, 0, TileId.STRAIGHT);

    expect(dsl.at(0, 0).pressure).toBe(3);
});

test('updateTile() inherit pressure EDGE -> STRAIGHT -> STRAIGHT', () => {
    const dsl = DSL({ inputs: [
        [0, 0, DirectionId.RIGHT, ColorId.RED, 3]
    ]});
    
    dsl.place(
        [0, 0, TileId.STRAIGHT],
        [1, 0, TileId.STRAIGHT]
    );

    expect(dsl.at(0, 0).pressure).toBe(3);
});

test('updateTile() inherit pressure EDGE -> CURVE -> STRAIGHT', () => {
    const dsl = DSL({ inputs: [
        [0, 2, DirectionId.RIGHT, ColorId.RED, 3]
    ]});
    
    dsl.place(
        [0, 2, TileId.CURVE],
        [0, 1, TileId.STRAIGHT, DirectionId.UP]
    );

    expect(dsl.at(0, 1).pressure).toBe(3);
});

test('updateTile() inherit pressure EDGE -> STRAIGHT -> CURVE', () => {
    const dsl = DSL({ inputs: [
        [1, 0, DirectionId.DOWN, ColorId.RED, 3]
    ]});
    
    dsl.place(
        [1, 0, TileId.STRAIGHT, DirectionId.UP],
        [1, 1, TileId.CURVE]
    );

    expect(dsl.at(1, 1).pressure).toBe(3);
});

test('updateTile() inherit pressure EDGE -> CROSS -> CURVE -> CROSS x2', () => {
    const dsl = DSL({inputs: [
        [0, 0, DirectionId.DOWN, ColorId.RED, 3],
        [0, 0, DirectionId.RIGHT, ColorId.BLUE, 2],
    ]});
    
    dsl.place(
        [0, 0, TileId.CROSS, DirectionId.UP],
        [0, 1, TileId.CURVE, DirectionId.UP],
        [1, 0, TileId.CURVE, DirectionId.DOWN],
        [1, 1, TileId.CROSS],
    );

    expect(dsl.at(1, 1, AxisId.HORIZONTAL).pressure).toBe(3);
    expect(dsl.at(1, 1, AxisId.VERTICAL).pressure).toBe(2);
});

test('updateTile() inherit pressure EDGE + EDGE + CURVE -> ACTION', () => {
    const dsl = DSL({
        inputs: [
            [0, 0, DirectionId.DOWN, ColorId.RED, 2],
            [0, 0, DirectionId.RIGHT, ColorId.BLUE, 3],
        ],
        outputs: [
            [1, -1, DirectionId.UP, ColorId.YELLOW, 4],
        ]
    });
    
    dsl.place(
        [1, 0, TileId.CURVE],
        [0, 0, TileId.MIX]
    );

    expect(dsl.at(0, 0, DirectionId.LEFT).pressure).toBe(3);
    expect(dsl.at(0, 0, DirectionId.UP).pressure).toBe(2);
    expect(dsl.at(0, 0, DirectionId.RIGHT).pressure).toBe(4);
});

test('updateTile() inherit pressure recursive STRAIGHT <- STRAIGHT <- CURVE <- EDGE', () => {
    const dsl = DSL({ inputs: [
        [2, 0, DirectionId.DOWN, ColorId.RED, 4],
    ]});
    
    dsl.place(
        [0, 0, TileId.STRAIGHT],
        [1, 0, TileId.STRAIGHT],
        [2, 0, TileId.CURVE],
    );

    expect(dsl.at(2, 0).pressure).toBe(4);
    expect(dsl.at(0, 0).pressure).toBe(4);
});

test('updateTile() inherit pressure + color does not cross filter on left', () => {
    const dsl = DSL({
        inputs: [
            [0, 0, DirectionId.RIGHT, ColorId.BLUE, 2],
        ],
        filters: [
            [0, 0, DirectionId.LEFT, ColorId.YELLOW],
        ]
    });

    dsl.place1(0, 0, TileId.STRAIGHT);
    dsl.label(0, 0, { color: ColorId.RED });
    dsl.place1(1, 0, TileId.STRAIGHT);

    expect(dsl.at(0, 0)).toStrictEqual({ color: ColorId.RED, pressure: 2 });
    expect(dsl.at(1, 0)).toStrictEqual({ color: null, pressure: 2 });
});

test('updateTile() inherit pressure + color does not cross filter on right', () => {
    const dsl = DSL({
        inputs: [
            [0, 0, DirectionId.RIGHT, ColorId.BLUE, 2],
        ],
        filters: [
            [1, 0, DirectionId.LEFT, ColorId.YELLOW],
        ]
    });

    dsl.place(
        [0, 0, TileId.STRAIGHT],
        [2, 0, TileId.STRAIGHT],
    );
    dsl.label(0, 0, { color: ColorId.RED });
    dsl.place1(1, 0, TileId.STRAIGHT);

    expect(dsl.at(0, 0)).toStrictEqual({ color: ColorId.RED, pressure: 2 });
    expect(dsl.at(1, 0)).toStrictEqual({ color: ColorId.RED, pressure: 2 });
    expect(dsl.at(2, 0)).toStrictEqual({ color: null, pressure: 2 });
});


test('updateFrom() apply color to STRAIGHT -> CROSS -> STRAIGHT', () => {
    const dsl = DSL();
    
    dsl.place(
        [0, 0, TileId.STRAIGHT],
        [1, 0, TileId.CROSS],
        [2, 0, TileId.STRAIGHT],
    );
    dsl.label(0, 0, { color: ColorId.RED });
    
    expect(dsl.at(0, 0).color).toBe(ColorId.RED);
    expect(dsl.at(1, 0, AxisId.HORIZONTAL).color).toBe(ColorId.RED);
    expect(dsl.at(1, 0, AxisId.VERTICAL).color).toBe(null);
    expect(dsl.at(2, 0).color).toBe(ColorId.RED);
});

test('updateFrom() apply color to STRAIGHT -> CROSS (rotated) -> STRAIGHT', () => {
    const dsl = DSL();
    
    dsl.place(
        [0, 0, TileId.STRAIGHT],
        [1, 0, TileId.CROSS, DirectionId.UP],
        [2, 0, TileId.STRAIGHT],
    );
    dsl.label(0, 0, { color: ColorId.RED });
    
    expect(dsl.at(0, 0).color).toBe(ColorId.RED);
    expect(dsl.at(1, 0, AxisId.VERTICAL).color).toBe(ColorId.RED);
    expect(dsl.at(1, 0, AxisId.HORIZONTAL).color).toBe(null);
    expect(dsl.at(2, 0).color).toBe(ColorId.RED);
});

test('updateFrom() apply color to (+) LEFT', () => {
    const dsl = DSL();
    
    dsl.place1(0, 0, TileId.MIX);
    dsl.label(0, 0, { color: ColorId.YELLOW }, DirectionId.LEFT);

    expect(dsl.at(0, 0, DirectionId.LEFT).color).toBe(ColorId.YELLOW);
    expect(dsl.at(0, 0, DirectionId.UP).color).toBe(null);
    expect(dsl.at(0, 0, DirectionId.RIGHT).color).toBe(null);
});

test('updateFrom() apply color to (+) UP', () => {
    const dsl = DSL();
    
    dsl.place1(0, 0, TileId.MIX);
    dsl.label(0, 0, { color: ColorId.YELLOW }, DirectionId.UP);

    expect(dsl.at(0, 0, DirectionId.LEFT).color).toBe(null);
    expect(dsl.at(0, 0, DirectionId.UP).color).toBe(ColorId.YELLOW);
    expect(dsl.at(0, 0, DirectionId.RIGHT).color).toBe(null);
});

test('updateFrom() apply clear color STRAIGHT -> STRAIGHT', () => {
    const dsl = DSL();

    dsl.place(
        [0, 0, TileId.STRAIGHT],
        [1, 0, TileId.STRAIGHT],
    );
    dsl.label(0, 0, { color: ColorId.YELLOW });
    dsl.label(0, 0, { color: null });

    expect(dsl.at(0, 0).color).toBe(null);
    expect(dsl.at(1, 0).color).toBe(null);
});

test('updateFrom() apply color does not cross filter', () => {
    const dsl = DSL({ filters: [
        [0, 0, DirectionId.LEFT, ColorId.BROWN]
    ]});
    
    dsl.place(
        [0, 0, TileId.STRAIGHT],
        [1, 0, TileId.STRAIGHT],
    );
    dsl.label(0, 0, { color: ColorId.RED });

    expect(dsl.at(0, 0).color).toBe(ColorId.RED);
    expect(dsl.at(1, 0).color).toBe(null);
});

test('updateFrom() apply clear color does not cross filter', () => {
    const dsl = DSL({ filters: [
        [0, 0, DirectionId.LEFT, ColorId.BROWN]
    ]});
    
    dsl.place(
        [0, 0, TileId.STRAIGHT],
        [1, 0, TileId.STRAIGHT],
    );
    dsl.label(0, 0, { color: ColorId.RED });
    dsl.label(1, 0, { color: ColorId.YELLOW });

    expect(dsl.at(0, 0).color).toBe(ColorId.RED);
    expect(dsl.at(1, 0).color).toBe(ColorId.YELLOW);

    dsl.label(0, 0, { color: null });

    expect(dsl.at(0, 0).color).toBe(null);
    expect(dsl.at(1, 0).color).toBe(ColorId.YELLOW);
});

test('updateFrom() apply color to cycle', () => {
    const dsl = DSL(-1);

    dsl.place(
        [1, 0, TileId.CURVE, DirectionId.DOWN],
        [0, 0, TileId.CURVE, DirectionId.RIGHT],
        [0, 1, TileId.CURVE, DirectionId.UP],
        [1, 1, TileId.CURVE],
    );

    dsl.label(0, 0, { color: ColorId.RED });

    expect(dsl.at(0, 0).color).toBe(ColorId.RED);
});

test('updateFrom() apply color to figure-8 cycle', () => {
    const dsl = DSL(-1);

    dsl.place(
        [1, 0, TileId.CURVE, DirectionId.DOWN],
        [0, 0, TileId.CURVE, DirectionId.RIGHT],
        [0, 1, TileId.CURVE, DirectionId.UP],
        [1, 1, TileId.CROSS],
        [2, 2, TileId.CURVE],
        [2, 1, TileId.CURVE, DirectionId.DOWN],
        [1, 2, TileId.CURVE, DirectionId.UP],
    );

    dsl.label(0, 0, { color: ColorId.RED });

    expect(dsl.at(1, 1, AxisId.VERTICAL).color).toBe(ColorId.RED);
    expect(dsl.at(1, 1, AxisId.HORIZONTAL).color).toBe(ColorId.RED);
    expect(dsl.at(2, 2).color).toBe(ColorId.RED);
});
