import { IPieceType } from "../api";
import { Directions } from "../geometry";
import { InputPiece, OutputPiece } from "./io";
import { LinearPiece } from "./linear";


export module Pieces {

    export function input(data: EdgeData): IPieceType {
        return pos => new InputPiece(pos, data);
    }

    export function output(data: EdgeData): IPieceType {
        return pos => new OutputPiece(pos, data);
    }

    export const STRAIGHT: IPieceType = pos => new LinearPiece(pos, Directions.LEFT, Directions.RIGHT);
    export const CURVE: IPieceType = pos => new LinearPiece(pos, Directions.LEFT, Directions.DOWN);

}