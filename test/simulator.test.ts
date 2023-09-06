import { ColorId, DirectionId, TileId } from "../src/gen/constants";
import { Leak } from "../src/game/leak";
import { DSL } from "./_setup";


test('simulator id=0 -> leak from input', () => {
    const dsl = DSL(0);

    expect(dsl.run()).toBe(1);
    expect(dsl.victory).toBe(false);
    expect(dsl.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> leak from straight', () => {
    const dsl = DSL(0);

    dsl.place1(0, 1, TileId.STRAIGHT);

    expect(dsl.run()).toBe(2);
    expect(dsl.victory).toBe(false);
    expect(dsl.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> leak into straight perpendicular', () => {
    const dsl = DSL(0);

    dsl.place(
        [0, 1, TileId.STRAIGHT],
        [1, 1, TileId.CURVE],
        [1, 0, TileId.CURVE, DirectionId.DOWN],
        [0, 0, TileId.CURVE, DirectionId.RIGHT],
    );

    expect(dsl.run()).toBe(5);
    expect(dsl.victory).toBe(false);
    expect(dsl.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 0, y: 1}, 120)]);
});

test('simulator id=0 -> straight path wrong label', () => {
    const dsl = DSL(0);

    dsl.place(
        [0, 1, TileId.STRAIGHT],
        [1, 1, TileId.STRAIGHT],
        [2, 1, TileId.STRAIGHT],
    )
    dsl.label(1, 1, { color: ColorId.RED });

    expect(dsl.run()).toBe(1);
    expect(dsl.victory).toBe(false);
    expect(dsl.sim.leaks).toStrictEqual([new Leak([ColorId.BLUE], {x: 1, y: 0}, 120)]);
});

test('simulator id=0 -> straight path victory', () => {
    const dsl = DSL(0);

    dsl.place(
        [0, 1, TileId.STRAIGHT],
        [1, 1, TileId.STRAIGHT],
        [2, 1, TileId.STRAIGHT],
    )

    expect(dsl.run()).toBe(4);
    expect(dsl.victory).toBe(true);
});

test('simulator id=80 -> victory, filter works', () => {
    const dsl = DSL(80);

    dsl.place(
        [0, 0, TileId.CURVE, DirectionId.RIGHT],
        [1, 0, TileId.UNMIX, DirectionId.DOWN],
        [0, 1, TileId.CURVE, DirectionId.UP],
        [1, 1, TileId.MIX, DirectionId.DOWN],
        [1, 2, TileId.STRAIGHT, DirectionId.UP],
    );
    dsl.label(0, 0, { color: ColorId.RED });

    expect(dsl.run()).toBe(6);
    expect(dsl.victory).toBe(true);
});
