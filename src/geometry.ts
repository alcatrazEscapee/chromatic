
export interface Direction {
    readonly id: string;
    readonly dx: number;
    readonly dy: number;

    rotateCW(): Direction;
    rotateCCW(): Direction;
}

export module Directions {

    export const UP: Direction = direction('up', 0, 0, -1);
    export const RIGHT: Direction = direction('right', 1, 1, 0);
    export const DOWN: Direction = direction('down', 2, 0, 1);
    export const LEFT: Direction = direction('left', 3, -1, 0);

    const DIRECTIONS = [UP, RIGHT, DOWN, LEFT];

    function direction(id: string, ordinal: number, dx: number, dy: number): Direction {
        return new DirectionImpl(id, ordinal, dx, dy);
    }

    class DirectionImpl {
        public readonly id: string;
        public readonly dx: number;
        public readonly dy: number;

        private readonly ordinal: number;

        constructor(id: string, ordinal: number, dx: number, dy: number) {
            this.id = id;
            this.ordinal = ordinal;
            this.dx = dx;
            this.dy = dy;
        }

        public rotateCW(): Direction {
            return DIRECTIONS[(this.ordinal + 1) % 4]!;
        }

        public rotateCCW(): Direction {
            return DIRECTIONS[(this.ordinal + 3) % 4]!;
        }
    }
}

export class Pos {
    
    public readonly x: number;
    public readonly y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public offset(dir: Direction): Pos {
        return new Pos(this.x + dir.dx, this.y + dir.dy);
    }
}