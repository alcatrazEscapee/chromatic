import type { Container, Sprite, Texture } from "pixi.js";

import { Flow } from "./flow.js";
import { Util } from "./util.js";


type Key = 0 | 1 | 2 | 3;
type Value = Flow | null;
type Flows = [Value, Value, Value, Value];


export class Tile {

    readonly tileId: TileId;
    readonly root: Container;
    readonly pipe: Sprite;
    readonly flows: Flows = [null, null, null, null];

    dir: DirectionId;
    
    // Prevents us from immediately rotating a tile the first time it's dropped
    private skipFirstRotate: boolean = true;

    constructor(palette: TexturePalette<Texture>, tileId: TileId) {

        this.tileId = tileId;
        this.root = new PIXI.Container();

        this.pipe = new PIXI.Sprite(palette.textures[tileId >= TileId.MIX ? TileId.ACTION : tileId]);
        this.pipe.anchor.set(0.5);

        this.dir = DirectionId.LEFT;

        this.root.addChild(this.pipe);

        if (tileId >= TileId.MIX) {
            const icon = new PIXI.Sprite(palette.textures[tileId]);
            icon.anchor.set(0.5);
            this.root.addChild(icon);
        }
    }

    public rotate(): void {
        if (this.skipFirstRotate) {
            this.skipFirstRotate = false;
            return;
        }
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