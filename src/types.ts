type RootData = {
    readonly packs: ReadonlyArray<PackData>
};

type PackData = {
    readonly id: string,
    readonly size: number,
    readonly puzzles: ReadonlyArray<PuzzleData>
};

type PuzzleData = {
    readonly inputs: ReadonlyArray<EdgeData>,
    readonly outputs: ReadonlyArray<EdgeData>,
    readonly filters?: ReadonlyArray<FilterData>
};

type EdgeData = {
    readonly color: ColorId,
    readonly pressure: number,
    readonly x: number,
    readonly y: number;
    readonly dir: DirectionId
};

type FilterData = {
    readonly color: ColorId,
    readonly x: number,
    readonly y: number,
    readonly dir: 'down' | 'right'
};

type ColorId = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'brown' | 'magenta' | 'violet' | 'amber' | 'gold' | 'lime' | 'cyan';
type DirectionId = 'up' | 'right' | 'down' | 'left'
