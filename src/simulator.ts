import type { Container } from "pixi.js";

import { Tile } from "./tile.js";
import { Util } from "./util.js";
import { Flow, EdgeFlow, StraightFlow, CrossUnderFlow, CurveFlow, PartialFlow } from "./flow.js";
import { Leak } from "./leak.js";


interface IncomingFlow {
    readonly x: number,
    readonly y: number,
    readonly dir: DirectionId,
    readonly color: ColorId,
    readonly pressure: PressureId,
}

interface Satisfiable {
    satisfied: boolean
}


export class Simulator {

    readonly queue: IncomingFlow[];
    readonly outputs: (IncomingFlow & Satisfiable)[];
    readonly buffers: (IncomingFlow | null)[];
    readonly edges: Flow[];
    readonly leaks: Leak[];

    readonly flowContainer: Container;
    
    delta: number;

    constructor(flowContainer: Container) {
        this.flowContainer = flowContainer;

        this.queue = [];
        this.outputs = [];
        this.buffers = [];
        this.edges = [];
        this.leaks = [];

        this.delta = 0;
    }

    reset(): void {
        for (const edge of this.edges) {
            edge.destroy();
        }
        
        for (const leak of this.leaks) {
            leak.destroy();
        }

        const mut = this as Mutable<Simulator>;

        mut.queue = [];
        mut.buffers = [];
        mut.edges = [];
        mut.leaks = [];
    }

    init(palette: Palette, puzzle: NetworkPuzzle): void {

        // We start flows for the edges, but those don't take a full step to complete
        // So, we start at a full step, minus just the time for those to complete
        this.delta = Constants.TICKS_PER_SIMULATOR_STEP * (1 - 20 / palette.tileWidth);

        for (const [x, y, dir, color, pressure] of puzzle.inputs) {
            this.queue.push({ x, y, dir, color, pressure });

            // Additionally, create and start input flows
            this.addEdgeFlow(palette, x, y, dir, color, pressure, true);
        }

        for (const [x, y, dir, color, pressure] of puzzle.outputs) {
            this.outputs.push({ x, y, dir, color, pressure, satisfied: false });
        }

        for (let i = 0; i < palette.width * palette.width; i++) {
            this.buffers.push(null);
        }
    }

    tick(delta: number, palette: Palette, tiles: (Tile | null)[]) {

        this.delta += delta;
        if (this.delta < Constants.TICKS_PER_SIMULATOR_STEP) {
            return; // Wait for the next step
        }

        this.delta -= Constants.TICKS_PER_SIMULATOR_STEP;

        const incoming: IncomingFlow[] = this.queue;
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
                let found = false;
                for (const out of this.outputs) {
                    if (out.x == inc.x && out.y == inc.y && out.color == inc.color && out.pressure == inc.pressure && !out.satisfied) {
                        out.satisfied = true;
                        found = true;

                        this.addEdgeFlow(palette, inc.x, inc.y, inc.dir, inc.color, inc.pressure, false);
                        break;
                    }
                }
                if (!found) {
                    // No matching output found, so leak
                    this.addLeakFrom(palette, inc);
                } else {
                    // Check if all are satisfied!
                    let win = true;
                    for (const out of this.outputs) {
                        if (!out.satisfied) {
                            win = false;
                            break;
                        }
                    }
                    if (win) {
                        console.log('Victory!');
                        // todo: do something here?
                    }
                }
                continue;
            }
            
            const index = inc.x + palette.width * inc.y;
            const tile = tiles[index]!;
            if (tile === null) {
                // No tile = create a leak from the incoming source -> this location.
                this.addLeakFrom(palette, inc);
                continue;
            }

