import { IGrid, IPiece, IPipe, PieceState } from "../api";
import { ANIM_TICKS, ANIM_TICKS_HALF } from "../constants";
import { Direction, Pos } from "../geometry";


export class LinearPiece implements IPiece {

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

        //console.log(`Tick at ${this.pos.x}, ${this.pos.y}, with source1 ${this.source1} and source2 ${this.source2} and s1 = ${this.source1Ticks} and s2 = ${this.source2Ticks}`);
        if (this.source1 !== null && this.source2 !== null) {
            // Collision - tick both flows up to half
            if (this.source1Ticks < ANIM_TICKS_HALF) {
                this.source1Ticks++;
            }
            if (this.source2Ticks < ANIM_TICKS_HALF) {
                this.source2Ticks++;
            }
        } else if (this.source1 !== null) {
            //console.log('source1 !== null');
            if (this.source1Ticks < ANIM_TICKS) {
                this.source1Ticks++;
            }
            if (this.source1Ticks === ANIM_TICKS) {
                // Flow port1 -> port2
                //console.log(`Flowing from ${this.pos.x}, ${this.pos.y} in dir ${this.port2}`)
                grid.addFlow(this.pos, this.port2, this.source1);
            }
        } else if (this.source2 !== null) {
            if (this.source2Ticks < ANIM_TICKS) {
                this.source2Ticks++;
            }
            if (this.source2Ticks === ANIM_TICKS) {
                // Flow port2 -> port1
                grid.addFlow(this.pos, this.port1, this.source2);
            }
        }
    }

    public remove(grid: IGrid): void {
        // Dissolve any flows on the current piece
        if (this.source1 !== null && this.source1Ticks === ANIM_TICKS) {
            grid.removeFlow(this.pos, this.port2);
        }
        if (this.source2 != null && this.source2Ticks === ANIM_TICKS) {
            grid.removeFlow(this.pos, this.port1);
        }

        // Reset values
        this.source1 = null;
        this.source2 = null;
        this.source1Ticks = 0;
        this.source2Ticks = 0;
    }

    public removeFlow(grid: IGrid, from: Direction): void {
        //console.log(`removeFlow pos=${this.pos.x}, ${this.pos.y}, from=${from} where source1=${this.source1}, source1T=${this.source1Ticks}`);
        // Remove the current source (prevents cyclic removals), then propagate removal if we are at max tick, then reset ticks.
        if (from === this.port1 && this.source1 !== null) {
            this.source1 = null;
            if (this.source1Ticks == ANIM_TICKS) {
                grid.removeFlow(this.pos, this.port2);
            }
            this.source1Ticks = 0;
        }
        if (from == this.port2 && this.source2 !== null) {
            this.source2 = null;
            if (this.source2Ticks == ANIM_TICKS) {
                grid.removeFlow(this.pos, this.port1);
            }
            this.source2Ticks = 0;
        }
    }

    public acceptFlow(grid: IGrid, from: Direction, flow: IPipe): boolean {
        //console.log(`acceptFlow from=${from}, flow=${flow.color.id}, ==port1? ${from === this.port1}, ===port2? ${from === this.port2}`);
        if (from === this.port1) {
            if (this.source1 === null || this.source1.color !== flow.color || this.source1.pressure !== flow.pressure) {
                this.source1 = flow;
                this.source1Ticks = 0;
            }
        } else if (from === this.port2) {
            if (this.source2 === null || this.source2.color !== flow.color || this.source2.pressure !== flow.pressure) {
                this.source2 = flow;
                this.source2Ticks = 0;
            }
        } else {
            return false;
        }
        return true;
    }

    public rotate(grid: IGrid): void {
        this.remove(grid);
        this.port1 = this.port1.rotateCW();
        this.port2 = this.port2.rotateCW();
    }

    public state(): PieceState {
        return {type: 'linear', port1: this.port1, port2: this.port2, source1: this.source1, source2: this.source2};
    }
}