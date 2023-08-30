import type { Container, Graphics } from "pixi.js";

import { Constants } from "./game/constants.js";
import { Util } from "./game/util.js";


export module Animations {

    export function fadeToBlack(root: Container, onHalf: () => void, onComplete: () => void) {
        new FadeToBlack(root, onHalf, onComplete);
    }

    export function easeInOut(root: Container, start: Point, end: Point, onComplete: () => void): void {
        new EaseInOut(root, start, end, onComplete);
    }
}


class FadeToBlack {

    private readonly onHalf: () => void;
    private readonly onComplete: () => void;
    private readonly overlay: Graphics;
    
    private delta: number;
    private half: boolean;
    
    constructor(root: Container, onHalf: () => void, onComplete: () => void) {
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


class EaseInOut {

    private readonly root: Container;
    private readonly start: Point;
    private readonly end: Point;
    private readonly onComplete: () => void;

    delta: number;

    constructor(root: Container, start: Point, end: Point, onComplete: () => void) {
        this.root = root;
        this.start = start;
        this.end = end;
        this.onComplete = onComplete;
        this.delta = 0;

        PIXI.Ticker.shared.add(this.tick, this);
    }

    tick(delta: number): void {
        this.delta += delta / Constants.ANIM_EASE_IN_OUT_TICKS;
        
        if (this.delta < 1) {
            const ease = easeInOutCubic(this.delta);
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

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
