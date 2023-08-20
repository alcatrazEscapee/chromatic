declare const PIXI: typeof import('pixi.js');


type Mutable<T> = { -readonly [k in keyof T]: T[k]; }

type JsonAssetId = 'puzzles'
type ImageAssetId = 'play_ui'
    | 'ui_btn_play' | 'ui_btn_stop'
    | 'grid_3x3' | 'grid_4x4' | 'grid_5x5'
    | 'pipe_empty'
    | 'pipe_edge_72' | 'pipe_straight_72' | 'pipe_curve_72' | 'pipe_cross_72' | 'pipe_action_72' | 'pipe_mix_72' | 'pipe_unmix_72' | 'pipe_up_72' | 'pipe_down_72'
    | 'pipe_edge_90' | 'pipe_straight_90' | 'pipe_curve_90' | 'pipe_cross_90' | 'pipe_action_90' | 'pipe_mix_90' | 'pipe_unmix_90' | 'pipe_up_90' | 'pipe_down_90'
    | 'pipe_edge_120' | 'pipe_straight_120' | 'pipe_curve_120' | 'pipe_cross_120' | 'pipe_action_120' | 'pipe_mix_120' | 'pipe_unmix_120' | 'pipe_up_120' | 'pipe_down_120'
    ;

type AssetId = JsonAssetId | ImageAssetId;
type AssetType = 'json' | 'png';
type AssetTypeOf<T extends AssetId> = T extends JsonAssetId ? 'json' : 'png';
type AssetRoot<T extends AssetType> = T extends 'json' ? 'lib' : 'art';
type AssetDerivedType<T extends AssetId, Texture> = 
    T extends 'puzzles' ? NetworkData :
    AssetTypeOf<T> extends 'png' ? Texture :
    never;
type AssetUrl<K extends AssetId> = `${AssetRoot<AssetTypeOf<K>>}/${K}.${AssetTypeOf<K>}`;

type AssetMap<Texture> = {
    [key in AssetId]: AssetDerivedType<key, Texture>
};

type NetworkFlow = [number, number, DirectionId, ColorId, PressureId];

interface NetworkPuzzle {
    id: number,
    size: GridId,
    inputs: NetworkFlow[],
    outputs: NetworkFlow[]
};

interface NetworkData {
    puzzles: NetworkPuzzle[]
};

type PaletteMap<T> = {
    [_ in GridId]: TexturePalette<T>
};

interface Palette {
    /** The number of tiles in one direction of the grid. */
    width: number,

    /** The pixel width of a single tile in the grid. */
    tileWidth: number,

    /** On a horizontal straight pipe, this is the height of the interior of the pipe. */
    insideWidth: number,
    /** On a split pipe, this is the horizontal distance from the left to the center square (or crossover) of the pipe. */
    insideLength: number,
    /** On a horizontal straight pipe, this is the vertical distance from from the top-left to the interior of the pipe. */
    insideTop: number,
};

interface TexturePalette<T> extends Palette {
    grid: T,
    textures: {
        [_ in TileId]: T
    }
}

const enum TileId {
    EMPTY = 0,
    STRAIGHT = 1,
    CURVE = 2,
    CROSS = 3,

    MIX = 4,
    UNMIX = 5,
    UP = 6,
    DOWN = 7,

    LAST = DOWN,

    ACTION = 8,
    EDGE = 9,
}

const enum GridId {
    _3x3 = 0,
    _4x4 = 1,
    _5x5 = 2,

    LAST = _5x5,
    DEFAULT = _4x4,
}

const enum Constants {
    STAGE_WIDTH = 400,
    STAGE_HEIGHT = 600,

    GRID_LEFT = 20,
    GRID_TOP = 20,
    GRID_SIZE = 360,

    HELD_TILE_GRID_ID = GridId._4x4,

    COLOR_WHITE = 0xffffff,
    COLOR_GREEN = 0x00b000,

    TICKS_PER_SIMULATOR_STEP = 40,
    TICKS_PER_LEAK_BLOB = 3,

    MAX_BLOBS_PER_LEAK = 40,

    POINTER_HOLD_MS = 400,
}

const enum ColorId {
    RED = 0,
    BLUE = 1,
    YELLOW = 2,

    ORANGE = 3,
    PURPLE = 4,
    GREEN = 5,

    BROWN = 6,

    LIME = 7,
    CYAN = 8,
    AMBER = 9,
    GOLD = 10,
    VIOLET = 11,
    MAGENTA = 12,
}

type Point = { x: number, y: number };

const enum DirectionId {
    INTERNAL = 0,

    LEFT = 0,
    UP = 1,
    RIGHT = 2,
    DOWN = 3,
}

const enum AxisId {
    HORIZONTAL = 0,
    VERTICAL = 1,
}

type PressureId = number;