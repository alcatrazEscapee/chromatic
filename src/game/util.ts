import type { Container, Texture } from "pixi.js";

import { AxisId, ColorId, Constants, DirectionId, NetworkData } from "./constants.js";


export module Util {
    export const RAINBOW: ReadonlyArray<string> = ['#f00', '#f60', '#ff0', '#090', '#066', '#00f', '#909'];
    export const COLORS: Readonly<{[_ in ColorId]: string}> & ReadonlyArray<string> = [
        '#f00', '#00f', '#ff0',
        '#f60', '#909', '#090',
        '#630',
        '#6f0', '#066',
        '#c60', '#fc3',
        '#303', '#903'
    ];

    export const ZERO: Readonly<Point> = Object.freeze({ x: 0, y: 0 });

    export function clampMap(t: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
        return clampLerp(lerpInv(t, fromMin, fromMax), toMin, toMax);
    }

    export function clampLerp(t: number, min: number, max: number): number {
        return lerp(clamp(t, 0, 1), min, max);
    }

    export function lerp(t: number, min: number, max: number): number {
        return min + t * (max - min);
    }

    export function lerpInv(lerp: number, min: number, max: number): number {
        return (lerp - min) / (max - min);
    }

    export function clamp(t: number, min: number, max: number): number {
        return t < min ? min : (t > max ? max : t);
    }

    /** Returns true if the position (x, y) is within the square bounded by [x0, x0 + size), [y0, y0 + size) */
    export function isIn(x: number, y: number, x0: number, y0: number, size: number): boolean {
        return x >= x0 && y >= y0 && x < x0 + size && y < y0 + size;
    }

    export function dirToAxis(dir: DirectionId): AxisId {
        return dir % Constants.N_AXIS;
    }

    export function sameAxis(lhs: DirectionId, rhs: DirectionId): boolean {
        return (lhs % Constants.N_AXIS) == (rhs % Constants.N_AXIS);
    }

    export function move(pos: Point, dir: DirectionId, delta: number = 1): Point {
        switch (dir) {
            case DirectionId.LEFT:  pos.x -= delta; break;
            case DirectionId.UP:    pos.y -= delta; break;
            case DirectionId.RIGHT: pos.x += delta; break;
            case DirectionId.DOWN:  pos.y += delta; break;
        }
        return pos;
    }

    export function cw(dir: DirectionId): DirectionId {
        return (dir + 1) % Constants.N_DIRECTIONS;
    }

    export function flip(dir: DirectionId): DirectionId {
        return (dir + 2) % Constants.N_DIRECTIONS;
    }

    export function ccw(dir: DirectionId): DirectionId {
        return (dir + 3) % Constants.N_DIRECTIONS;
    }

    export function rotate(dir: DirectionId, base: DirectionId): DirectionId {
        return (dir + base) % Constants.N_DIRECTIONS;
    }

    export function unrotate(dir: DirectionId, base: DirectionId): DirectionId {
        return (dir - base + Constants.N_DIRECTIONS) % Constants.N_DIRECTIONS;
    }

    export function getInputPos(palette: Palette, x: number, y: number, dir: DirectionId): Point {
        const pos: Point = getGridPos(palette, x, y);
        return move(pos, dir, -palette.tileWidth / 2 - Constants.GRID_LEFT_HALF);
    }

    export function getOutputPos(palette: Palette, x: number, y: number, dir: DirectionId): Point {
        const pos: Point = getGridPos(palette, x, y);
        return move(pos, dir, -palette.tileWidth / 2 + Constants.GRID_LEFT_HALF);
    }

    export function getGridPos(palette: Palette, x: number, y: number): Point {
        return {
            x: Constants.GRID_LEFT + palette.tileWidth * x + palette.tileWidth / 2,
            y: Constants.GRID_TOP + palette.tileWidth * y + palette.tileWidth / 2,
        };
    }

