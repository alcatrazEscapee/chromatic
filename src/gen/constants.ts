import type { Texture } from 'pixi.js';


type NetworkFlowAt<X, Y, Dir> = [X, Y, Dir, ColorId, PressureId];

type NetworkFlowAtInput<N, R>
    = NetworkFlowAt<R, 0, DirectionId.DOWN>
    | NetworkFlowAt<N, R, DirectionId.LEFT>
    | NetworkFlowAt<R, N, DirectionId.UP>
    | NetworkFlowAt<0, R, DirectionId.RIGHT>

type NetworkFlowAtOutput<N, R>
    = NetworkFlowAt<R, N, DirectionId.DOWN>
    | NetworkFlowAt<-1, R, DirectionId.LEFT>
    | NetworkFlowAt<R, -1, DirectionId.UP>
    | NetworkFlowAt<N, R, DirectionId.RIGHT>;

type NetworkFilterAt<X, Y> = [X, Y, DirectionId.UP | DirectionId.LEFT, ColorId];
type NetworkFilters<R> = NetworkFilterAt<R, R>;

interface NetworkPuzzleSized<Grid, N, N1, R> {
    size: Grid,
    inputs: NetworkFlowAtInput<N, R>[],
    outputs: NetworkFlowAtOutput<N1, R>[],
    filters?: NetworkFilters<R>[],
}

export type NetworkPuzzle = { id: number } & (
    NetworkPuzzleSized<GridId._3x3, 2, 3, 0 | 1 | 2> |
    NetworkPuzzleSized<GridId._4x4, 3, 4, 0 | 1 | 2 | 3> |
    NetworkPuzzleSized<GridId._5x5, 4, 5, 0 | 1 | 2 | 3 | 4>
);

export interface NetworkData {
    puzzles: NetworkPuzzle[]
};

export type AssetBundle = _AssetBundle<NetworkData, Texture>;
export type TexturePalette = _TexturePalette<Texture>;


export enum TileId {
    EMPTY = 0,
    STRAIGHT = 1,
    CURVE = 2,
    CROSS = 3,

    ACTION_START = 4,
    MIX = 4,
    UNMIX = 5,
    UP = 6,
    DOWN = 7,

    last = DOWN,
}

export enum GridId {
    _3x3 = 0,
    _4x4 = 1,
    _5x5 = 2,

    default = _3x3,
}

export enum ColorId {
    // Ordering is based on the order that colors are present in the UI
    // Top down, then left right:
    //
    // red     orange  clear  amber   gold
    // blue    purple  brown  violet  magenta
    // yellow  green          lime    cyan

    RED = 0,
    BLUE = 1,
    YELLOW = 2,

    ORANGE = 3,
    PURPLE = 4,
    GREEN = 5,

    BROWN = 6,

    AMBER = 7,
    VIOLET = 8,
    LIME = 9,
    GOLD = 10,
    MAGENTA = 11,
    CYAN = 12,

    last = CYAN,
}

export enum DirectionId {
    INTERNAL = 0,

    LEFT = 0,
    UP = 1,
    RIGHT = 2,
    DOWN = 3,

    // clockwise rotations
    _90 = UP,
    _180 = RIGHT,
    _270 = DOWN,

    last = 3
}

export enum AxisId {
    HORIZONTAL = 0,
    VERTICAL = 1,

    last = 1
}


export enum Constants {
    STAGE_WIDTH = 400,
    STAGE_HEIGHT = 600,

    GRID_LEFT = 20,
    GRID_TOP = 20,
    GRID_SIZE = 360,

    GRID_LEFT_HALF = GRID_LEFT / 2,

    GRID_ID_TO_WIDTH = 3,

    BTN_MAIN_X = 356,
    BTN_MAIN_Y = 542,

    BTN_NEXT_X = 357 + 25,
    BTN_NEXT_Y = 486 + 40,

    COLOR_WHITE = 0xffffff,
    COLOR_BLACK = 0x000000,
    COLOR_DARK_GRAY = 0x101010,
    COLOR_GREEN = 0x00b000,
    COLOR_DARK_GREEN = 0x009000,

    TICKS_PER_SIMULATOR_STEP = 40,
    TICKS_PER_LEAK_BLOB = 3,
    TICKS_PER_FILTER_DEMO_PRE_WAIT = 60,
    TICKS_PER_FILTER_DEMO_POST_WAIT = 100,
    TICKS_PER_FILTER_DEMO_CYCLE = TICKS_PER_FILTER_DEMO_PRE_WAIT + TICKS_PER_FILTER_DEMO_POST_WAIT + 3 * TICKS_PER_SIMULATOR_STEP,

    MAX_BLOBS_PER_LEAK = 40,

    POINTER_HOLD_MS = 400,

    MAX_PRESSURE = 4,

    DRAG_TILE_MIN_NORM2 = 600,

    PUZZLES_PER_PAGE = 16,

    ANIM_FADE_TO_BLACK_TICKS = 54,
    ANIM_FADE_TO_BLACK_HALF = ANIM_FADE_TO_BLACK_TICKS / 2,

    ANIM_EASE_IN_OUT_TICKS = 35,

    ANIM_FADE_IN_TICKS = 40,
    ANIM_VICTORY_FADE_IN_DELAY_TICKS = 40,

    BITSET_SHIFT = 5,
    BITSET_MASK = (1 << BITSET_SHIFT) - 1,

    N_AXIS = AxisId.last + 1,
    N_DIRECTION = DirectionId.last + 1,
}

export enum Strings {
    /** See {@link https://pixijs.download/v6.1.0/docs/PIXI.InteractionManager.html#cursorStyles PIXI.InteractionManager.cursorStyles} */
    CURSOR = 'cursor',
    LOCAL_STORAGE_KEY = 'chromatic-save-data',
}

export enum Fonts {
    ERAS_BOLD_ITC = 'Eras Bold ITC',
    ARIAL = 'Arial',
}