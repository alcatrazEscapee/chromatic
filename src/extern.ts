declare const PIXI: typeof import('pixi.js');


type Mutable<T> = { -readonly [k in keyof T]: T[k]; }
type Array4<T> = [T, T, T, T];


type AssetPipeIcon = 'empty' | 'straight' | 'curve' | 'cross' | AssetPipeAction
type AssetPipeSize = '72' | '90' | '120';
type AssetPipePressure = '1' | '2' | '3' | '4'
type AssetPipeAction = 'mix' | 'unmix' | 'up' | 'down'

type PuzzlesAssetId = 'puzzles'
type PipeAssetId = `pipe_${AssetPipeSize}`
type CoreAssetId = 'ui_background'
    | 'ui_btn_play'
    | 'ui_btn_stop'
    | `ui_btn_pipe_${AssetPipeIcon}`
    | 'grid_3x3' | 'grid_4x4' | 'grid_5x5'

type AssetId = PuzzlesAssetId | PipeAssetId | CoreAssetId;

type AssetUrl<K extends AssetId> = 
    K extends PuzzlesAssetId ? 'lib/puzzles.json' :
    K extends PipeAssetId ? `art/sheets/${K}@1x.png.json` :
    K extends CoreAssetId ? `art/${K}.png` :
    never

type AssetType<K extends AssetId, Texture> =
    K extends PuzzlesAssetId ? NetworkData :
    K extends PipeAssetId ? PipeSpritesheet<K, Texture> :
    K extends CoreAssetId ? Texture :
    never;

type AssetManifest = { [key in AssetId]: AssetUrl<key> };
type AssetBundle<Texture> = { [key in AssetId]: AssetType<key, Texture> };


interface PipeSpritesheet<T extends PipeAssetId, Texture> {
    readonly textures: { [key in PipeSpriteId<T>]: Texture }
};

type PipeSpriteId<T extends PipeAssetId> = 
    `${T}_${'straight' | 'curve' | 'port'}_${AssetPipePressure}${'' | '_overlay_h' | '_overlay_v'}`
    | `${T}_edge_${AssetPipePressure}`
    | `${T}_${AssetPipeAction}`


type NetworkFlowAt<X, Y, Dir> = [X, Y, Dir, ColorId, 1 | 2 | 3 | 4];

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

type NetworkPuzzle = { id: number } & (
    NetworkPuzzleSized<GridId._3x3, 2, 3, 0 | 1 | 2> |
    NetworkPuzzleSized<GridId._4x4, 3, 4, 0 | 1 | 2 | 3> |
    NetworkPuzzleSized<GridId._5x5, 4, 5, 0 | 1 | 2 | 3 | 4>
);

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

    /** The number of pixels that each subsequent level of pressure increases pipe width by */
    pressureWidth: number,

    /** The number of pixels wide of the pipe edge. */
    pipeWidth: number,

    /**
     * On a horizontal straight pipe with pressure=1, this is the height of the interior of the pipe.
     * To obtain the insideWidth for a given pipe, use `Util.insideWidth`
     */
    insideWidth: number,
    
    /** On a split pipe, this is the horizontal distance from the left to the center square (or crossover) of the pipe. */
    insideLength: number,

    /**
     * On a horizontal straight pipe, this is the base vertical distance from the top-left to the interior of the pipe.
     * To obtain the insideTop for a given pipe, use `Util.insideTop`
     * To obtain the insideTop for the exterior of the pipe, add `Util.insideTopExt`
     */
    insideTop: number,
};

type PalettePipeTextures<T> = {
    pipe: T,
    overlay: { h: T, v: T }
};

type PaletteTextures<T> = {
    [key in 'straight' | 'curve' | 'port']: Array4<PalettePipeTextures<T>>
} & {
    // 'edge' is indexed by PressureId, 'action' is indexed by TileId - TileId.ACTION_START
    [key in 'edge' | 'action']: Array4<T>
};

interface TexturePalette<T> extends Palette {
    grid: T,
    textures: PaletteTextures<T>
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

    ACTION_START = 4,
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

    HELD_TILE_GRID_ID = GridId._5x5,

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

    last = MAGENTA,
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