import { IGrid, IPiece, IPipe, PieceState } from "../api";
import { Color } from "../color";
import { Direction, Directions, Pos } from "../geometry";


abstract class FixedPiece implements IPiece {

    protected readonly pos: Pos;
    protected readonly port: Direction;
    protected readonly edge: IPipe;

    protected constructor(pos: Pos, edge: EdgeData) {
        this.pos = pos;
        this.port = Directions.byId(edge.dir);
        this.edge = {
            color: Color.byId(edge.color),
            pressure: edge.pressure
        };
    }

    // implements IPiece

    public abstract tick(grid: IGrid): void;

    public abstract remove(grid: IGrid): void;

    public removeFlow(grid: IGrid, flow: Direction): void {}
    public acceptFlow(grid: IGrid, from: Direction, flow: IPipe): boolean {
        return false;
    }

    public rotate(grid: IGrid): void {}

    public abstract state(): any;
}


export class InputPiece extends FixedPiece {

    public constructor(pos: Pos, edge: EdgeData) {
        super(pos, edge);
    }

    // implements IPiece

    public tick(grid: IGrid): void {
        grid.addFlow(this.pos, this.port, this.edge);
    }

    public remove(grid: IGrid): void {
        grid.removeFlow(this.pos, this.port);
    }

    public state(): PieceState {
        return {type: 'input', color: this.edge.color, pressure: this.edge.pressure};
    }
}


export class OutputPiece extends FixedPiece {

    // Source pushed from external
    private source: IPipe | null;

    public constructor(pos: Pos, edge: EdgeData) {
        super(pos, edge);

        this.source = null;
    }

    // implements IPiece
    public tick(grid: IGrid): void { }

    public remove(grid: IGrid): void {
        grid.removeFlow(this.pos, this.port);
    }

    public state(): PieceState {
        return {type: 'output', color: this.edge.color, pressure: this.edge.pressure, source: this.source}
    }
}