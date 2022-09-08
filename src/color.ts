
type ColorMix = Readonly<{ left: Color, right: Color, out: Color }>;

export class Color {

    private static readonly COLORS: Map<string, Color> = new Map();

    public static readonly RED: Color = new Color('red', 'fff');
    public static readonly BLUE: Color = new Color('blue', '00f');
    public static readonly YELLOW: Color = new Color('yellow', 'ff0');

    public static readonly ORANGE: Color = new Color('orange', 'f60');
    public static readonly PURPLE: Color = new Color('purple', '909');
    public static readonly GREEN: Color = new Color('green', '090');
    
    public static readonly BROWN: Color = new Color('brown', '630');
    
    public static readonly LIME: Color = new Color('lime', '6f0');
    public static readonly CYAN: Color = new Color('cyan', '066');
    public static readonly AMBER: Color = new Color('amber', 'c60');
    public static readonly GOLD: Color = new Color('gold', 'fc3');
    public static readonly VIOLET: Color = new Color('violet', '303');
    public static readonly MAGENTA: Color = new Color('magenta', '903');

    public static byId(id: string): Color {
        const color: Color | undefined = Color.COLORS.get(id);
        if (color === undefined) {
            throw new TypeError(`Invalid color '${id}'`);
        }
        return color;
    }

    private static readonly MIXES: ColorMix[] = [
        mix(Color.RED, Color.BLUE, Color.PURPLE),
        mix(Color.BLUE, Color.YELLOW, Color.GREEN),
        mix(Color.YELLOW, Color.RED, Color.ORANGE),

        mix(Color.RED, Color.GREEN, Color.BROWN),
        mix(Color.BLUE, Color.ORANGE, Color.BROWN),
        mix(Color.YELLOW, Color.PURPLE, Color.BROWN),

        mix(Color.YELLOW, Color.GREEN, Color.LIME),
        mix(Color.BLUE, Color.GREEN, Color.CYAN),
        mix(Color.RED, Color.ORANGE, Color.AMBER),
        mix(Color.YELLOW, Color.ORANGE, Color.GOLD),
        mix(Color.BLUE, Color.PURPLE, Color.VIOLET),
        mix(Color.RED, Color.PURPLE, Color.MAGENTA),
    ];

    /**
     * Mixes two colors and returns the result, or null if impossible.
     */
    public static mix(left: Color, right: Color): Color | null {
        for (let mix of Color.MIXES) {
            if ((left == mix.left && right == mix.right) || (left == mix.right && right == mix.left)) {
                return mix.out;
            }
        }
        return null;
    }

    /**
     * Attempts to unmix {@code start} by removing {@code split}. Returns the remainder, or null if impossible.
     */
    public static unmix(start: Color, split: Color): Color | null {
        for (let mix of Color.MIXES) {
            if (start == mix.out && (split == mix.left || split == mix.right)) {
                return split == mix.left ? mix.right : mix.left;
            }
        }
        return null;
    }

    public readonly id: string;
    public readonly color: string;

    private constructor(id: string, color: string) {
        this.id = id;
        this.color = color;

        Color.COLORS.set(id, this);
    }
}

function mix(left: Color, right: Color, out: Color): ColorMix {
    return { left: left, right: right, out: out };
}