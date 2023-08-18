import { Color } from '../src/color';


describe('Color', () => {
    
    test('byId \'red\'', () => expect(Color.byId('red')).toBe(Color.RED));
    test('byId, \'unknown\'', () => expect(() => Color.byId('unknown')).toThrowError(TypeError));

    test('red + blue = purple', () => expect(Color.mix(Color.RED, Color.BLUE)).toBe(Color.PURPLE));
    test('blue + green = cyan', () => expect(Color.mix(Color.BLUE, Color.GREEN)).toBe(Color.CYAN));
    test('yellow + yellow = null', () => expect(Color.mix(Color.YELLOW, Color.YELLOW)).toBeNull())

    test('brown - red = green', () => expect(Color.unmix(Color.BROWN, Color.RED)).toBe(Color.GREEN));
    test('magenta - red = purple', () => expect(Color.unmix(Color.MAGENTA, Color.RED)).toBe(Color.PURPLE));
    test('green - red = null', () => expect(Color.unmix(Color.GREEN, Color.RED)).toBeNull());
});