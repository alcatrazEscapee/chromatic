
export interface Pos {
    readonly x: number;
    readonly y: number;
}

export interface Direction {
    readonly id: string;
    readonly dx: number;
    readonly dy: number;

    offset(pos: Pos): Pos;

    rotateCW(): Direction;
    opposite(): Direction;
    rotateCCW(): Direction;
}

export module Directions {

    class DirectionImpl {
        public readonly id: DirectionId;
        public readonly dx: number;
        public readonly dy: number;
    
        private readonly ordinal: number;
    
        constructor(id: DirectionId, ordinal: number, dx: number, dy: number) {
            this.id = id;
            this.ordinal = ordinal;
            this.dx = dx;
            this.dy = dy;
        }
    
        public offset(pos: Pos): Pos {
            return {x: pos.x + this.dx, y: pos.y + this.dy};
        }
    
        public rotateCW():  Direction { return VALUES[(this.ordinal + 1) % 4]!; }
        public opposite():  Direction { return VALUES[(this.ordinal + 2) % 4]!; }
        public rotateCCW(): Direction { return VALUES[(this.ordinal + 3) % 4]!; }
    
        // implements Object
    
        public toString(): string {
            return this.id;
        }
    }

    const VALUES: Direction[] = [];
    const BY_ID: Map<string, Direction> = new Map();

    export const UP: Direction = direction('up', 0, 0, -1);
    export const RIGHT: Direction = direction('right', 1, 1, 0);
    export const DOWN: Direction = direction('down', 2, 0, 1);
    export const LEFT: Direction = direction('left', 3, -1, 0);

    export function byId(id: string): Direction {
        const dir: Direction | undefined = BY_ID.get(id);
        if (dir === undefined) {
            throw new TypeError(`Invalid direction '${id}'`);
        }
        return dir;
    }

    function direction(id: DirectionId, ordinal: number, dx: number, dy: number): Direction {
        const dir: Direction = new DirectionImpl(id, ordinal, dx, dy);
        VALUES.push(dir);
        BY_ID.set(id, dir);
        return dir;
    }
}