

type RootData = {
    readonly packs: ReadonlyArray<PackData>
};

type PackData = {
    readonly id: string,
    readonly size: number,
    readonly puzzles: ReadonlyArray<PuzzleData>
};

type PuzzleData = {
    readonly inputs: Readonly<EdgeData>,
    readonly outputs: Readonly<EdgeData>,
    readonly filters?: Readonly<FilterData>
};

type EdgeData = {
    readonly color: ColorId,
    readonly pressure: number,
    readonly pos: number
};

type FilterData = {
    readonly pos1: number,
    readonly pos2: number,
    readonly color: ColorId,
    readonly direction: DirectionId
};

type ColorId = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'brown' | 'magenta' | 'violet' | 'amber' | 'gold' | 'lime' | 'cyan';
type DirectionId = 'H' | 'V';