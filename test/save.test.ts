import { AxisId, ColorId, DirectionId, TileId } from '../src/constants';
import { State } from '../src/game/save';
import { DSL } from './_setup';


test('save and restore empty grid', () => {
    const before = DSL(-1);
    const after = DSL(-1);

    State.restoreState(after, State.saveState(before), before.palette);

    expect(before).toStrictEqual(after);
});

test('save and restore pipes only', () => {
    const before = DSL(-1);
    const after = DSL(-1);

    before.place(
        [0, 0, TileId.STRAIGHT],
        [0, 1, TileId.CURVE],
        [0, 2, TileId.CROSS, DirectionId._180],
        [1, 1, TileId.UNMIX, DirectionId._90],
        [2, 2, TileId.MIX, DirectionId._270],
    );

    State.restoreState(after, State.saveState(before), before.palette);

    expect(before).toStrictEqual(after);
});

test('save and restore pipes and labels', () => {
    const before = DSL(-1);
    const after = DSL(-1);

    before.place(
        [0, 0, TileId.STRAIGHT],
        [0, 1, TileId.CURVE],
        [0, 2, TileId.CROSS, DirectionId._180],
        [1, 1, TileId.UNMIX, DirectionId._90],
        [2, 2, TileId.MIX, DirectionId._270],
    );

    before.label(0, 0, { color: ColorId.YELLOW, pressure: 4 });
    before.label(0, 2, { color: ColorId.last, pressure: 2 }, AxisId.HORIZONTAL);
    before.label(0, 2, { pressure: 3 }, AxisId.VERTICAL);
    before.label(1, 1, { color: ColorId.AMBER }, DirectionId.LEFT);
    before.label(1, 1, { color: ColorId.BROWN }, DirectionId.RIGHT);
    before.label(2, 2, { pressure: 3 }, DirectionId.UP);

    State.restoreState(after, State.saveState(before), before.palette);

    expect(before).toStrictEqual(after);
});

test('save and restore different puzzle', () => {
    const before = DSL(-1);
    const after = DSL(1);

    before.place(
        [0, 0, TileId.STRAIGHT],
        [0, 1, TileId.CURVE],
    );

    State.restoreState(after, State.saveState(before), before.palette);

    expect(DSL(1)).toStrictEqual(after);
});