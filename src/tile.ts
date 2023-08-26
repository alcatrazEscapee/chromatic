import type { Container, Texture } from "pixi.js";

import { Flow } from "./flow.js";
import { COLORS, Util } from "./util.js";
import { AxisId, ColorId, DirectionId, TileId } from "./constants.js";


type Key = 0 | 1 | 2 | 3;


export type TileProperties = { color: ColorId | null, pressure: PressureId };

export class Tile {

    readonly tileId: TileId;
    readonly root: Container;

    private readonly flowContainer: Container; // All flows, which don't rotate, and are below all pipe elements
    private readonly pipe: Container; // Lowest layer of pipe - everything that rotates
    private readonly overlayV: Container; // Overlay for vertical sections
    private readonly pipeUpper: Container; // Upper layer of pipe - for things that render above pipe and overlayH
    private readonly overlayH: Container; // Overlay for horizontal sections
    private readonly pipeFixed: Container; // Parts of the pipe that don't rotate, and are above all
    
    readonly flows: Array4<Flow | null> = [null, null, null, null];
    readonly properties: Array4<TileProperties | null> = [null, null, null, null];

    dir: DirectionId = DirectionId.LEFT;
    
    constructor(tileId: TileId) {
        this.tileId = tileId;
        this.root = new PIXI.Container();

        this.flowContainer = new PIXI.Container();
        this.pipe = new PIXI.Container();
        this.overlayV = new PIXI.Container();
        this.pipeUpper = new PIXI.Container();
        this.overlayH = new PIXI.Container();
        this.pipeFixed = new PIXI.Container();

        this.root.addChild(this.flowContainer);
        this.root.addChild(this.pipe);
        this.root.addChild(this.overlayV);
        this.root.addChild(this.pipeUpper);
        this.root.addChild(this.overlayH);
        this.root.addChild(this.pipeFixed);

        // Start with overlayH as visible
        this.overlayV.angle -= 90;
        this.overlayV.visible = false;
    }

    public rotate(): void {
        this.dir = Util.cw(this.dir);

        this.root.angle += 90; // Rotate all elements, but then revert changes to the fixed rotation containers
        this.pipeFixed.angle -= 90;
        this.flowContainer.angle -= 90;

        this.overlayH.visible = !this.overlayH.visible;
        this.overlayV.visible = !this.overlayV.visible;
    }

