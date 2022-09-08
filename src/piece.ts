import { Color } from "./color";
import { Direction, Directions, Pos } from "./geometry";


class PieceGrid {

}

interface IGrid {

    addFlow(source: Pos, to: Direction, flow: IPipe): void;
    
    removeFlow(source: Pos, to: Direction, flow: IPipe): void;
}

interface IState {

}

interface IPiece {

    tick(grid: IGrid): void;

    remove(grid: IGrid): void;
    rotate(grid: IGrid): void;
}

interface IPipe {
    color: Color;
    pressure: number;
}

const ANIM_TICKS = 20;
const ANIM_TICKS_HALF = ANIM_TICKS / 2;


class LinearPiece implements IPiece {

    private readonly pos: Pos;

    // Ports are directions oriented outward from the current piece
    private port1: Direction;
    private port2: Direction;

    // Sources = external inputs that have been pushed onto this piece
    private source1: IPipe | null = null;
    private source2: IPipe | null = null;

    // Ticks for a single source to flow across this pipe.
    private source1Ticks: number = 0;
    private source2Ticks: number = 0;

    public constructor(pos: Pos, port1: Direction, port2: Direction) {
        this.pos = pos;
        this.port1 = port1;
        this.port2 = port2;
    }

    // implements IPiece

    public tick(grid: IGrid): void {

        if (this.source1 !== null && this.source2 !== null) {
            // Collision - tick both flows up to half
            if (this.source1Ticks < ANIM_TICKS_HALF) {
                this.source1Ticks++;
            }
            if (this.source2Ticks < ANIM_TICKS_HALF) {
                this.source2Ticks++;
            }
        } else if (this.source1 !== null) {
            if (this.source1Ticks < ANIM_TICKS) {
                this.source1Ticks++;
                if (this.source1Ticks === ANIM_TICKS) {
                    // Flow port1 -> port2
                    grid.addFlow(this.pos, this.port2, this.source1);
                }
            }
        } else if (this.source2 !== null) {
            if (this.source2Ticks < ANIM_TICKS) {
                this.source2Ticks++;
                if (this.source2Ticks === ANIM_TICKS) {
                    // Flow port2 -> port1
                    grid.addFlow(this.pos, this.port1, this.source2);
                }
            }
        }
    }

    public remove(grid: IGrid): void {
        // Dissolve any flows on the current piece
        if (this.source1 !== null && this.source1Ticks === 20) {
            grid.removeFlow(this.pos, this.port2, this.source1);
        }
        if (this.source2 != null && this.source2Ticks === 20) {
            grid.removeFlow(this.pos, this.port1, this.source2);
        }

        // Reset values
        this.source1 = null;
        this.source2 = null;
        this.source1Ticks = 0;
        this.source2Ticks = 0;
    }

    public rotate(grid: IGrid): void {
        this.remove(grid);
        this.port1 = this.port1.rotateCW();
        this.port2 = this.port2.rotateCW();
    }
}
