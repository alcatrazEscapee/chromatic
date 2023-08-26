import { Util } from '../src/util';
import { DirectionId, AxisId, ColorId } from '../src/constants';


test('isIn() includes top left', () => expect(Util.isIn(0, 0, 0, 0, 4)).toBe(true));
test('isIn() includes bottom right', () => expect(Util.isIn(3, 3, 0, 0, 4)).toBe(true));
test('isIn() excludes outside bottom right', () => expect(Util.isIn(3, 3, 0, 0, 3)).toBe(false));
test('isIn() excludes outside top left', () => expect(Util.isIn(0, 0, 1, 1, 3)).toBe(false));

test('dirToAxis of UP', () => expect(Util.dirToAxis(DirectionId.UP)).toBe(AxisId.VERTICAL));
test('dirToAxis of LEFT', () => expect(Util.dirToAxis(DirectionId.LEFT)).toBe(AxisId.HORIZONTAL));

test('sameAxis of LEFT, DOWN', () => expect(Util.sameAxis(DirectionId.LEFT, DirectionId.DOWN)).toBe(false));
test('sameAxis of RIGHT, LEFT', () => expect(Util.sameAxis(DirectionId.RIGHT, DirectionId.LEFT)).toBe(true));

test('move() by LEFT, 1', () => expect(Util.move({ x: 3, y: 7 }, DirectionId.LEFT)).toStrictEqual({ x: 2, y: 7 }));
test('move() by RIGHT, 2', () => expect(Util.move({ x: 3, y: 7 }, DirectionId.RIGHT, 2)).toStrictEqual({ x: 5, y: 7 }));
test('move() by UP, -1', () => expect(Util.move({ x: 3, y: 7 }, DirectionId.UP, -1)).toStrictEqual({ x: 3, y: 8 }));
test('move() by DOWN, 3', () => expect(Util.move({ x: 3, y: 7 }, DirectionId.DOWN, 3)).toStrictEqual({ x: 3, y: 10 }));

test('cw() of LEFT', () => expect(Util.cw(DirectionId.LEFT)).toBe(DirectionId.UP));
test('cw() of DOWN', () => expect(Util.cw(DirectionId.DOWN)).toBe(DirectionId.LEFT));

test('ccw() of LEFT', () => expect(Util.ccw(DirectionId.LEFT)).toBe(DirectionId.DOWN));
test('ccw() of UP', () => expect(Util.ccw(DirectionId.UP)).toBe(DirectionId.LEFT));

test('flip() of LEFT', () => expect(Util.flip(DirectionId.LEFT)).toBe(DirectionId.RIGHT));
test('flip() of DOWN', () => expect(Util.flip(DirectionId.DOWN)).toBe(DirectionId.UP));

test('mix RED + BLUE', () => expect(Util.mix(ColorId.RED, ColorId.BLUE)).toBe(ColorId.PURPLE));
test('mix BLUE + RED', () => expect(Util.mix(ColorId.BLUE, ColorId.RED)).toBe(ColorId.PURPLE));
test('mix RED + PURPLE', () => expect(Util.mix(ColorId.RED, ColorId.PURPLE)).toBe(ColorId.MAGENTA));
test('mix PURPLE + BLUE', () => expect(Util.mix(ColorId.PURPLE, ColorId.BLUE)).toBe(ColorId.VIOLET));
test('mix RED + GREEN', () => expect(Util.mix(ColorId.RED, ColorId.GREEN)).toBe(ColorId.BROWN));
test('mix RED + RED', () => expect(Util.mix(ColorId.RED, ColorId.RED)).toBe(-1));

test('unmix PURPLE - RED', () => expect(Util.unmix(ColorId.PURPLE, ColorId.RED)).toBe(ColorId.BLUE));
test('unmix PURPLE - BLUE', () => expect(Util.unmix(ColorId.PURPLE, ColorId.BLUE)).toBe(ColorId.RED));
test('unmix PURPLE - YELLOW', () => expect(Util.unmix(ColorId.PURPLE, ColorId.YELLOW)).toBe(-1));
test('unmix VIOLET - BLUE', () => expect(Util.unmix(ColorId.VIOLET, ColorId.BLUE)).toBe(ColorId.PURPLE));
test('unmix VIOLET - RED', () => expect(Util.unmix(ColorId.VIOLET, ColorId.RED)).toBe(-1));

test('outputDir tile = LEFT, incoming = LEFT, DOWN', () => expect(Util.outputDir(DirectionId.LEFT, DirectionId.LEFT, DirectionId.DOWN)).toBe(DirectionId.RIGHT));
test('outputDir tile = LEFT, incoming = LEFT, RIGHT', () => expect(Util.outputDir(DirectionId.LEFT, DirectionId.LEFT, DirectionId.RIGHT)).toBe(DirectionId.DOWN));
test('outputDir tile = LEFT, incoming = RIGHT, DOWN', () => expect(Util.outputDir(DirectionId.LEFT, DirectionId.RIGHT, DirectionId.DOWN)).toBe(DirectionId.LEFT));

test('outputDir tile = UP, incoming = UP, DOWN', () => expect(Util.outputDir(DirectionId.UP, DirectionId.UP, DirectionId.DOWN)).toBe(DirectionId.LEFT));
test('outputDir tile = UP, incoming = UP, LEFT', () => expect(Util.outputDir(DirectionId.UP, DirectionId.LEFT, DirectionId.UP)).toBe(DirectionId.DOWN));
test('outputDir tile = UP, incoming = LEFT, DOWN', () => expect(Util.outputDir(DirectionId.UP, DirectionId.LEFT, DirectionId.DOWN)).toBe(DirectionId.UP));

test('outputCurve tile = LEFT, incoming = DOWN', () => expect(Util.outputCurve(DirectionId.LEFT, DirectionId.DOWN)).toStrictEqual({ dir: DirectionId.LEFT, cw: true }));
test('outputCurve tile = LEFT, incoming = RIGHT', () => expect(Util.outputCurve(DirectionId.LEFT, DirectionId.RIGHT)).toStrictEqual({ dir: DirectionId.UP, cw: false }));
test('outputCurve tile = LEFT, incoming = LEFT', () => expect(Util.outputCurve(DirectionId.LEFT, DirectionId.LEFT)).toStrictEqual({ dir: -1, cw: false }));

test('outputCurve tile = UP, incoming = DOWN', () => expect(Util.outputCurve(DirectionId.UP, DirectionId.DOWN)).toStrictEqual({ dir: DirectionId.RIGHT, cw: false }));
test('outputCurve tile = UP, incoming = LEFT', () => expect(Util.outputCurve(DirectionId.UP, DirectionId.LEFT)).toStrictEqual({ dir: DirectionId.UP, cw: true }));
test('outputCurve tile = UP, incoming = UP', () => expect(Util.outputCurve(DirectionId.UP, DirectionId.UP)).toStrictEqual({ dir: -1, cw: false }));