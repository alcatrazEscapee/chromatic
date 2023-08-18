import { Directions } from "../src/geometry";


describe('Direction', () => {

    test('up + rotate cw = right', () => expect(Directions.UP.rotateCW()).toBe(Directions.RIGHT));
    test('right + opposite = left', () => expect(Directions.RIGHT.opposite()).toBe(Directions.LEFT));
    test('down + rotate ccw = right', () => expect(Directions.DOWN.rotateCCW()).toBe(Directions.RIGHT));

    test('byId \'up\'', () => expect(Directions.byId('up')).toBe(Directions.UP));
    test('byId \'north\'', () => expect(() => Directions.byId('north')).toThrowError(TypeError));
});