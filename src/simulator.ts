import type { Container } from "pixi.js";

import { Tile } from "./tile.js";
import { Util } from "./util.js";
import { Flow, EdgeFlow, StraightFlow, CrossUnderFlow, CurveFlow } from "./flow.js";


interface IncomingFlow {
    x: number,
    y: number,
    dir: DirectionId,
    color: ColorId,
    pressure: PressureId,
}


export class Simulator {

    readonly queue: IncomingFlow[];
    readonly outputs: IncomingFlow[];
    readonly edges: Flow[];

    readonly flowContainer: Container;
    
    delta: number;

    constructor(flowContainer: Container) {
        this.flowContainer = flowContainer;

        this.queue = [];
        this.outputs = [];
        this.edges = [];

        this.delta = 0;
    }

    reset(): void {
        for (const edge of this.edges) {
            edge.destroy();
        }

        (this as Mutable<Simulator>).queue = [];
        (this as Mutable<Simulator>).edges = [];
    }

    init(palette: Palette, puzzle: NetworkPuzzle): void {

        // We start flows for the edges, but those don't take a full step to complete
        // So, we start at a full step, minus just the time for those to complete
        this.delta = Constants.SIMULATOR_TICKS_PER_STEP * (1 - 20 / palette.tileWidth);

        for (const [x, y, dir, color, pressure] of puzzle.inputs) {
            this.queue.push({ x, y, dir, color, pressure });

            // Additionally, create and start input flows
            this.addEdgeFlow(palette, x, y, dir, color, true);
        }
        for (const [x, y, dir, color, pressure] of puzzle.outputs) {
            this.outputs.push({ x, y, dir, color, pressure });
        }
    }

    tick(delta: number, palette: Palette, tiles: (Tile | null)[]) {

        this.delta += delta;
        if (this.delta < Constants.SIMULATOR_TICKS_PER_STEP) {
            return; // Wait for the next step
        }

        this.delta -= Constants.SIMULATOR_TICKS_PER_STEP;

        const incoming = this.queue;
        (this as Mutable<Simulator>).queue = [];
        for (const inc of incoming) {
            // Handle the incoming flow
            // 1. Check if the incoming flow is valid for the tile. If not,
            //    -> create a leak, and animate it.
            // 2. If the flow is valid for the tile, compute the correct flow animation
            //    -> Then enqueue a new flow for the outgoing
            //    -> If the flow produces a invalid result (i.e. via action, or conflict), then also create a leak

            if (!Util.isIn(inc.x, inc.y, 0, 0, palette.width)) {
                // Check if we're satisfying any outputs
                // If the output matches, create an output flow here
                // Otherwise, we need to create an error
                // todo: actually check that, for now just output flow
                this.addEdgeFlow(palette, inc.x, inc.y, inc.dir, inc.color, false);
                continue;
            }
            
            const index = inc.x + palette.width * inc.y;
            const tile = tiles[index]!;
            if (tile === null) {
                // No tile = create a leak from the incoming source -> this location.
                continue;
            }

            switch (tile.tileId) {
                case TileId.STRAIGHT:
                    // Straight pipes have a single flow capacity, and so use the `INTERNAL` direction
                    if (!Util.sameAxis(tile.dir, inc.dir)) {
                        // todo: create a leak, because this tile does not connect with the adjacent one
                        continue;
                    }
                    if (tile.hasFlow(DirectionId.INTERNAL)) {
                        // todo: create a leak, because this tile already has a flow
                        continue;
                    }
                    tile.addFlow(DirectionId.INTERNAL, new StraightFlow(palette, inc.color, inc.dir));
                    this.enqueue(inc, inc.dir, inc.dir, inc.color, inc.pressure);
                    break;
                case TileId.CURVE:
                    // Curve tiles have a single flow capacity, and also use `INTERNAL` direction
                    // Default curve tile is dir = LEFT, with but is able to accept DOWN and RIGHT
                    const adj = Util.cw(inc.dir);

                    if (tile.hasFlow(DirectionId.INTERNAL)) {
                        // todo: create a leak, because we have a flow and this is always incompatible
                        continue;
                    }

                    if (adj === tile.dir) {
                        // Accept from adj, and exit cw(adj)
                        tile.addFlow(DirectionId.INTERNAL, new CurveFlow(palette, inc.color, inc.dir, true));
                        this.enqueue(inc, Util.cw(inc.dir), Util.cw(inc.dir), inc.color, inc.pressure);
                        continue;
                    }
                    
                    if (Util.cw(adj) === tile.dir) {
                        // Accept from cw(adj), and exit adj
                        tile.addFlow(DirectionId.INTERNAL, new CurveFlow(palette, inc.color, inc.dir, false));
                        this.enqueue(inc, Util.ccw(inc.dir), Util.ccw(inc.dir), inc.color, inc.pressure);
                        continue;
                    }

                    // todo: create a leak, because the curve pipe does not connect

                    break;
                case TileId.CROSS:
                    // Cross can support two flows - a straight, and a split straight, so they use `AxisId` to differentiate them
                    const axis: AxisId = Util.dirToAxis(inc.dir);
                    if (tile.hasFlow(axis)) {
                        // todo: create a leak, because this tile already has a flow in this axis
                        continue;
                    }
                    // The flow is keyed using the axis of the incoming flow
                    // The type of flow (either straight, or cross-under) is set by checking axis == tileAxis
                    const tileAxis = Util.dirToAxis(tile.dir);

                    tile.addFlow(axis, axis == tileAxis ? 
                        new StraightFlow(palette, inc.color, inc.dir) :
                        new CrossUnderFlow(palette, inc.color, inc.dir));
                    this.enqueue(inc, inc.dir, inc.dir, inc.color, inc.pressure);
                    break;
                default:
                    throw new Error(`Don't know how to handle tileId=${tile.tileId} yet`);
            }
        }
    }

    private addEdgeFlow(palette: Palette, x: number, y: number, dir: DirectionId, color: ColorId, input: boolean): void {
        const pos: Point = input ?
            Util.getInputPos(palette, x, y, dir) :
            Util.getOutputPos(palette, x, y, dir);
        const flow: Flow = new EdgeFlow(palette, color);

        flow.root.position.set(pos.x, pos.y);
        flow.root.angle += 90 * dir;
        
        this.edges.push(flow);
        this.flowContainer.addChild(flow.root);

        PIXI.Ticker.shared.add(flow.tick, flow);
    }

    private enqueue(pos: {x: number, y: number}, move: DirectionId, dir: DirectionId, color: ColorId, pressure: PressureId): void {
        const flow = { x: pos.x, y: pos.y, dir, color, pressure };
        Util.move(flow, move);
        this.queue.push(flow);
        console.log(flow);
    }
}
