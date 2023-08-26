import { AxisId, Constants, DirectionId, GridId, NetworkPuzzle, TileId } from "./constants.js";
import type { Tile, TileProperties } from "./tile.js";

import { Util } from "./util.js";


export module Navigator {

    export type Map = {
        readonly grid: GridId,
        readonly tiles: (Tile | null)[],
        readonly puzzle: NetworkPuzzle | null,
    }

    export type Position = {
        readonly x: number,
        readonly y: number,
        readonly dir: DirectionId | -1,
    }

    /**
     * Initializes a tile's properties on initial placement into the grid, based on surrounding tiles.
     * 
     * For each mutable property,
     * - If there are no adjacent connecting tiles, it assumes a default value
     * - If there is exactly one connecting tile, it copies the property of that tile
     * - If there are two connecting tiles, it copies the properties of the most 'outlandish' tile, and triggers a recursive step
     * 
     * In a recursive step, we update the tile that was not chosen, recursively, such that all contiguous sections of pipe share identical properties
     * 
     * Note that we define most 'outlandish' uniquely for both color and pressure, meaning both sides might trigger a recursive update.
     * - Higher pressures are more outlandish
     * - Non-null colors are more outlandish, then sort by `ColorId`
     */
    export function updateTileProperties(map: Map, pos: Point, tile: Tile) {

        switch (tile.tileId) {
            case TileId.EMPTY:
                return; // Nothing to do
            case TileId.STRAIGHT:    
                updateInBothDirections(map, pos,
                    tile.property(DirectionId.INTERNAL), // Straight pipes have a single property
                    tile.dir, Util.flip(tile.dir)); // And can extend in `tile.dir` and `flip(tile.dir)` directions
                break;
            case TileId.CURVE:
                updateInBothDirections(map, pos,
                    tile.property(DirectionId.INTERNAL), // Curve pipes have a single property
                    tile.dir, Util.cw(tile.dir)); // And can extend in `tile.dir` and `cw(tile.dir)` directions
                break;
            case TileId.CROSS:
                updateInBothDirections(map, pos,
                    tile.property(AxisId.HORIZONTAL), // Horizontal axis is the 'native' horizontal axis
                    tile.dir, Util.flip(tile.dir)); // So use the `tile.dir` axis directly
                updateInBothDirections(map, pos,
                    tile.property(AxisId.VERTICAL), // And the other axis...
                    Util.cw(tile.dir), Util.ccw(tile.dir)); // Uses the other directions
                break;
            default:
                throw new Error(`Not implemented`);
        }
    }

    function updateInBothDirections(map: Map, pos: Point, property: TileProperties, leftDir: DirectionId, rightDir: DirectionId): void {
        const left = traverse(map, { x: pos.x, y: pos.y, dir: leftDir });
        const right = traverse(map, { x: pos.x, y: pos.y, dir: rightDir });

        const leftProperty = left === null ? null : access(map, left);
        const rightProperty = right === null ? null : access(map, right);

        // Resolve conflicts, if both are present
        let updateLeft = false, updateRight = false;
        if (leftProperty !== null && rightProperty !== null) {
            resolveConflict(property, leftProperty, rightProperty);

            updateLeft = property.color !== leftProperty.color || property.pressure !== leftProperty.pressure;
            updateRight = property.color !== rightProperty.color || property.pressure !== rightProperty.pressure;
        } else if (leftProperty !== null) {
            resolveFrom(property, leftProperty);
        } else if (rightProperty !== null) {
            resolveFrom(property, rightProperty);
        }

        // todo: traverse the rest of the pipe, based on update left + right
    }

    function traverse(map: Map, pos: Position): Position | null {
        const width = map.grid + Constants.GRID_ID_TO_WIDTH;
        const move = { x: pos.x, y: pos.y, dir: -1 };

        if (pos.dir === -1) return null; // Cannot traverse beyond an edge position
        
        Util.move(move, pos.dir);
        if (!Util.isIn(move.x, move.y, 0, 0, width)) {
            return move;
        }

        // Adjust the direction based on what we find, and possibly return null if the tile does not connect
        const next = map.tiles[move.x + width * move.y]!;
        
        if (next === null) {
            return null; // No tile here, cannot connect
        }

        switch (next.tileId) {
            case TileId.STRAIGHT:
                move.dir = pos.dir; // Same direction
                return Util.sameAxis(pos.dir, next.dir) ? move : null; // Can only move through if the same axis as the tile
            case TileId.CURVE:
                {
                    const { dir: outDir } = Util.outputCurve(next.dir, pos.dir);
                    if (outDir !== -1) {
                        move.dir = outDir;
                        return move;
                    }
                    return null;
                }
            case TileId.CROSS:
                move.dir = pos.dir;
                return move; // Can always move through a crossover, unchanged
            default:
                throw new Error(`Invalid tile id: ${next.tileId}`);
        }
    }

    function access(map: Map, pos: Position): StrictReadonly<TileProperties> | null {
        
        if (pos.dir === -1) { // Access a puzzle input / output
            for (const [x, y, dir, _, pressure] of map.puzzle!.inputs) {
                // Input positioning is based on after moving, so we need to invert it here to do a proper comparison
                const rev = Util.move({ x, y }, dir, -1);
                if (rev.x === pos.x && rev.y === pos.y) {
                    return { color: null, pressure };
                }
            }

            for (const [x, y, _, _color, pressure] of map.puzzle!.outputs) {
                if (x === pos.x && y === pos.y) {
                    return { color: null, pressure };
                }
            }

            return null; // No matching input / output
        }

        const width = map.grid + Constants.GRID_ID_TO_WIDTH;
        const tile = map.tiles[pos.x + width * pos.y]!;
        
        if (tile === null) return null; // No tile here, cannot connect

        switch (tile.tileId) {
            case TileId.STRAIGHT:
                return Util.sameAxis(tile.dir, pos.dir) ? tile.property(DirectionId.INTERNAL) : null;
            case TileId.CURVE:
                return Util.outputCurve(tile.dir, Util.flip(pos.dir)).dir !== -1 ? tile.property(DirectionId.INTERNAL) : null;
            case TileId.CROSS:
                return Util.sameAxis(tile.dir, pos.dir) ? tile.property(AxisId.HORIZONTAL) : tile.property(AxisId.VERTICAL);
            default:
                throw new Error(`Invalid tile id: ${tile.tileId}`);
        }
    }

    function resolveFrom(self: TileProperties, other: StrictReadonly<TileProperties>): void {
        self.color = other.color!;
        self.pressure = other.pressure!;
    }

    function resolveConflict(self: TileProperties, left: StrictReadonly<TileProperties>, right: StrictReadonly<TileProperties>): void {
        if (left.color === null) self.color = right.color!;
        else if (right.color === null) self.color = left.color!;
        else self.color = Math.max(left.color!, right.color!);

        self.pressure = Math.max(left.pressure!, right.pressure!) as PressureId;
    }
}