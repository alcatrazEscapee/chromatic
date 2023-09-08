import type { Container } from 'pixi.js';
import { AxisId, ColorId, Constants, DirectionId, NetworkPuzzle, TileId } from '../gen/constants';
import type { Flow } from './flow';
import { CrossUnderFlow, CurveFlow, EdgeFlow, PartialFlow, StraightFlow } from './flow';
import { Leak } from './leak';
import type { Tile } from './tile';
import { Util } from './util';


export interface IncomingFlow {
    readonly x: number,
    readonly y: number,
    readonly dir: DirectionId,
    readonly color: ColorId,
    readonly pressure: PressureId,
}

interface Satisfiable {
    satisfied: boolean
}


// This indirection is done for a couple reasons
// - We only expose `Simulator.Kind` as a public interface, not `Impl`
// - That means we can define `public readonly` properties on `Impl`, which are necessary for the `Mutable<T>` array-clear hack
// - But, since these properties are not exported, they are not exposed externally anywhere.
export module Simulator {

    export interface Callback {
        readonly puzzle: NetworkPuzzle | null,
        readonly tiles: (Tile | null)[],

        onVictory(): void;
    }

    export interface Kind {
        reset(): void;
        init(palette: Palette, callback: Callback): void;
        tick(delta: number, palette: Palette, callback: Callback): void;
    }

    export function create(flowContainer: Container): Kind {
        return new Impl(flowContainer);
    }
}


class Impl implements Simulator.Kind {

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

