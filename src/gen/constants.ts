import type { Texture } from "pixi.js";

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

export type AssetBundle = _AssetBundle<NetworkData, Texture>;


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