    export function choose<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)]!;
    }

    export function nulls<T>(n: number): (T | null)[] {
        return new Array(n).fill(null);
    }

    const MIXES: [ColorId, ColorId, ColorId][] = [
        [ColorId.RED, ColorId.BLUE, ColorId.PURPLE],
        [ColorId.BLUE, ColorId.YELLOW, ColorId.GREEN],
        [ColorId.YELLOW, ColorId.RED, ColorId.ORANGE],

        [ColorId.RED, ColorId.GREEN, ColorId.BROWN],
        [ColorId.BLUE, ColorId.ORANGE, ColorId.BROWN],
        [ColorId.YELLOW, ColorId.PURPLE, ColorId.BROWN],

        [ColorId.RED, ColorId.PURPLE, ColorId.MAGENTA],
        [ColorId.BLUE, ColorId.PURPLE, ColorId.VIOLET],

        [ColorId.BLUE, ColorId.GREEN, ColorId.CYAN],
        [ColorId.YELLOW, ColorId.GREEN, ColorId.LIME],

        [ColorId.YELLOW, ColorId.ORANGE, ColorId.GOLD],
        [ColorId.RED, ColorId.ORANGE, ColorId.AMBER],
    ];

    export function mix(left: ColorId, right: ColorId): ColorId | -1 {
        for (const [l, r, m] of MIXES) {
            if ((l == left && r == right) || (l == right && r == left)) {
                return m;
            }
        }
        return -1;
    }

    export function unmix(mix: ColorId, left: ColorId): ColorId | -1 {
        for (const [l, r, m] of MIXES) {
            if (l == left && m == mix) {
                return r;
            }
            if (r == left && m == mix) {
                return l;
            }
        }
        return -1;
    }

    /**
     * When given the direction of an action `tile`, and two _incoming_ flow directions `left` and `right`,
     * Returns the missing flow direction, _also_ in _incoming_ flow convention.
     */
    export function outputDir(tile: DirectionId, left: DirectionId, right: DirectionId): DirectionId {
        // The default orientation is < ^ > with dir = LEFT
        // `left` and `right` are both in *incoming flow* convention, so LEFT, DOWN, RIGHT
        // So, start at tile, and iterate ccw() until we find a dir we can return
        for (let dir = tile;; dir = ccw(dir)) {
            if (dir !== left && dir !== right) {
                return dir;
            }
        }
    }

    /**
     * When given the direction of an action `tile`, and one _incoming_ flow direction,
     * Returns the other two flow directions _also_ in _incoming_ flow convention.
     */
    export function outputDirs(tile: DirectionId, flow: DirectionId): [DirectionId, DirectionId] {
        const left = outputDir(tile, flow, null!);
        const right = outputDir(left, left, flow);
        return [right, left];
    }

    /**
     * When `tile` is the direction property of a curve tile, and `inc` is an _incoming_ flow direction,
     * Returns the _outgoing_ flow direction, if it connects, otherwise `-1`.
     */
    export function outputCurve(tile: DirectionId, inc: DirectionId): { dir: DirectionId, cw: boolean } | { dir: -1, cw: false } {
        // Default curve tile is dir = LEFT, with but is able to accept DOWN and RIGHT
        const adj = cw(inc);
        if (adj === tile) {
            return { dir: cw(inc), cw: true };
        }
        if (cw(adj) === tile) {
            return { dir: ccw(inc), cw: false };
        }
        return { dir: -1, cw: false };
    }

    export function buildPalettes(core: AssetBundle<NetworkData, Texture>, textures: boolean = true): PaletteMap<Texture> {
        return [{
            width: 3,
            tileWidth: 120,
            pressureWidth: 5,
            pipeWidth: 4,
            insideWidth: 18,
            insideTop: 51,
            portWidth: 27,
            grid: core.grid_3x3,
            textures: textures ? buildPalette('pipe_120', core.pipe_120) : null!,
        }, {
            width: 4,
            tileWidth: 90,
            pressureWidth: 4,
            pipeWidth: 4,
            insideWidth: 12,
            insideTop: 39,
            portWidth: 20,
            grid: core.grid_4x4,
            textures: textures ? buildPalette('pipe_90', core.pipe_90) : null!,
        }, {
            width: 5,
            tileWidth: 72,
            pressureWidth: 3,
            pipeWidth: 5,
            insideWidth: 10,
            insideTop: 31,
            portWidth: 16,
            grid: core.grid_5x5,
            textures: textures ? buildPalette('pipe_72', core.pipe_72) : null!,
        }];
    }

    export function buildPalette<T extends PipeAssetId>(id: T, core: PipeSpritesheet<T, Texture>): PaletteTextures<Texture> {
        return {
            straight: buildPalettePipe(id, 'straight', core),
            curve: buildPalettePipe(id, 'curve', core),
            port: buildPalettePipe(id, 'port', core),
            edge: [
                core.textures[`${id}_edge_1`],
                core.textures[`${id}_edge_2`],
                core.textures[`${id}_edge_3`],
                core.textures[`${id}_edge_4`],
            ],
            action: [
                core.textures[`${id}_mix`],
                core.textures[`${id}_unmix`],
                core.textures[`${id}_up`],
                core.textures[`${id}_down`],
            ],
        }
    }

    function buildPalettePipe<T extends PipeAssetId>(id: T, key: 'straight' | 'curve' | 'port', core: PipeSpritesheet<T, Texture>): Array4<PalettePipeTextures<Texture>> {
        return [
            buildPalettePipePressure(id, key, 1, core),
            buildPalettePipePressure(id, key, 2, core),
            buildPalettePipePressure(id, key, 3, core),
            buildPalettePipePressure(id, key, 4, core),
        ]
    }

    function buildPalettePipePressure<T extends PipeAssetId>(id: T, key: 'straight' | 'curve' | 'port', pressure: 1 | 2 | 3 | 4, core: PipeSpritesheet<T, Texture>): PalettePipeTextures<Texture> {
        return {
            pipe: core.textures[`${id}_${key}_${pressure}`],
            overlay: {
                h: core.textures[`${id}_${key}_${pressure}_overlay_h`],
                v: core.textures[`${id}_${key}_${pressure}_overlay_v`],
            }
        };
    }

    export function clear(root: Container): void {
        for (let i = root.children.length - 1; i >= 0; i--) {
            root.children[0]?.destroy();
        }
    }

    export function insideTop(palette: Palette, pressure: 1 | 2 | 3 | 4): number {
        return palette.insideTop - (pressure - 1) * palette.pressureWidth;
    }

    export function outsideTop(palette: Palette, pressure: 1 | 2 | 3 | 4): number {
        return palette.insideTop - (pressure - 1) * palette.pressureWidth - palette.pipeWidth;
    }

    export function insideWidth(palette: Palette, pressure: 1 | 2 | 3 | 4): number {
        return palette.insideWidth + 2 * (pressure - 1) * palette.pressureWidth;
    }
}