import type { Application, Container, DisplayObject, Graphics } from "pixi.js";
import type { Menu } from "./menu";

import { ColorId, Constants, DirectionId } from "./gen/constants";
import { StraightFlow } from "./game/flow";
import { Util } from "./game/util";


type Event = () => void;


export module Animations {

    export function fadeIn(root: Container, onComplete: Event, delay: number = 0) {
        new FadeIn(root, onComplete, false, delay);
    }

    export function fadeOut(root: Container, onComplete: Event) {
        new FadeIn(root, onComplete, true);
    }

    export function fadeToBlack(root: Container, onHalf: Event, onComplete: Event) {
        new FadeToBlack(root, onHalf, onComplete);
    }

    export function easeInOut(root: DisplayObject, start: Point, end: Point, onComplete: Event): void {
        new Easing(root, start, end, applyEaseInOutCubic, onComplete);
    }

    export function easeOutBounce(root: DisplayObject, start: Point, end: Point, onComplete: Event): void {
        new Easing(root, start, end, applyEaseOutBounce, onComplete);
    }

    export function filterDemo(app: Application, menu: Menu): void {
        new FilterDemo(app, menu);
    }
}


class FadeIn {
    private readonly onComplete: Event;
    private readonly root: Container;
    private readonly invert: boolean;

    private delta: number;

    constructor(root: Container, onComplete: Event, invert: boolean, delay: number = 0) {
        this.onComplete = onComplete;
        this.root = root;
        this.invert = invert;

        this.root.alpha = this.invert ? 1.0 : 0.0;
        this.delta = -delay;

        PIXI.Ticker.shared.add(this.tick, this);
    }

    tick(delta: number): void {
        this.delta += delta;
        if (this.delta < 0) {
            // Initial delay - no-op
        } else if (this.delta < Constants.ANIM_FADE_IN_TICKS) {
            const alpha = this.delta / Constants.ANIM_FADE_IN_TICKS;
            this.root.alpha = this.invert ? 1.0 - alpha : alpha;
        } else {
            this.root.alpha = this.invert ? 0.0 : 1.0;
            this.onComplete();

            PIXI.Ticker.shared.remove(this.tick, this);
        }
    }
}


class FadeToBlack {

    private readonly onHalf: Event;
    private readonly onComplete: Event;
    private readonly overlay: Graphics;
    
    private delta: number;
    private half: boolean;
    
    constructor(root: Container, onHalf: Event, onComplete: Event) {
        this.onHalf = onHalf;
        this.onComplete = onComplete;
        this.delta = 0;
        this.half = false;

        // Initialize overlay

        this.overlay = new PIXI.Graphics();
        
        this.overlay.beginFill(Constants.COLOR_BLACK);
        this.overlay.drawRect(0, 0, Constants.STAGE_WIDTH, Constants.STAGE_HEIGHT);
        this.overlay.alpha = 0;

        root.addChild(this.overlay);

        PIXI.Ticker.shared.add(this.tick, this);
    }

    tick(delta: number): void {
        this.delta += delta;
        if (this.delta < Constants.ANIM_FADE_TO_BLACK_HALF) {
            this.overlay.alpha = Util.clampMap(this.delta, 0, Constants.ANIM_FADE_TO_BLACK_HALF, 0, 1);
        } else if (!this.half) {
            this.half = true;
            this.delta -= delta;
            this.onHalf();
        } else if (this.delta < Constants.ANIM_FADE_TO_BLACK_TICKS) {
            this.overlay.alpha = Util.clampMap(this.delta, Constants.ANIM_FADE_TO_BLACK_HALF, Constants.ANIM_FADE_TO_BLACK_TICKS, 1, 0);
        } else {
            this.overlay.destroy();
            this.onComplete();

            PIXI.Ticker.shared.remove(this.tick, this);
        }
    }
}


class Easing {

    private readonly root: DisplayObject;
    private readonly start: Point;
    private readonly end: Point;
    private readonly easing: (x: number) => number;
    private readonly onComplete: Event;

    delta: number;

    constructor(root: DisplayObject, start: Point, end: Point, easing: (x: number) => number, onComplete: Event) {
        this.root = root;
        this.start = start;
        this.end = end;
        this.easing = easing;
        this.onComplete = onComplete;
        this.delta = 0;

        PIXI.Ticker.shared.add(this.tick, this);
    }

    tick(delta: number): void {
        this.delta += delta / Constants.ANIM_EASE_IN_OUT_TICKS;
        
        if (this.delta < 1) {
            const ease = this.easing(this.delta);
            this.root.position.set(
                Util.clampLerp(ease, this.start.x, this.end.x),
                Util.clampLerp(ease, this.start.y, this.end.y));
        } else {
            this.root.position.set(this.end.x, this.end.y);
            this.onComplete();

            PIXI.Ticker.shared.remove(this.tick, this);
        }
    }
}


class FilterDemo {

    readonly flows: StraightFlow[];
    delta: number;

    constructor(app: Application, menu: Menu) {
        this.delta = 0;
        this.flows = [];

        const palette: Palette = menu.game.palettes[0];

        for (let x = 0; x < 3; x++) {
            const pipe = new PIXI.Sprite(menu.core.pipe_120.textures.pipe_120_straight_2);

            pipe.position.set(x * 120 + 60, 60);
            pipe.anchor.set(0.5);
            app.stage.addChild(pipe);
        }

        for (const [color, x] of [[ColorId.YELLOW, 0], [ColorId.BLUE, 1], [ColorId.RED, 2]]) {
            const flow = new StraightFlow(palette, color, 2, DirectionId.RIGHT);

            flow.root.position.set(120 * x + 60, 60);
            app.stage.addChild(flow.root);
            
            this.flows[x] = flow;
        }

        for (const [color, x] of [[ColorId.BLUE, 1], [ColorId.RED, 2]]) {
            const filter = new PIXI.Sprite(menu.core.pipe_120.textures.pipe_120_filter);

            filter.position.set(x * 120, 60);
            filter.angle += 90;
            filter.anchor.set(0.5, 0.5);
            filter.tint = Util.COLORS[color];
            app.stage.addChild(filter);
        }

        PIXI.Ticker.shared.add(this.tick, this);
    }

    tick(delta: number): void {
        this.delta += delta;

        if (this.delta > Constants.TICKS_PER_FILTER_DEMO_CYCLE) {
            this.delta -= Constants.TICKS_PER_FILTER_DEMO_CYCLE;
        }

        for (let i = 0; i < 3; i++) {
            this.flows[i]!.internalTick(Util.clampMap(this.delta,
                Constants.TICKS_PER_FILTER_DEMO_PRE_WAIT + i * Constants.TICKS_PER_SIMULATOR_STEP,
                Constants.TICKS_PER_FILTER_DEMO_PRE_WAIT + (i + 1) * Constants.TICKS_PER_SIMULATOR_STEP,
                0, 1));
        }
    }
}


/** From [easeInOutCubic](https://easings.net/#easeInOutCubic) */
function applyEaseInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** From [easeOutBounce](https://easings.net/#easeOutBounce) */
function applyEaseOutBounce(x: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (x < 1 / d1) {
        return n1 * x * x;
    } else if (x < 2 / d1) {
        return n1 * (x -= 1.5 / d1) * x + 0.75;
    } else if (x < 2.5 / d1) {
        return n1 * (x -= 2.25 / d1) * x + 0.9375;
    } else {
        return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
}
