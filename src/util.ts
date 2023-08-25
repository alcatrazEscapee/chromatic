import type { Texture } from "pixi.js";


export const COLORS: {[_ in ColorId]: string} = [
    '#f00', '#00f', '#ff0',
    '#f60', '#909', '#090',
    '#630',
    '#6f0', '#066',
    '#c60', '#fc3',
    '#303', '#903'
]

export module Util {
    export function isIn(x: number, y: number, x0: number, y0: number, size: number): boolean {
        return x >= x0 && y >= y0 && x < x0 + size && y < y0 + size;
    }

    export function sameAxis(lhs: DirectionId, rhs: DirectionId): boolean {
        return (lhs % 2) == (rhs % 2);
    }

    export function dirToAxis(dir: DirectionId): AxisId {
        return dir % 2;
    }

    export function move(pos: Point, dir: DirectionId, delta: number = 1): void {
        switch (dir) {
            case DirectionId.LEFT:  pos.x -= delta; break;
            case DirectionId.UP:    pos.y -= delta; break;
            case DirectionId.RIGHT: pos.x += delta; break;
            case DirectionId.DOWN:  pos.y += delta; break;
        }
    }

    export function cw(dir: DirectionId): DirectionId {
        return (dir + 1) % 4;
    }

    export function flip(dir: DirectionId): DirectionId {
        return (dir + 2) % 4;
    }

    export function ccw(dir: DirectionId): DirectionId {
        return (dir + 3) % 4;
    }

    export function getInputPos(palette: Palette, x: number, y: number, dir: DirectionId): Point {
        const pos: Point = getGridPos(palette, x, y);
        move(pos, dir, -palette.tileWidth / 2 - 10);
        return pos;
    }

    export function getOutputPos(palette: Palette, x: number, y: number, dir: DirectionId): Point {
        const pos: Point = getGridPos(palette, x, y);
        move(pos, dir, -palette.tileWidth / 2 + 10);
        return pos;
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

    export function outputDir(tile: DirectionId, left: DirectionId, right: DirectionId): DirectionId {
        // The default orientation is < ^ > with dir = LEFT
        // `left` and `right` are both in *incoming flow* convention, so LEFT, DOWN, RIGHT
        // So, start at tile, and iterate ccw() until we find a dir we can return
        for (let dir = tile;; dir = ccw(dir)) {
            if (dir !== left && dir !== right) {
                console.log(tile, left, right, dir);
                return dir;
            }
        }
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

    export function insideTop(palette: Palette, pressure: 1 | 2 | 3 | 4): number {
        return palette.insideTop - (pressure - 1) * palette.pressureWidth;
    }

    export function insideTopExt(palette: Palette, pressure: 1 | 2 | 3 | 4): number {
        return palette.insideTop - (pressure - 1) * palette.pressureWidth - palette.pipeWidth;
    }

    export function insideWidth(palette: Palette, pressure: 1 | 2 | 3 | 4): number {
        return palette.insideWidth + 2 * (pressure - 1) * palette.pressureWidth;
    }
}