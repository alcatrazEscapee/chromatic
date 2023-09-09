import { AxisId, ColorId, DirectionId, NetworkPuzzle, TexturePalette, TileId } from '../constants';
import { Tile } from './tile';


interface Saveable {
    readonly tiles: (Tile | null)[],
    readonly puzzle: NetworkPuzzle | null,
}

enum Bits {
    DIRECTION_ID_BITS = 2,
    DIRECTION_ID_MASK = (1 << DIRECTION_ID_BITS) - 1,

    TILE_ID_BITS = 3,
    TILE_ID_SHIFT = DIRECTION_ID_BITS,
    TILE_ID_MASK = (1 << TILE_ID_BITS) - 1,

    INDEX_SHIFT = TILE_ID_SHIFT + TILE_ID_BITS,

    PRESSURE_BITS = 2,
    PRESSURE_MASK = (1 << PRESSURE_BITS) - 1,

    COLOR_SHIFT = PRESSURE_BITS,
}


export module State {
    
    export function saveState(save: Saveable): SavedPuzzleState | null {
        if (save.puzzle === null) {
            return null;
        }

        const tiles: SavedTile[] = [];
    
        for (let index = 0; index < save.tiles.length; index++) {
            const tile = save.tiles[index];
            if (tile !== null) {
                tiles.push(saveTile(index, tile));
            }
        }

        if (tiles.length === 0) {
            return null; // No tiles to save, so return null instead
        }
    
        return { id: save.puzzle.id, tiles };
    }

    function saveTile(index: number, tile: Tile): SavedTile {
        const tileId = tile.tileId; // Range [0, 7] ~ 3 bits
        const directionId = tile.dir; // Range [0, 4) ~ 2 bits

        const savedTile: SavedIndexTileAndRotation = directionId | (tileId << Bits.TILE_ID_SHIFT) | (index << Bits.INDEX_SHIFT);

        switch (tile.tileId) {
            case TileId.STRAIGHT:
            case TileId.CURVE:
                return [savedTile, saveProperty(tile, DirectionId.INTERNAL)];
            case TileId.CROSS:
                return [savedTile, saveProperty(tile, AxisId.HORIZONTAL), saveProperty(tile, AxisId.VERTICAL)];
            default:
                return [savedTile, saveProperty(tile, DirectionId.LEFT), saveProperty(tile, DirectionId.UP), saveProperty(tile, DirectionId.RIGHT)];
        }
    }

    function saveProperty(tile: Tile, key: DirectionId | AxisId): SavedProperty {
        const property = tile.property(key);
        const pressure = property.pressure - 1; // Range [0, 4) ~ 2 bits
        const color = property.color === null ? 0 : (property.color + 1) // Range [0, 14] ~ 4 bits

        return pressure | (color << Bits.COLOR_SHIFT);
    }


    export function restoreState(save: Saveable, state: SavedPuzzleState | null, palette: TexturePalette): void {
        if (state === null) {
            return; // No state to restore to
        }
        
        if (save.puzzle!.id !== state.id) {
            return; // No restore possible, since we were saved on a different puzzle
        }

        // Remove all previous tiles
        for (let index = 0; index < save.tiles.length; index++) {
            save.tiles[index]?.destroy();
            save.tiles[index] = null;
        }

        for (const savedTile of state.tiles) {
            const { index, tile } = restoreTile(savedTile, palette);
            
            save.tiles[index] = tile;
        }
    }

    function restoreTile(save: SavedTile, palette: TexturePalette): { index: number, tile: Tile } {
        const base: SavedIndexTileAndRotation = save[0];

        const dir: DirectionId = base & Bits.DIRECTION_ID_MASK;
        const tileId: Exclude<TileId, TileId.EMPTY> = (base >> Bits.TILE_ID_SHIFT) & Bits.TILE_ID_MASK;
        const index: number = base >> Bits.INDEX_SHIFT;

        const tile: Tile = new Tile(palette, tileId, (index % palette.width), Math.floor(index / palette.width));

        for (let i = 0; i < dir; i++) {
            tile.rotate();
        }

        switch (tileId) {
            case TileId.STRAIGHT:
            case TileId.CURVE:
                restoreProperty(tile, save[1], DirectionId.INTERNAL);
                break;
            case TileId.CROSS:
                restoreProperty(tile, save[1], AxisId.HORIZONTAL);
                restoreProperty(tile, save[2]!, AxisId.VERTICAL);
                break;
            default:
                restoreProperty(tile, save[1], DirectionId.LEFT);
                restoreProperty(tile, save[2]!, DirectionId.UP);
                restoreProperty(tile, save[3]!, DirectionId.RIGHT);
                break;
        }

        tile.update(palette);

        return { index, tile };
    }

    function restoreProperty(tile: Tile, save: SavedProperty, key: DirectionId | AxisId): void {
        const property = tile.property(key);

        const pressure: PressureId = ((save & Bits.PRESSURE_MASK) + 1) as PressureId;
        const color: ColorId | null = (save >> Bits.COLOR_SHIFT) === 0 ? null : (save >> Bits.COLOR_SHIFT) - 1;

        property.pressure = pressure;
        property.color = color;
    }
}