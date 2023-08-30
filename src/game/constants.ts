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

interface NetworkPuzzleSized<Grid, N, N1, R> {
    size: Grid,
    inputs: NetworkFlowAtInput<N, R>[],
    outputs: NetworkFlowAtOutput<N1, R>[],
}

export type NetworkPuzzle = { id: number } & (
    NetworkPuzzleSized<GridId._3x3, 2, 3, 0 | 1 | 2> |
    NetworkPuzzleSized<GridId._4x4, 3, 4, 0 | 1 | 2 | 3> |
    NetworkPuzzleSized<GridId._5x5, 4, 5, 0 | 1 | 2 | 3 | 4>
);

export interface NetworkData {
    puzzles: NetworkPuzzle[]
};


export const enum TileId {
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

export const enum GridId {
    _3x3 = 0,
    _4x4 = 1,
    _5x5 = 2,

    default = _3x3,
}

export const enum ColorId {
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

    last = MAGENTA,
}

export const enum DirectionId {
    INTERNAL = 0,

    LEFT = 0,
    UP = 1,
    RIGHT = 2,
    DOWN = 3,

    last = 3
}

export const enum AxisId {
    HORIZONTAL = 0,
    VERTICAL = 1,

    last = 1
}


export const enum Constants {
    STAGE_WIDTH = 400,
    STAGE_HEIGHT = 600,

    GRID_LEFT = 20,
    GRID_TOP = 20,
    GRID_SIZE = 360,

    GRID_LEFT_HALF = GRID_LEFT / 2,

    GRID_ID_TO_WIDTH = 3,
    HELD_TILE_GRID_ID = GridId._5x5,

    COLOR_WHITE = 0xffffff,
    COLOR_BLACK = 0x000000,
    COLOR_GREEN = 0x00b000,

    TICKS_PER_SIMULATOR_STEP = 40,
    TICKS_PER_LEAK_BLOB = 3,

    MAX_BLOBS_PER_LEAK = 40,

    POINTER_HOLD_MS = 400,

    MAX_PRESSURE = 4,

    ANIM_FADE_TO_BLACK_TICKS = 54,
    ANIM_FADE_TO_BLACK_HALF = ANIM_FADE_TO_BLACK_TICKS / 2,

    ANIM_EASE_IN_OUT_TICKS = 55,

    N_TILES = TileId.last + 1,
    N_COLORS = ColorId.last + 1,
    N_AXIS = AxisId.last + 1,
    N_DIRECTIONS = DirectionId.last + 1,
}
