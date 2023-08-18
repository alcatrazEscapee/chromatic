import { Color } from "./color";
import { Direction, Pos } from "./geometry";

type InputPieceState = {
    type: 'input',
    color: Color,
    pressure: number
};

type OutputPieceState = {
    type: 'output',
    color: Color,
    pressure: number,
    source: IPipe | null
}

type LinearPieceState = {
    type: 'linear',
    port1: Direction,
    port2: Direction,
    source1: IPipe | null,
    source2: IPipe | null
}

export type PieceState = InputPieceState | OutputPieceState | LinearPieceState


export interface IGrid {

    addFlow(source: Pos, to: Direction, flow: IPipe): void;
    
    /**
     * @param to The direction to propagate a flow removal to, in the outward facing convention from the {@code source}.
     */
    removeFlow(source: Pos, to: Direction): void;
}

export type IPieceType = (pos: Pos) => IPiece;

export interface IPiece {

    tick(grid: IGrid): void;

    /**
     * @param from The direction this flow is from, in outward facing convention.
     */
    removeFlow(grid: IGrid, from: Direction): void;

    /**
     * @param from: The direction this flow is from, in outward facing convention.
     * @return If the piece can accept the flow.
     */
    acceptFlow(grid: IGrid, from: Direction, flow: IPipe): boolean;

    remove(grid: IGrid): void;
    rotate(grid: IGrid): void;

    state(): PieceState;
}

export interface IFilter {
    color: Color;
}

export interface IPipe {
    readonly color: Color;
    readonly pressure: number;
}