    public addFlow(key: Key, flow: Flow): void {
        if (this.flows[key]) throw new Error(`Duplicate flow at index ${key}`);
        
        this.flows[key] = flow;
        this.flowContainer.addChild(flow.root);
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

    public canAccept(key: Key, inc: { color: ColorId, pressure: PressureId }): boolean {
        const property = this.property(key);
        return (property.color === null || property.color === inc.color) && property.pressure === inc.pressure;
    }

    /**
     * Properties are indexed by the direction in the original rotation. So:
     * - Straight + Curve are indexed by `DirectionId.INTERNAL`
     * - Cross is indexed by `AxisId`
     * - Actions are indexed by `DirectionId`, without `DirectionId.DOWN`
     */
    public property(key: Key): TileProperties {
        let property = this.properties[key];
        if (property === null) {
            property = { color: null, pressure: 1 };
            this.properties[key] = property;
        }
        return property!;
    }

    public build(palette: TexturePalette<Texture>, unique: boolean = false): void {
        const textures: PaletteTextures<Texture> = palette.textures;

        // Clear any existing children
        if (!unique) { // Need to remove the existing pipe objects first
            for (let i = 0; i < this.root.children.length; i++) {
                Util.clear(this.root.children[i] as Container);
            }
        }

        // Setup new children, based on the current properties of the tile
        switch (this.tileId) {
            case TileId.EMPTY:
                break; // No-op
            case TileId.STRAIGHT:
                {
                    const property: TileProperties = this.property(DirectionId.INTERNAL);
                    const texture: PalettePipeTextures<Texture> = textures.straight[property.pressure - 1]!;
                    const straight = new PIXI.Sprite(texture.pipe);
    
                    straight.anchor.set(0.5);
                    
                    this.pipe.addChild(straight);
                    this.addOverlay(property, texture);
                }
                break;
            case TileId.CURVE:
                {
                    const property: TileProperties = this.property(DirectionId.INTERNAL);
                    const texture: PalettePipeTextures<Texture> = textures.curve[property.pressure - 1]!;
                    const curve = new PIXI.Sprite(texture.pipe);
                
                    curve.anchor.set(0.5);
                    
                    this.pipe.addChild(curve);
                    this.addOverlay(property, texture);
                }
                break;
            case TileId.CROSS:
                {
                    const propertyH: TileProperties = this.property(AxisId.HORIZONTAL);
                    const propertyV: TileProperties = this.property(AxisId.VERTICAL);

                    const textureH: PalettePipeTextures<Texture> = textures.straight[propertyH.pressure - 1]!;
                    const textureV: PalettePipeTextures<Texture> = textures.straight[propertyV.pressure - 1]!;

                    const horizontal = new PIXI.Sprite(textureH.pipe);
                    const vertical = new PIXI.Sprite(textureV.pipe);
                    const mask = new PIXI.Graphics();
    
                    const widthH = Util.insideTopExt(palette, propertyV.pressure);
                    const widthV = Util.insideTopExt(palette, propertyH.pressure);
    
                    mask.beginFill('#000000');
                    mask.drawRect(widthH, widthV, palette.tileWidth - 2 * widthH, palette.tileWidth - 2 * widthV);
                    mask.pivot.set(palette.tileWidth / 2, palette.tileWidth / 2)
    
                    horizontal.anchor.set(0.5);
                    vertical.anchor.set(0.5);
                    vertical.angle += 90;
    
                    this.pipe.addChild(vertical);
                    this.addOverlay(propertyH, textureH);
                    this.pipeUpper.addChild(mask);
                    this.addOverlay(propertyV, textureV);
                    this.pipeUpper.addChild(horizontal);
                }
                break;
            default:
                // Any action tile looks largely the same
                // Note the icon is added to `root`, not `pipe`, as it doesn't rotate
                {
                    const propertyLeft: TileProperties = this.property(DirectionId.LEFT);
                    const propertyTop: TileProperties = this.property(DirectionId.UP);
                    const propertyRight: TileProperties = this.property(DirectionId.RIGHT);

                    const textureLeft: PalettePipeTextures<Texture> = textures.port[propertyLeft.pressure - 1]!;
                    const textureTop: PalettePipeTextures<Texture> = textures.port[propertyTop.pressure - 1]!;
                    const textureRight: PalettePipeTextures<Texture> = textures.port[propertyRight.pressure - 1]!;

                    const left = new PIXI.Sprite(textureLeft.pipe);
                    const top = new PIXI.Sprite(textureTop.pipe);
                    const right = new PIXI.Sprite(textureRight.pipe);
                    const icon = new PIXI.Sprite(palette.textures.action[this.tileId - TileId.ACTION_START]);
    
                    left.anchor.set(0.5);
                    top.anchor.set(0.5);
                    top.angle += 90;
                    right.anchor.set(0.5);
                    right.angle += 180;
                    icon.anchor.set(0.5);
    
                    this.pipe.addChild(left);
                    this.pipe.addChild(top);
                    this.pipe.addChild(right);
                    this.addOverlay(propertyLeft, textureLeft);
                    this.addOverlay(propertyTop, textureTop);
                    this.addOverlay(propertyRight, textureRight);
                    this.pipeFixed.addChild(icon); // Add the icon to root (top level) so it does not rotate
                }
                break;
        }
    }

    private addOverlay(property: TileProperties, texture: PalettePipeTextures<Texture>): void {
        if (property.color !== null) {
            const overlayH = new PIXI.Sprite(texture.overlay.h);
            const overlayV = new PIXI.Sprite(texture.overlay.v);

            overlayH.anchor.set(0.5);
            overlayV.anchor.set(0.5);
            overlayH.tint = COLORS[property.color];
            overlayV.tint = COLORS[property.color];

            this.overlayH.addChild(overlayH);
            this.overlayV.addChild(overlayV);
        }
    }
}