        (this as Mutable<Impl>).queue = [];
        (this as Mutable<Impl>).outputs = [];
        (this as Mutable<Impl>).buffers = [];
        (this as Mutable<Impl>).edges = [];
        (this as Mutable<Impl>).leaks = [];
    }

    init(palette: Palette, callback: Simulator.Callback): void {
        // We start flows for the edges, but those don't take a full step to complete
        // So, we start at a full step, minus just the time for those to complete
        this.delta = Constants.TICKS_PER_SIMULATOR_STEP * (1 - 20 / palette.tileWidth);

        for (const [x, y, dir, color, pressure] of callback.puzzle!.inputs) {
            this.queue.push({ x, y, dir, color, pressure });

            // Additionally, create and start input flows
            this.addEdgeFlow(palette, x, y, dir, color, pressure, true);
        }

        for (const [x, y, dir, color, pressure] of callback.puzzle!.outputs) {
            this.outputs.push({ x, y, dir, color, pressure, satisfied: false });
        }

        (this as Mutable<Impl>).buffers = Util.nulls(palette.width * palette.width);
    }

    tick(delta: number, palette: Palette, callback: Simulator.Callback) {

        this.delta += delta;
        if (this.delta < Constants.TICKS_PER_SIMULATOR_STEP) {
            return; // Wait for the next step
        }

        this.delta -= Constants.TICKS_PER_SIMULATOR_STEP;

        const incoming: IncomingFlow[] = this.queue;
        (this as Mutable<Impl>).queue = [];

        for (const inc of incoming) {

            // Try output first
            if (this.tickOutputs(palette, inc, callback)) {
                continue;
            }
            
            // Otherwise, find the current tile
            const index = inc.x + palette.width * inc.y;
            const tile = callback.tiles[index];
            if (tile === null) {
                // No tile = create a leak from the incoming source -> this location.
                this.addLeakFrom(palette, inc);
                continue;
            }

            this.tickFilter(inc, callback); // Apply filters (may mutate the color of `inc`)
            this.tickFlow(palette, inc, tile, index); // And then tick the flow through this tile
        }
    }

    /**
     * Checks if the incoming flow satisfies any outputs, handles it if so, and returns `true`
     */
    private tickOutputs(palette: Palette, inc: IncomingFlow, callback: Simulator.Callback): boolean {
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
                // Check if all are satisfied
                let win = true;
                for (const out of this.outputs) {
                    if (!out.satisfied) {
                        win = false;
                        break;
                    }
                }
                if (win) {
                    callback.onVictory();
                }
            }
            return true;
        }
        return false;
    }

    /**
     * Applies any existing filters to the incoming flow.
     */
    private tickFilter(inc: Mutable<IncomingFlow>, callback: Simulator.Callback): void {
        const color = Util.filter(callback.puzzle!, inc);
        if (color !== -1) {
            inc.color = color;
        }
    }

    /**
     * Ticks the flow movement through the current pipe.
     */
    private tickFlow(palette: Palette, inc: IncomingFlow, tile: Tile, index: number): void {
        // Handle the incoming flow
        // 1. Check if the incoming flow is valid for the tile. If not,
        //    -> create a leak, and animate it.
        // 2. If the flow is valid for the tile, compute the correct flow animation
        //    -> Then enqueue a new flow for the outgoing
        //    -> If the flow produces a invalid result (i.e. via action, or conflict), then also create a leak
    
        switch (tile.tileId) {
            case TileId.STRAIGHT:
                // Straight pipes have a single flow capacity, and so use the `INTERNAL` direction
                if (!Util.sameAxis(tile.dir, inc.dir) || // Tile does not connect to the provided direction
                    tile.hasFlow(DirectionId.INTERNAL) || // Or already has a flow
                    !tile.canAccept(DirectionId.INTERNAL, inc) // Or cannot accept due to labels
                ) {
                    this.addLeakFrom(palette, inc);
                    return;
                }
                tile.addFlow(DirectionId.INTERNAL, new StraightFlow(palette, inc.color, inc.pressure, inc.dir));
                this.enqueue(inc, inc.dir, inc.color, inc.pressure);
                break;
            case TileId.CURVE:
                // Curve tiles have a single flow capacity, and also use `INTERNAL` direction
                // Default curve tile is dir = LEFT, with but is able to accept DOWN and RIGHT
                const { dir: outDir, cw: outCw }  = Util.outputCurve(tile.dir, inc.dir);

                if (tile.hasFlow(DirectionId.INTERNAL) || // Tile does not connect
                    !tile.canAccept(DirectionId.INTERNAL, inc) || // Or cannot accept due to labels
                    outDir === -1 // Tile does not connect
                ) {
                    // Tile already has a flow, which is always incompatible
                    this.addLeakFrom(palette, inc);
                    return;
                }

                tile.addFlow(DirectionId.INTERNAL, new CurveFlow(palette, inc.color, inc.pressure, inc.dir, outCw));
                this.enqueue(inc, outDir, inc.color, inc.pressure);
                break;
            case TileId.CROSS:
                // Cross can support two flows - a straight, and a cross-under, so they use `AxisId` to differentiate them
                // The flow is keyed using the axis of the incoming flow
                // The type of flow (either straight, or cross-under) is set by checking axis == tileAxis

                const axis: AxisId = Util.dirToAxis(inc.dir);
                const tileAxis = Util.dirToAxis(tile.dir);

                if (tile.hasFlow(axis) || // Already has flow in this axis
                    !tile.canAccept(axis === tileAxis ? AxisId.HORIZONTAL : AxisId.VERTICAL, inc) // Or cannot accept in this axis
                ) {
                    // There is already a flow in this axis
                    this.addLeakFrom(palette, inc);
                    return;
                }

                // Check the pressure of the straight part of the pipe, which is needed when drawing a cross flow
                const straightPressure = tile.property(AxisId.HORIZONTAL).pressure;

                tile.addFlow(axis, axis == tileAxis ? 
                    new StraightFlow(palette, inc.color, inc.pressure, inc.dir) :
                    new CrossUnderFlow(palette, inc.color, inc.pressure, inc.dir, straightPressure));
                this.enqueue(inc, inc.dir, inc.color, inc.pressure);
                break;
            
            // All actions have a default orientation of < ^ >, with default direction LEFT
            // So cw(tile.dir) is the omitted direction on all actions.
            //
            // Otherwise, we index the flows by the direction **of the incoming or outgoing flow**
            // So, we create an incoming independent of the rotation.
            //
            // We need to handle additive (+, ^) slightly differently from subtractive (-, v) here.
            // In general, we follow the following steps:
            //
            // 1. Check if we're at the cw(dir) side, if so, create a leak
            // 2. Check the number of flows on the incoming tile
            //    -> == 3 (or == 2 for subtractive), means the tile is already populated, so leak the incoming flow
            //    -> == 2 (additive only), perform the additive action (and add an outgoing flow)
            //    -> == 1 (additive only), buffer the incoming flow
            //    -> == 1 (subtractive only), perform the subtractive action (and add two outgoing flows)
            //
            // N.B. Since each input only connects to the action one-way, if we know we have < 3 flows, we know there will only
            // be incoming flows to the action, therefor we don't need to check for overlapping flows.
            default:
                if (Util.cw(tile.dir) == inc.dir) {
                    this.addLeakFrom(palette, inc);
                    return;
                }

                const additive: boolean = tile.tileId === TileId.MIX || tile.tileId === TileId.UP;
                const total = tile.totalFlows();
                if (total >= (additive ? 3 : 2)) {
                    this.addLeakFrom(palette, inc);
                    return;
                }

                // Create a flow into the action tile
                tile.addFlow(inc.dir, new PartialFlow(palette, inc.color, inc.pressure, inc.dir, true));
                
                if (additive && total === 0) {
                    // No previous flows, so store this one in a buffer, and exit
                    this.buffers[index] = inc;
                    return;
                }

                // Handle the action operation, either additive (with two inputs), or subtractive (with one)
                if (additive) {
                    const other: IncomingFlow | null = this.buffers[index];

                    if (other === null) throw new Error(`Flow at ${inc.x}, ${inc.y} is not buffered`);

                    this.tickAdditive(palette, tile, inc, other);
                } else {
                    this.tickSubtractive(palette, tile, inc);
                }
                break;
        }
    }

    private tickAdditive(palette: Palette, tile: Tile, left: IncomingFlow, right: IncomingFlow): void {
        const out = { color: left.color, pressure: 1 as PressureId };

        switch (tile.tileId) {
            case TileId.MIX:
                // Mixer requires pressure = 1
                if (left.pressure !== 1 || right.pressure !== 1) {
                    this.addLeakAt(palette, left, [left.color, right.color]);
                    return;
                }

                // Mix two colors, and create a flow on the output side if valid
                const mix: ColorId | -1 = Util.mix(left.color, right.color);
                if (mix == -1) {
                    this.addLeakAt(palette, left, [left.color, right.color]);
                    return;
                }

                out.color = mix;
                break;
            case TileId.UP:
                // Up requires equal colors
                if (left.color !== right.color) {
                    this.addLeakAt(palette, left, [left.color]);
                    return;
                }

                const sum = left.pressure + right.pressure as PressureId;
                if (sum > Constants.MAX_PRESSURE) {
                    this.addLeakAt(palette, left, [left.color]);
                    return;
                }

                out.pressure = sum;
                break;
            default:
                throw new Error(`Invalid tileId=${tile.tileId}`);
        }

        const keyDir = Util.outputDir(tile.dir, left.dir, right.dir);
        const outDir = Util.flip(keyDir); // The actual output dir needs to be in 'outgoing' convention, not 'incoming'

        // Check output characteristics against the property
        // Note that properties are using an un-rotated, outgoing convention.
        const propertyDir = Util.unrotate(outDir, tile.dir);
        if (!tile.canAccept(propertyDir, out)) {
            this.addLeakAt(palette, left, [out.color]);
            return;
        }
        
        tile.addFlow(keyDir, new PartialFlow(palette, out.color, out.pressure, outDir, false));
        this.enqueue(left, outDir, out.color, out.pressure);
    }

    private tickSubtractive(palette: Palette, tile: Tile, flow: IncomingFlow): void {

        const [leftDir, rightDir] = Util.outputDirs(tile.dir, flow.dir);
        
        const leftOutDir = Util.flip(leftDir);
        const rightOutDir = Util.flip(rightDir);
        
        const leftPropertyDir = Util.unrotate(leftOutDir, tile.dir);
        const rightPropertyDir = Util.unrotate(rightOutDir, tile.dir);

        const leftProperty = tile.property(leftPropertyDir);
        const rightProperty = tile.property(rightPropertyDir);

        const leftOut = { color: flow.color, pressure: 1 as PressureId };
        const rightOut = { color: flow.color, pressure: 1 as PressureId };

        switch (tile.tileId) {
            case TileId.UNMIX:
                if (flow.pressure !== 1) { // Separator requires pressure = 1
                    this.addLeakAt(palette, flow, [flow.color]);
                    return;
                }

                // Compute the left and right color, based on which properties are present
                if (leftProperty.color !== null && rightProperty.color !== null) {
                    const mix = Util.mix(leftProperty.color, rightProperty.color);
                    
                    if (mix !== flow.color) { // Check that both labels are valid, i.e. they make a valid mix
                        this.addLeakAt(palette, flow, [flow.color]);
                        return;
                    }

                    leftOut.color = leftProperty.color;
                    rightOut.color = rightProperty.color;
                
                } else if (leftProperty.color !== null) { // Only left property present
                    const unmix = Util.unmix(flow.color, leftProperty.color);

                    if (unmix === -1) {
                        this.addLeakAt(palette, flow, [flow.color]);
                        return;
                    }

                    leftOut.color = leftProperty.color;
                    rightOut.color = unmix;
                
                } else if (rightProperty.color !== null) { // Only right property present
                    const unmix = Util.unmix(flow.color, rightProperty.color);

                    if (unmix === -1) {
                        this.addLeakAt(palette, flow, [flow.color]);
                        return;
                    }

                    leftOut.color = unmix;
                    rightOut.color = rightProperty.color;
                } else {
                    // At least one property must be present for unmix to function correctly
                    this.addLeakAt(palette, flow, [flow.color]);
                    return;
                }
                break;
            case TileId.DOWN:
                if (leftProperty.pressure + rightProperty.pressure !== flow.pressure) {
                    // Expected pressure != sum of output pressures
                    this.addLeakAt(palette, flow, [flow.color]);
                    return;
                }

                leftOut.pressure = leftProperty.pressure;
                rightOut.pressure = rightProperty.pressure;
                break;
            default:
                throw new Error(`Invalid tileId=${tile.tileId}`);
        }

        // Check that both outputs are satisfied
        if (!tile.canAccept(leftPropertyDir, leftOut) || !tile.canAccept(rightPropertyDir, rightOut)) {
            this.addLeakAt(palette, flow, [leftOut.color, rightOut.color]);
            return;
        }

        // Add both output flows
        tile.addFlow(leftDir, new PartialFlow(palette, leftOut.color, leftOut.pressure, leftOutDir, false));
        tile.addFlow(rightDir, new PartialFlow(palette, rightOut.color, rightOut.pressure, rightOutDir, false));
        
        this.enqueue(flow, leftOutDir, leftOut.color, leftOut.pressure);
        this.enqueue(flow, rightOutDir, rightOut.color, rightOut.pressure);
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

    private addLeakAt(palette: Palette, pos: Point, colors: ColorId[]): void {
        this.addLeak(palette, colors, pos.x, pos.y, -1, palette.portWidth);
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
