/**
 * The global constant PIXI available in production, via direct `<script>` tag.
 * `@pixi/sound` is available as `PIXI.sound`
 */
declare const PIXI: 
    typeof import('pixi.js') &
    { sound: typeof import('@pixi/sound') };

declare const FontFaceObserver: typeof import('fontfaceobserver');


/**
 * Implements a stricter - albeit unwieldy - version of `Readonly<T>` that actually prevents assignment to `T`.
 * This requires use of `!` on reads to eliminate the `undefined` type.
 * 
 * See [TypeScript#13347](https://github.com/Microsoft/TypeScript/issues/13347)
 */
type StrictReadonly<T> = { [k in keyof T]: T[k] | undefined };

type Mutable<T> = { -readonly [k in keyof T]: T[k]; }
type Tagged<Key extends string, T> = T & { __tag__: Key };

type X = number;
type Y = number;
type Array4<T> = [T, T, T, T];
type Point = { readonly x: X, readonly y: Y };
type BitSet = Tagged<'BitSet', number[]>;

type PressureId = 1 | 2 | 3 | 4;

type AssetPipeIcon = 'empty' | 'straight' | 'curve' | 'cross' | AssetPipeAction
type AssetPipeSize = '72' | '90' | '120';
type AssetPipePressure = '1' | '2' | '3' | '4'
type AssetPipeAction = 'mix' | 'unmix' | 'up' | 'down'

type PuzzlesAssetId = 'puzzles'
type PipeAssetId = `pipe_${AssetPipeSize}`
type CoreAssetId = 'core'

type AssetId = PuzzlesAssetId | PipeAssetId | CoreAssetId;

type AssetUrl<K extends AssetId> = 
    K extends PuzzlesAssetId ? 'lib/puzzles.json' :
    K extends PipeAssetId | CoreAssetId ? `art/${K}@1x.png.json` :
    never;

// N.B. The '_T' generics here are for types that we would have to otherwise import.
// As this file is not a module, and for the convenience of typing, we are avoiding making it as such, we use these generics
// in place of the actual type, at point of instantiation. 
type AssetType<K extends AssetId, _NetworkData, _Texture> =
    K extends PuzzlesAssetId ? _NetworkData :
    K extends PipeAssetId ? Spritesheet<PipeSpriteId<K>, _Texture> :
    K extends CoreAssetId ? Spritesheet<CoreSpriteId, _Texture> :
    never;

type Spritesheet<T, _Texture> = { readonly textures: { readonly [key in T]: _Texture } };

type AssetManifest = { [key in AssetId]: AssetUrl<key> };
type _AssetBundle<_NetworkData, _Texture> = { [key in AssetId]: AssetType<key, _NetworkData, _Texture> };


type PipeSpriteId<T extends PipeAssetId> = 
    `${T}_${'straight' | 'curve' | 'port'}_${AssetPipePressure}${'' | '_overlay_h' | '_overlay_v'}`
    | `${T}_edge_${AssetPipePressure}`
    | `${T}_${AssetPipeAction}`
    | `${T}_filter`

type CoreSpriteId = 'menu_background'
    | 'menu_panel'
    | 'menu_star'
    | 'menu_btn_left'
    | 'menu_btn_x'
    | 'menu_btn_main'
    | 'ui_background'
    | 'ui_tab_top'
    | 'ui_tab_bot'
    | 'ui_btn_play'
    | 'ui_btn_stop'
    | `ui_btn_pipe_${AssetPipeIcon}`
    | 'victory_star'
    | 'volume_on'
    | 'volume_off'
    | 'grid_3x3' | 'grid_4x4' | 'grid_5x5'

    
type PaletteMap<T> = [TexturePalette<T>, TexturePalette<T>, TexturePalette<T>];

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

    /**
     * On a horizontal straight pipe, this is the base vertical distance from the top-left to the interior of the pipe.
     * 
     * To obtain the insideTop for a given pipe, use `Util.insideTop`
     * To obtain the same distance but to the exterior of the pipe, add `Util.outsideTop`
     */
    insideTop: number,

    /**
     * On an action pipe, this is the width from the edge of the tile, to the end of the 'flow', before reaching the port.
     */
    portWidth: number,
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
} & {
    filter: T
};

interface _TexturePalette<T> extends Palette {
    grid: T,
    textures: PaletteTextures<T>
}


type SavedIndexTileAndRotation = number;
type SavedProperty = number;
type SavedTile
    = [SavedIndexTileAndRotation, SavedProperty] // Straight, Curve
    | [SavedIndexTileAndRotation, SavedProperty, SavedProperty] // Cross
    | [SavedIndexTileAndRotation, SavedProperty, SavedProperty, SavedProperty] // Action
    ;
type SavedPuzzleState = {
    id: number,
    tiles: SavedTile[],
}


type SaveDataVersion = 1;

type UnknownSaveData = null 
    | VersionedSaveData<0, {}>
    | VersionedSaveData<1, V1SaveData>
    // ...
    ;

interface V1SaveData {
    page: number;
    stars: BitSet;
    state?: SavedPuzzleState,
}

type LocalSaveData = VersionedSaveData<SaveDataVersion> & UnknownSaveData;
type VersionedSaveData<Version extends number, T = {}> = { version: Version } & T;


/**
 * A heavily restricted version of PIXI's `Container` as an interface. This only exposes `addChildAt(_, N)`,
 * to enforce that any runtime sprite additions only add at a certain index.
 */
type RestrictContainer<C, T, N> = Omit<C, 'addChild' | 'addChildAt'> & {
    addChildAt<U extends T>(child: U, index: N): U;
}