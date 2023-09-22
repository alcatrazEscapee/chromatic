import { TileId } from "../constants";


enum PuzzleId {
    INTRO_STRAIGHT = 0,
    INTRO_CURVE_CROSS = 1,
    INTRO_MIX = 2,
    INTRO_UNMIX = 6,
    INTRO_UP = 18,
    INTRO_DOWN = 19,
}


export module Tutorial {

    /** For a given pipe and puzzle ID, return if it should be visible. */
    export function isTileEnabled(tileId: TileId, puzzleId: number): boolean {
        switch (tileId) {
            case TileId.EMPTY:
            case TileId.STRAIGHT:
                return true;
            case TileId.CURVE:
            case TileId.CROSS:
                return puzzleId >= PuzzleId.INTRO_CURVE_CROSS;
            case TileId.MIX:
                return puzzleId >= PuzzleId.INTRO_MIX;
            case TileId.UNMIX:
                return puzzleId >= PuzzleId.INTRO_UNMIX;
            case TileId.UP:
                return puzzleId >= PuzzleId.INTRO_UP;
            case TileId.DOWN:
                return puzzleId >= PuzzleId.INTRO_DOWN;
        }
    }

    export function isLabelTabEnabled(puzzleId: number): boolean {
        return puzzleId >= PuzzleId.INTRO_DOWN;
    }

    export function isPressureLabelsEnabled(puzzleId: number): boolean {
        return puzzleId >= PuzzleId.INTRO_UP;
    }
}