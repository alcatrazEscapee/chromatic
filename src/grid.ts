import { IFilter, IGrid, IPiece, IPieceType, IPipe } from "./api";
import { Color } from "./color";
import { Direction, Directions, Pos } from "./geometry";
import { Pieces } from "./pieces/pieces";

export class Grid implements IGrid {

    public readonly width: number;
    
    private grid: (IPiece | null)[];
    private filters: ({down?: IFilter, right?: IFilter} | null)[];

    private queuedFlows: {
        source: Pos,
        to: Direction,
        flow: IPipe
    }[];

    public constructor(width: number) {
        this.width = width;
        this.grid = [];
        this.filters = [];

        this.queuedFlows = [];

        this.clear();
    }

    public load(data: PuzzleData): void {
        this.clear();

        data.inputs.forEach(input => this.addPiece({x: input.x, y: input.y}, Pieces.input(input)));
        data.outputs.forEach(output => this.addPiece({x: output.x, y: output.y}, Pieces.output(output)));
        data.filters?.forEach(filter => this.setFilter(filter));
    }

    public clear(): void {
        this.grid = [];
        this.filters = [];
        for (let i = 0; i < this.width * this.width; i++) {
            this.grid.push(null);
            this.filters.push(null);
        }
    }

    public tick(n: number = 1): void {

        if (n > 1) {
            for (let i = 0; i < n; i++) this.tick();
            return;
        }
        
        // Tick all pieces
        this.grid.forEach(piece => {
            if (piece !== null) {
                piece.tick(this);
            }
        });

        // Update all outgoing flows
        this.queuedFlows.forEach(item => {
            let flow: IPipe = item.flow;

            // Apply filters
            const filter: IFilter | null = this.getFilter(item.source, item.to);
            if (filter !== null) {
                flow = {
                    color: filter.color,
                    pressure: flow.pressure
                };
            }
            // Push flow to destination
            const dest: IPiece | null = this.getPiece(item.to.offset(item.source));
            if (dest === null || !dest.acceptFlow(this, item.to.opposite(), flow)) {
                // Pipe cannot accept incoming flow, play overflowing animation
            }
        });
        this.queuedFlows = [];
    }

    public addPiece(pos: Pos, type: IPieceType): void {
        this.removePiece(pos);
        this.setPiece(pos, type(pos));
    }

    public removePiece(pos: Pos): void {
        this.getPiece(pos)?.remove(this);
        this.setPiece(pos, null);
    }

    public rotatePiece(pos: Pos): void {
        this.getPiece(pos)?.rotate(this);
    }

    // Implement IGrid

    public addFlow(source: Pos, to: Direction, flow: IPipe): void {
        this.queuedFlows.push({
            source: source,
            to: to,
            flow: flow
        });
    }
    
    public removeFlow(source: Pos, to: Direction): void {
        this.getPiece(to.offset(source))?.removeFlow(this, to.opposite());
    }

    public getPiece(pos: Pos): IPiece | null {
        const piece: IPiece | null | undefined = this.grid[pos.x + this.width * pos.y];
        if (piece === undefined) {
            throw new TypeError(`Piece index out of bounds at pos=(${pos.x}, ${pos.y}) for width=${this.width} at getPiece()`);
        }
        return piece;
    }

    private setPiece(pos: Pos, piece: IPiece | null): void {
        if (pos.x < 0 || pos.y < 0 || pos.x >= this.width || pos.y >= this.width) {
            throw new TypeError(`Piece index out of bounds at pos=(${pos.x}, ${pos.y}) for width=${this.width} at setPiece()`);
        }
        this.grid[pos.x + this.width * pos.y] = piece;
    }

    public getFilter(pos: Pos, direction: Direction): IFilter | null {
        let filter: IFilter | null | undefined;
        if (direction === Directions.DOWN) {
            filter = this.filters[pos.x + this.width * pos.y]?.down;
        } else if (direction === Directions.RIGHT) {
            filter = this.filters[pos.x + this.width * pos.y]?.right;
        } else if (direction === Directions.UP) {
            filter = this.filters[pos.x + this.width * (pos.y - 1)]?.down;
        } else if (direction === Directions.LEFT) {
            filter = this.filters[(pos.x - 1) + this.width * pos.y]?.right;
        }
        return filter ?? null;
    }

    private setFilter(filter: FilterData): void {
        const index: number = filter.x + this.width * filter.y;
        let pos: {down?: IFilter, right?: IFilter} | null | undefined = this.filters[index];
        if (pos === undefined) {
            throw new TypeError(`Filter index out of bounds at pos=(${filter.x}, ${filter.y}) for width=${this.width} at setFilter()`);
        }
        if (pos === null) {
            this.filters[index] = pos = {};
        }
        const instance = {color: Color.byId(filter.color)};
        if (filter.dir === 'down') {
            if (pos.down !== undefined) {
                throw new TypeError(`Overwriting a filter at pos=(${filter.x}, ${filter.y}), dir=${filter.dir}`);
            }
            pos.down = instance;
        } else { // filter.dir === 'right'
            if (pos.right !== undefined) {
                throw new TypeError(`Overwriting a filter at pos=(${filter.x}, ${filter.y}), dir=${filter.dir}`);
            }
            pos.right = instance;
        }
    }
}