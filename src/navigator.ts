import { AxisId, Constants, DirectionId, GridId, NetworkPuzzle, TileId } from "./constants.js";
import type { Tile, TileProperties } from "./tile.js";

import { Util } from "./util.js";


export module Navigator {

    export type Map = {
        readonly grid: GridId,
        readonly tiles: (Tile | null)[],
        readonly puzzle: NetworkPuzzle | null,

        updateTile(pos: Point): void;
    }

    export type Position = {
        readonly x: number,
        readonly y: number,
        readonly dir: DirectionId,
        readonly ty: PositionType,
    }

    const enum PositionType {
        VALID,
        EDGE, // Pointing to an edge position
        PORT,
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
    export function updateTile(map: Map, pos: Point, tile: Tile) {

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
            case TileId.MIX:
            case TileId.UNMIX:
            case TileId.UP:
            case TileId.DOWN:
                updateAction(map, pos, tile);
                break;
            default:
                throw new Error(`Not implemented`);
        }

        map.updateTile(pos);
    }

    function updateInBothDirections(map: Map, pos: Point, property: TileProperties, leftDir: DirectionId, rightDir: DirectionId): void {
        const posLeft = { x: pos.x, y: pos.y, dir: leftDir, ty: PositionType.VALID };
        const posRight = { x: pos.x, y: pos.y, dir: rightDir, ty: PositionType.VALID };
        
        const left = traverse(map, posLeft);
        const right = traverse(map, posRight);

        const leftProperty = access(map, left, false);
        const rightProperty = access(map, right, false);

        // Resolve conflicts, if both are present
        if (leftProperty !== null && rightProperty !== null) {
            resolveConflict(property, leftProperty, rightProperty);
        } else if (leftProperty !== null) {
            resolveFrom(property, leftProperty);
        } else if (rightProperty !== null) {
            resolveFrom(property, rightProperty);
        }

        if (leftProperty !== null && (property.color !== leftProperty.color || property.pressure !== leftProperty.pressure)) {
            recursiveUpdate(map, posLeft, property);
        }
        if (rightProperty !== null && (property.color !== rightProperty.color || property.pressure !== rightProperty.pressure)) {
            recursiveUpdate(map, posRight, property);
        }
    }

    function updateAction(map: Map, pos: Point, tile: Tile): void {
        // The properties are labeled in terms of the un-rotated direction, LEFT, UP, and DOWN
        let realDir: DirectionId = tile.dir;

        for (let i = 0; i < 3; i++) {
            const propertyDir = i as DirectionId;
            
            const adj = traverse(map, { x: pos.x, y: pos.y, dir: realDir, ty: PositionType.VALID });
            const adjProperty = access(map, adj, false);

            if (adjProperty !== null) {
                resolveFrom(tile.property(propertyDir), adjProperty);
                // No need to recursively update, since we may only connect to one source - which we will always copy from
            }

            realDir = Util.cw(realDir);
        }
    }

    function recursiveUpdate(map: Map, pos: Position | null, copyFrom: StrictReadonly<TileProperties>): void {
        while (pos !== null) {
            const property = access(map, pos, true);
            if (property === null) {
                return;
            }

            resolveFrom(property, copyFrom);
            map.updateTile(pos);
            pos = traverse(map, pos);
        }
    }


    /**
     * Takes the position, in _incoming_ convention, and moves it through the pipe at the current tile.
     * Returns a new position if we can traverse through the current tile, or `null` if we cannot.
     */
    function traverse(map: Map, pos: Position): Position | null {
        const width = map.grid + Constants.GRID_ID_TO_WIDTH;
        const move: Mutable<Position> = { x: pos.x, y: pos.y, dir: DirectionId.LEFT, ty: PositionType.VALID };

        if (pos.ty !== PositionType.VALID) {
            return null; // Already reached a terminal position, so cannot traverse any further
        }
        
        Util.move(move, pos.dir);

        if (!Util.isIn(move.x, move.y, 0, 0, width)) {
            move.ty = PositionType.EDGE;
            return move;
        }

        // Adjust the direction based on what we find, and possibly return null if the tile does not connect
        const tile = map.tiles[move.x + width * move.y]!;
        
        if (tile === null) {
            return null; // No tile here, cannot connect
        }

        switch (tile.tileId) {
            case TileId.STRAIGHT:
                move.dir = pos.dir; // Same direction
                return Util.sameAxis(pos.dir, tile.dir) ? move : null; // Can only move through if the same axis as the tile
            case TileId.CURVE:
                {
                    const { dir: outDir } = Util.outputCurve(tile.dir, pos.dir);
                    if (outDir !== -1) {
                        move.dir = outDir;
                        return move;
                    }
                    return null;
                }
            case TileId.CROSS:
                move.dir = pos.dir;
                return move; // Can always move through a crossover, unchanged
            case TileId.MIX:
            case TileId.UNMIX:
            case TileId.UP:
            case TileId.DOWN:
                if (Util.cw(tile.dir) === pos.dir) {
                    return null; // Cannot connect to a action via this direction
                }
                move.dir = pos.dir; // Incoming direction
                move.ty = PositionType.PORT; // Reached a port
                return move;
            default:
                throw new Error(`Invalid tile id: ${tile.tileId}`);
        }
    }

    /**
     * Access the property given a position and direction.
     * The position is in an _incoming_ convention, identical to an input edge flow.
     * 
     * @param updating If `true`, then this will only access writable properties, instead of strict readonly ones (which may include edge properties).
     */
    function access<T extends boolean>(map: Map, pos: Position | null, updating: T): (T extends true ? TileProperties : StrictReadonly<TileProperties>) | null {
        
        if (pos === null) {
            return null;
        }

        if (pos.ty === PositionType.EDGE) {
            // If we reached an edge, then check edges for matching input/outputs
            if (updating) {
                return null;
            }

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

            return null;
        }

        const width = map.grid + Constants.GRID_ID_TO_WIDTH;
        const tile = map.tiles[pos.x + width * pos.y]!;
        
        if (tile === null) {
            return null; // No tile here, cannot connect
        }

        const outgoingDir = Util.flip(pos.dir);

        switch (tile.tileId) {
            case TileId.STRAIGHT:
                return Util.sameAxis(tile.dir, pos.dir) ? tile.property(DirectionId.INTERNAL) : null;
            case TileId.CURVE:
                return Util.outputCurve(tile.dir, Util.flip(pos.dir)).dir !== -1 ? tile.property(DirectionId.INTERNAL) : null;
            case TileId.CROSS:
                return Util.sameAxis(tile.dir, pos.dir) ? tile.property(AxisId.HORIZONTAL) : tile.property(AxisId.VERTICAL);
            case TileId.MIX:
            case TileId.UNMIX:
            case TileId.UP:
            case TileId.DOWN:
                return outgoingDir === tile.dir ? tile.property(DirectionId.LEFT)
                    : outgoingDir === Util.cw(tile.dir) ? tile.property(DirectionId.UP)
                    : outgoingDir === Util.flip(tile.dir) ? tile.property(DirectionId.RIGHT)
                    : null;
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