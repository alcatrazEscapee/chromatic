import type { Container, Graphics } from "pixi.js";

import { COLORS } from './util.js';


export interface Flow {

    /**
     * The root of the flow. This should be placed at the center point of a tile, and is the anchor for rotations.
     * Graphics objects attached to this root should be rectangles with (0, 0, w, h), and positioned at (x, y).
     * That way, when changing width/height, the object does not move relative to the root.
     */
    readonly root: Container;

    destroy(): void;

    tick(delta: number): void;
}


abstract class BaseFlow implements Flow {

    public readonly root: Container;
    
    private delta: number;

    constructor() {
        this.root = new PIXI.Container();
        this.delta = 0;
    }

    destroy(): void {
        PIXI.Ticker.shared.remove(this.tick, this);
        this.root.destroy();
    }

    tick(delta: number): void {
        this.delta += delta / Constants.SIMULATOR_TICKS_PER_STEP;
        if (this.delta > 1) {
            PIXI.Ticker.shared.remove(this.tick, this); // Stop ticking
            this.delta = 1;
        }
        this.internalTick(this.delta);
    }

    protected abstract internalTick(delta: number): void;
}


export class EdgeFlow extends BaseFlow {

    private readonly obj: Graphics;
    private readonly factor: number;

    constructor(palette: Palette, color: ColorId) {
        super();
    
        // Flow moving left -> right, horizontal
        this.obj = new PIXI.Graphics();
        this.obj.beginFill(COLORS[color]);
        this.obj.drawRect(0, 0, 20, palette.insideWidth);
        this.obj.position.set(-10, -palette.insideWidth / 2);
        this.obj.width = 0;
        
        this.factor = palette.tileWidth / 20;

        this.root.addChild(this.obj);
        this.root.angle += 180;
    }

    override internalTick(delta: number): void {
        this.obj.width = Math.min(1, delta * this.factor) * 20;
    }
}

export class StraightFlow extends BaseFlow {
    
    private readonly obj: Graphics;
    private readonly width: number;

    constructor(palette: Palette, color: ColorId, dir: DirectionId) {
        super();

        // Flow moving left -> right, horizontal
        this.obj = new PIXI.Graphics();
        this.obj.beginFill(COLORS[color]);
        this.obj.drawRect(0, 0, palette.tileWidth, palette.insideWidth);
        this.obj.position.set(-palette.tileWidth / 2, palette.insideTop - palette.tileWidth / 2);
        this.obj.width = 0;
        
        this.width = palette.tileWidth;

        this.root.addChild(this.obj);
        this.root.angle += 90 * dir + 180;
    }

    override internalTick(delta: number): void {
        this.obj.width = delta * this.width;
    }
}

class PartialFlow extends BaseFlow {

    private readonly obj: Graphics;

    /**
     * The total, full pixel width of this flow.
     */
    private readonly width: number;

    /**
     * The ratio of the width of this flow, to the width of the pipe.
     * This is used to calculate the portion of the duration that this flow will animate.
     */
    private readonly factor: number;

    /** 
     * If true, this flow is an input, and will animate from [0, 1 / delta].
     * Otherwise, it is an output, and will animate from [1 - 1 / delta, 1]
     */
    private readonly input: boolean;

    constructor(palette: Palette, color: ColorId, dir: DirectionId, input: boolean, width: number) {
        super();

        // Flow moving left -> right, horizontal, in the first section (if input), otherwise in the last section
        this.obj = new PIXI.Graphics();
        this.obj.beginFill(COLORS[color]);
        this.obj.drawRect(0, 0, width, palette.insideWidth);
        this.obj.position.set(
            input ? -palette.tileWidth / 2 : palette.tileWidth / 2 - width,
            palette.insideTop - palette.tileWidth / 2);
        this.obj.width = 0;
        
        this.width = width;
        this.factor = palette.tileWidth / width;
        this.input = input;

        this.root.addChild(this.obj);
        this.root.angle += 90 * dir + 180;
    }

    override internalTick(delta: number): void {
        // Based on `input` and `factor`, calculate the actual delta
        const realDelta = this.input ?
            Math.min(1, delta * this.factor) :
            Math.max(0, (delta - 1) * this.factor + 1);

        this.obj.width = realDelta * this.width;
    }
}


class PairFlow extends BaseFlow {
    readonly left: PartialFlow;
    readonly right: PartialFlow;

    constructor(palette: Palette, color: ColorId, dir: DirectionId, leftWidth: number, rightWidth: number) {
        super();

        this.left = new PartialFlow(palette, color, dir, true, leftWidth);
        this.right = new PartialFlow(palette, color, dir, false, rightWidth);

        this.root.addChild(this.left.root);
        this.root.addChild(this.right.root);
    }

    override internalTick(delta: number): void {
        this.left.internalTick(delta);
        this.right.internalTick(delta);
    }
}


export class CrossUnderFlow extends PairFlow {
    constructor(palette: Palette, color: ColorId, dir: DirectionId) {
        super(palette, color, dir, palette.insideLength, palette.insideLength);
    }
}

export class CurveFlow extends PairFlow {
    constructor(palette: Palette, color: ColorId, dir: DirectionId, cw: boolean) {
        super(palette, color, dir, palette.insideTop + palette.insideWidth, palette.insideTop);
        this.right.root.angle += cw ? 90 : -90;
    }
}