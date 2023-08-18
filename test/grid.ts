import { Color } from "../src/color";
import { Directions } from "../src/geometry";
import { Grid } from "../src/grid";
import { Pieces } from "../src/pieces/pieces";


const ONE_INPUT: PuzzleData = {
    inputs: [
        {color: 'red', pressure: 1, x: 0, y: 2, dir: 'right'}
    ],
    outputs: []
};

const INPUT_AND_OUTPUT: PuzzleData = {
    inputs: [
        {color: 'red', pressure: 1, x: 0, y: 2, dir: 'right'}
    ],
    outputs: [
        {color: 'red', pressure: 1, x: 4, y: 2, dir: 'right'}
    ]
};

const TWO_INPUTS: PuzzleData = {
    inputs: [
        {color: 'blue', pressure: 1, x: 0, y: 2, dir: 'right'},
        {color: 'yellow', pressure: 1, x: 4, y: 2, dir: 'left'}
    ],
    outputs: []
}

describe('Grid', () => {

    test('load INPUT_AND_OUTPUT', () => {
        const grid: Grid = new Grid(5);

        grid.load(INPUT_AND_OUTPUT);

        expect(grid.getPiece({x: 0, y: 2})?.state()).toEqual({
            type: 'input',
            color: Color.RED,
            pressure: 1
        });
        expect(grid.getPiece({x: 4, y: 2})?.state()).toEqual({
            type: 'output',
            color: Color.RED,
            pressure: 1,
            source: null
        });
    });

    test('add straight piece', () => {
        const grid: Grid = new Grid(5);

        grid.addPiece({x: 2, y: 2}, Pieces.STRAIGHT);

        expect(grid.getPiece({x: 2, y: 2})?.state()).toEqual({
            type: 'linear',
            port1: Directions.LEFT,
            port2: Directions.RIGHT,
            source1: null,
            source2: null
        });
    });

    test('flow into straight piece', () => {
        const grid: Grid = new Grid(5);
        
        grid.load(ONE_INPUT);
        grid.addPiece({x: 1, y: 2}, Pieces.STRAIGHT);
        grid.tick(1);

        expect(grid.getPiece({x: 1, y: 2})?.state()).toEqual({
            type: 'linear',
            port1: Directions.LEFT,
            port2: Directions.RIGHT,
            source1: { color: Color.RED, pressure: 1 },
            source2: null
        });
    });

    test('flow into straight piece and rotate', () => {
        const grid: Grid = new Grid(5);

        grid.load(ONE_INPUT);
        grid.addPiece({x: 1, y: 2}, Pieces.STRAIGHT);
        grid.tick(10);
        grid.rotatePiece({x: 1, y: 2});

        expect(grid.getPiece({x: 1, y: 2})?.state()).toEqual({
            type: 'linear',
            port1: Directions.UP,
            port2: Directions.DOWN,
            source1: null,
            source2: null
        });
    });

    test('flow through multiple straight pieces', () => {
        const grid: Grid = new Grid(5);

        grid.load(ONE_INPUT);
        grid.addPiece({x: 1, y: 2}, Pieces.STRAIGHT);
        grid.addPiece({x: 2, y: 2}, Pieces.STRAIGHT);
        grid.tick(30);

        expect(grid.getPiece({x: 1, y: 2})?.state()).toEqual({
            type: 'linear',
            port1: Directions.LEFT,
            port2: Directions.RIGHT,
            source1: { color: Color.RED, pressure: 1 },
            source2: null
        });

        expect(grid.getPiece({x: 2, y: 2})?.state()).toEqual({
            type: 'linear',
            port1: Directions.LEFT,
            port2: Directions.RIGHT,
            source1: { color: Color.RED, pressure: 1 },
            source2: null
        });
    });

    test('flow through pieces, remove piece, ensure flow disappears', () => {
        const grid: Grid = new Grid(5);

        grid.load(ONE_INPUT);
        grid.addPiece({x: 1, y: 2}, Pieces.STRAIGHT);
        grid.addPiece({x: 2, y: 2}, Pieces.STRAIGHT);
        grid.addPiece({x: 3, y: 2}, Pieces.STRAIGHT);
        grid.tick(50);
        grid.removePiece({x: 1, y: 2});
        grid.tick(1);

        expect(grid.getPiece({x: 3, y: 2})?.state()).toEqual({
            type: 'linear',
            port1: Directions.LEFT,
            port2: Directions.RIGHT,
            source1: null,
            source2: null
        });
    });

    test('two straight pieces flow into each other', () => {
        const grid: Grid = new Grid(5);

        grid.load(TWO_INPUTS);
        grid.addPiece({x: 1, y: 2}, Pieces.STRAIGHT);
        grid.addPiece({x: 2, y: 2}, Pieces.STRAIGHT);
        grid.addPiece({x: 3, y: 2}, Pieces.STRAIGHT);
        grid.tick(30);

        expect(grid.getPiece({x: 2, y: 2})?.state()).toEqual({
            type: 'linear',
            port1: Directions.LEFT,
            port2: Directions.RIGHT,
            source1: { color: Color.BLUE, pressure: 1 },
            source2: { color: Color.YELLOW, pressure: 1 }
        });
    });
});