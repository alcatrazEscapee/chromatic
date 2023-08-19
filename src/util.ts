
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
        return (dir + 1) % DirectionId.length;
    }

    export function ccw(dir: DirectionId): DirectionId {
        return (dir + 3) % DirectionId.length;
    }

    export function getInputPos(palette: Palette, x: number, y: number, dir: DirectionId): Point {
        const pos: Point = {
            x: Constants.GRID_LEFT + palette.tileWidth * x + palette.tileWidth / 2,
            y: Constants.GRID_TOP + palette.tileWidth * y + palette.tileWidth / 2,
        }
        move(pos, dir, -palette.tileWidth / 2 - 10);
        return pos;
    }

    export function getOutputPos(palette: Palette, x: number, y: number, dir: DirectionId): Point {
        const pos: Point = {
            x: Constants.GRID_LEFT + palette.tileWidth * x + palette.tileWidth / 2,
            y: Constants.GRID_TOP + palette.tileWidth * y + palette.tileWidth / 2,
        }
        move(pos, dir, -palette.tileWidth / 2 + 10);
        return pos;
    }
}