import type { Container, Graphics } from "pixi.js";

import { COLORS, Util } from "./util.js";


interface Blob {
    obj: Graphics,
    dx: number,
    dy: number,
}

export class Leak {

    readonly root: Container;

    private readonly colors: ColorId[];
    private readonly bias: Point;
    private readonly blobs: Blob[];
    private readonly scale: number;

    private delta: number;
    private oldest: number;

    constructor(colors: ColorId[], bias: Point, tileWidth: number, delay: number = 0) {
        this.root = new PIXI.Container();
        this.colors = colors;
        this.bias = bias;
        this.scale = tileWidth / 120;
        this.blobs = [];
        this.delta = -delay;
        this.oldest = 0;
    }

    destroy(): void {
        this.root.destroy({ children: true });
        PIXI.Ticker.shared.remove(this.tick, this);
    }

    tick(delta: number): void {
        this.delta += delta;

        if (this.delta > Constants.TICKS_PER_LEAK_BLOB) {
            this.delta -= Constants.TICKS_PER_LEAK_BLOB;

            // Spawn a new blob
            const obj = new PIXI.Graphics();
            const color = COLORS[Util.choose(this.colors)];

            obj.beginFill(color);
            obj.drawCircle(
                (Math.random() * 8 - 4) * this.scale,
                (Math.random() * 8 - 4) * this.scale,
                (8 + Math.random() * 6) * this.scale);

            const blob: Blob = {
                obj,
                dx: (Math.random() * 2 - 1 + this.bias.x) * this.scale,
                dy: (Math.random() * 2 - 1 + this.bias.y) * this.scale,
            };

            if (this.bias.x == 0) {
                blob.dx *= 1.5;
            }
            if (this.bias.y == 0) {
                blob.dy *= 1.5;
            }

            if (this.blobs.length < Constants.MAX_BLOBS_PER_LEAK) {
                this.blobs.push(blob);
            } else {
                // Replace the oldest blob instead
                const oldBlob = this.blobs[this.oldest]!;

                oldBlob.obj.destroy();

                this.blobs[this.oldest] = blob;
                this.oldest = (this.oldest + 1) % Constants.MAX_BLOBS_PER_LEAK;
            }

            this.root.addChild(obj);
        }

        for (const blob of this.blobs) {
            blob.obj.x += blob.dx * 0.2 * delta;
            blob.obj.y += blob.dy * 0.2 * delta;
            blob.obj.alpha -= 0.006 * delta * (2 - blob.obj.alpha);

            const scale = blob.obj.scale.x * 0.995;
            blob.obj.scale.set(scale);
        }
    }
}