            switch (tile.tileId) {
                case TileId.STRAIGHT:
                    // Straight pipes have a single flow capacity, and so use the `INTERNAL` direction
                    if (!Util.sameAxis(tile.dir, inc.dir)) {
                        // Tile does not connect to the adjacent one
                        this.addLeakFrom(palette, inc);
                        continue;
                    }
                    if (tile.hasFlow(DirectionId.INTERNAL)) {
                        // Tile already has a flow
                        this.addLeakFrom(palette, inc);
                        continue;
                    }
                    tile.addFlow(DirectionId.INTERNAL, new StraightFlow(palette, inc.color, inc.dir));
                    this.enqueue(inc, inc.dir, inc.color, inc.pressure);
                    break;
                case TileId.CURVE:
                    // Curve tiles have a single flow capacity, and also use `INTERNAL` direction
                    // Default curve tile is dir = LEFT, with but is able to accept DOWN and RIGHT
                    const adj = Util.cw(inc.dir);

                    if (tile.hasFlow(DirectionId.INTERNAL)) {
                        // Tile already has a flow, which is always incompatible
                        this.addLeakFrom(palette, inc);
                        continue;
                    }

                    if (adj === tile.dir) {
                        // Accept from adj, and exit cw(adj)
                        tile.addFlow(DirectionId.INTERNAL, new CurveFlow(palette, inc.color, inc.dir, true));
                        this.enqueue(inc, Util.cw(inc.dir), inc.color, inc.pressure);
                        continue;
                    }
                    
                    if (Util.cw(adj) === tile.dir) {
                        // Accept from cw(adj), and exit adj
                        tile.addFlow(DirectionId.INTERNAL, new CurveFlow(palette, inc.color, inc.dir, false));
                        this.enqueue(inc, Util.ccw(inc.dir), inc.color, inc.pressure);
                        continue;
                    }

                    // Tile does not connect
                    this.addLeakFrom(palette, inc);
                    break;
                case TileId.CROSS:
                    // Cross can support two flows - a straight, and a split straight, so they use `AxisId` to differentiate them
                    const axis: AxisId = Util.dirToAxis(inc.dir);
                    if (tile.hasFlow(axis)) {
                        // There is already a flow in this axis
                        this.addLeakFrom(palette, inc);
                        continue;
                    }
                    // The flow is keyed using the axis of the incoming flow
                    // The type of flow (either straight, or cross-under) is set by checking axis == tileAxis
                    const tileAxis = Util.dirToAxis(tile.dir);

                    tile.addFlow(axis, axis == tileAxis ? 
                        new StraightFlow(palette, inc.color, inc.dir) :
                        new CrossUnderFlow(palette, inc.color, inc.dir));
                    this.enqueue(inc, inc.dir, inc.color, inc.pressure);
                    break;
                
                // All actions have a default orientation of < ^ >, with default direction LEFT
                // So cw(tile.dir) is the omitted direction on all actions.
                //
                // Otherwise, we index the flows by the direction **of the incoming or outgoing flow**
                // So, we create an incoming independent of the rotation.
                //
                // Process for creating flows on a action tile is as follows:
                // 1. Check if we're at the cw(dir) side, if so, create a leak
                // 2. Check if the tile has < 3 flows
                //    -> If it has 3 flows, it has already been fully populated, which means we leak the incoming flow
                //    -> If it has < 3 flows, it can only have incoming flows (and should have < 2)
                //       This means we don't need to check if there are already flows in the tile
                // 3. If we are the second incoming flow, then we need to perform the action operation (and add an outgoing flow)
                //    -> Otherwise, we simply buffer the current incoming in our `buffers` field.
                case TileId.MIX:
                case TileId.UNMIX:
                case TileId.UP:
                case TileId.DOWN:
                    if (Util.cw(tile.dir) == inc.dir) {
                        this.addLeakFrom(palette, inc);
                        continue;
                    }

                    const total = tile.totalFlows();
                    if (total === 3) { // Fully populated, with outgoing flow, so can't input and create a leak (ref 2.)
                        this.addLeakFrom(palette, inc);
                        continue;
                    }

                    // Create a flow into the action tile
                    tile.addFlow(inc.dir, new PartialFlow(palette, inc.color, inc.dir, true));
                    
                    if (total === 0) {
                        // No previous flows, so store this one in a buffer, and exit
                        this.buffers[index] = inc;
                        continue;
                    }

                    // Previous flow was found
                    const other: IncomingFlow = this.buffers[index]!;

                    // Delegate action handling to a separate function
                    this.tickAction(palette, tile, other, inc);
                    break;
                default:
                    throw new Error(`Invalid tileId=${tile.tileId}`);
            }
        }
    }

    private tickAction(palette: Palette, tile: Tile, left: IncomingFlow, right: IncomingFlow): void {
        switch (tile.tileId) {
            case TileId.MIX:
                // Mixer requires pressure = 1
                if (left.pressure !== 1 || right.pressure !== 1) {
                    this.addLeakAt(palette, left, right);
                    return;
                }

                // Mix two colors, and create a flow on the output side if valid
                const mix: ColorId | -1 = Util.mix(left.color, right.color);
                if (mix == -1) {
                    this.addLeakAt(palette, left, right);
                    return;
                }

                {
                    const keyDir = Util.outputDir(tile.dir, left.dir, right.dir);
                    const outDir = Util.flip(keyDir); // The actual output dir needs to be in 'outgoing' convention, not 'incoming'
                    
                    tile.addFlow(keyDir, new PartialFlow(palette, mix, outDir, false));
                    this.enqueue(left, outDir, mix, 1 as PressureId);
                }
                break;
            case TileId.UNMIX:
                break;
            case TileId.UP:
                // Up requires equal colors
                if (left.color !== right.color) {
                    this.addLeakAt(palette, left, right);
                    return;
                }

                {
                    const keyDir = Util.outputDir(tile.dir, left.dir, right.dir);
                    const outDir = Util.flip(keyDir); // The actual output dir needs to be in 'outgoing' convention, not 'incoming'

                    tile.addFlow(keyDir, new PartialFlow(palette, left.color, outDir, false));
                    this.enqueue(left, outDir, left.color, (left.pressure + right.pressure) as PressureId);
                }
                break;
            case TileId.DOWN:
                break;
            default:
                throw new Error(`Invalid action tileId=${tile.tileId}`);
        }
    }

    private addEdgeFlow(palette: Palette, x: number, y: number, dir: DirectionId, color: ColorId, pressure: PressureId, input: boolean): void {
        const pos: Point = input ?
            Util.getInputPos(palette, x, y, dir) :
            Util.getOutputPos(palette, x, y, dir);
        const flow: Flow = new EdgeFlow(palette, color, pressure);

        flow.root.position.set(pos.x, pos.y);
        flow.root.angle += 90 * dir;
        
        this.flowContainer.addChild(flow.root);
        this.edges.push(flow);

        PIXI.Ticker.shared.add(flow.tick, flow);
    }

    private addLeakAt(palette: Palette, left: IncomingFlow, right: IncomingFlow): void {
        this.addLeak(palette, [left.color, right.color], left.x, left.y, -1, palette.insideLength);
    }

    private addLeakFrom(palette: Palette, inc: IncomingFlow): void {
        this.addLeak(palette, [inc.color], inc.x, inc.y, inc.dir, 0);
    }

    private addLeak(palette: Palette, colors: ColorId[], x: number, y: number, dir: DirectionId | -1, delay: number): void {
        const pos = Util.getGridPos(palette, x, y);
        const bias = {x: 0, y: 0};
        
        if (dir !== -1) {
            Util.move(pos, dir, -palette.tileWidth / 2);
            Util.move(bias, dir);
        }
        
        const leak = new Leak(colors, bias, palette.tileWidth, delay);

        leak.root.position.set(pos.x, pos.y);

        this.flowContainer.addChild(leak.root);
        this.leaks.push(leak);

        PIXI.Ticker.shared.add(leak.tick, leak);
    }

    private enqueue(pos: {x: number, y: number}, dir: DirectionId, color: ColorId, pressure: PressureId): void {
        const flow = { x: pos.x, y: pos.y, dir, color, pressure };
        Util.move(flow, dir);
        this.queue.push(flow);
    }
}
