import type { Container, Sprite, Texture } from "pixi.js";

import { Flow } from "./flow.js";
import { Util } from "./util.js";


type Key = 0 | 1 | 2 | 3;
type Value = Flow | null;
type Flows = [Value, Value, Value, Value];


export class Tile {

    readonly tileId: TileId;
    readonly root: Container;
    readonly pipe: Container;
    readonly flows: Flows = [null, null, null, null];

    dir: DirectionId;
    
    constructor(palette: TexturePalette<Texture>, tileId: TileId) {

        this.tileId = tileId;
        this.root = new PIXI.Container();
        this.pipe = new PIXI.Container();

        this.root.addChild(this.pipe);

        buildTile(this.root, this.pipe, palette, tileId);

        this.dir = DirectionId.LEFT;
    }

    public rotate(): void {
        this.dir = Util.cw(this.dir);
        this.pipe.angle += 90; // Only rotate the pipe - not the icon
        for (const flow of this.flows) {
            if (flow) {
                flow.root.angle += 90; // If a flow is present, rotate that as well
            }
        }
    }

    public addFlow(key: Key, flow: Flow): void {
        if (this.flows[key]) throw new Error(`Duplicate flow at index ${key}`);
        
        this.flows[key] = flow;
        this.root.addChild(flow.root);
        PIXI.Ticker.shared.add(flow.tick, flow);
    }

    public clearFlow(): void {
        for (const flow of this.flows) {
            flow?.destroy();
        }
        (this as Mutable<Tile>).flows = [null, null, null, null];
    }

    public hasFlow(key: Key): boolean {
        return this.flows[key] !== null;
    }

    public totalFlows(): number {
        let n = 0;
        for (const flow of this.flows) {
            if (flow) {
                n += 1;
            }
        }
        return n;
    }

    public destroy(): void {
        this.clearFlow();
        this.root.destroy({ children: true });
    }
}


function buildTile(root: Container, pipe: Container, palette: TexturePalette<Texture>, tileId: TileId): void {
    switch (tileId) {
        case TileId.EMPTY:
            throw new Error(`Should not build an empty tile`);
        case TileId.STRAIGHT:
            {
                const straight = new PIXI.Sprite(palette.textures.straight[0].pipe);
                straight.anchor.set(0.5);
                pipe.addChild(straight);
            }
            break;
        case TileId.CURVE:
            {
                const curve = new PIXI.Sprite(palette.textures.curve[0].pipe);
                curve.anchor.set(0.5);
                pipe.addChild(curve);
            }
            break;
        case TileId.CROSS:
            {
                const horizontal = new PIXI.Sprite(palette.textures.straight[0].pipe);
                const vertical = new PIXI.Sprite(palette.textures.straight[0].pipe);
                const mask = new PIXI.Graphics();

                const widthH = Util.insideTopExt(palette, 1);
                const widthV = Util.insideTopExt(palette, 1);

                mask.beginFill('#000000');
                mask.drawRect(widthH, widthV, palette.tileWidth - 2 * widthH, palette.tileWidth - 2 * widthV);
                mask.pivot.set(palette.tileWidth / 2, palette.tileWidth / 2)

                horizontal.anchor.set(0.5);
                vertical.anchor.set(0.5);
                vertical.angle += 90;

                pipe.addChild(vertical);
                pipe.addChild(mask);
                pipe.addChild(horizontal);
            }
            break;
        default:
            // Any action tile looks largely the same
            // Note the icon is added to `root`, not `pipe`, as it doesn't rotate
            {
                const left = new PIXI.Sprite(palette.textures.port[0].pipe);
                const top = new PIXI.Sprite(palette.textures.port[0].pipe);
                const right = new PIXI.Sprite(palette.textures.port[0].pipe);
                const icon = new PIXI.Sprite(palette.textures.action[tileId - TileId.ACTION_START]);

                left.anchor.set(0.5);
                top.anchor.set(0.5);
                top.angle += 90;
                right.anchor.set(0.5);
                right.angle += 180;
                icon.anchor.set(0.5);

                pipe.addChild(left);
                pipe.addChild(top);
                pipe.addChild(right);
                root.addChild(icon);
            }
            break;
    }
}