import type { Container, Texture } from "pixi.js";

import { AxisId, ColorId, DirectionId, TileId, type TexturePalette, Constants } from "../gen/constants";
import { Flow } from "./flow";
import { Util } from "./util";


export type TileProperties = { color: ColorId | null, pressure: PressureId };

export class Tile {

    readonly tileId: Exclude<TileId, TileId.EMPTY>;
    readonly root: Container;

    private readonly pipe: Container;
    private readonly overlay: Container;
    private readonly pipeUpper: Container;
    private readonly overlayUpper: Container;
    private readonly pipeFixed: Container; // Parts of the pipe that don't rotate, and are above all
    private readonly flowContainer: Container; // All flows, which don't rotate
    
    readonly flows: Array4<Flow | null> = [null, null, null, null];
    private readonly properties: Array4<TileProperties | null> = [null, null, null, null];

    dir: DirectionId = DirectionId.LEFT;
    
    constructor(palette: Palette, tileId: Exclude<TileId, TileId.EMPTY>, x: number, y: number) {
        this.tileId = tileId;
        this.root = new PIXI.Container();

        this.pipe = new PIXI.Container();
        this.overlay = new PIXI.Container();
        this.pipeUpper = new PIXI.Container();
        this.overlayUpper = new PIXI.Container();
        this.pipeFixed = new PIXI.Container();
        this.flowContainer = new PIXI.Container();

        this.root.addChild(this.pipe);
        this.root.addChild(this.overlay);
        this.root.addChild(this.pipeUpper);
        this.root.addChild(this.overlayUpper);
        this.root.addChild(this.pipeFixed);
        this.root.addChild(this.flowContainer);

        this.root.position.set(
            Constants.GRID_LEFT + x * palette.tileWidth + palette.tileWidth / 2,
            Constants.GRID_TOP + y * palette.tileWidth + palette.tileWidth / 2);
    }

    public rotate(): void {
        this.dir = Util.cw(this.dir);

        this.root.angle += 90; // Rotate all elements, but then revert changes to the fixed rotation containers
        this.pipeFixed.angle -= 90;
        this.flowContainer.angle -= 90;

        // Toggle which overlays are visible
        for (const overlay of this.overlay.children) {
            overlay.visible = !overlay.visible;
        }
        for (const overlay of this.overlayUpper.children) {
            overlay.visible = !overlay.visible;
        }
    }

    /**
     * Properties are indexed by the direction accounting for rotation. So:
     * - Straight + Curve are indexed by `DirectionId.INTERNAL`
     * - Cross is indexed by `AxisId`, but the axis will be flipped depending on `this.dir`
     * - Actions are indexed by `DirectionId`, with the unused direction always being `ccw(this.dir)`
     */
    public addFlow(key: DirectionId | AxisId, flow: Flow): void {
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

    public hasFlow(key: DirectionId | AxisId): boolean {
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

    public canAccept(key: DirectionId | AxisId, inc: { color: ColorId, pressure: PressureId }): boolean {
        const property = this.property(key);
        return (property.color === null || property.color === inc.color) && property.pressure === inc.pressure;
    }

    /**
     * Properties are indexed by the direction in the original rotation. So:
     * - Straight + Curve are indexed by `DirectionId.INTERNAL`
     * - Cross is indexed by `AxisId`
     * - Actions are indexed by `DirectionId`, without `DirectionId.DOWN`
     */
    public property(key: DirectionId | AxisId): TileProperties {
        let property = this.properties[key];
        if (property === null) {
            property = { color: null, pressure: 1 };
            this.properties[key] = property;
        }
        return property;
    }

    public update(palette: TexturePalette): void {
        const textures: PaletteTextures<Texture> = palette.textures;

        // Clear any existing children
        for (let i = 0; i < this.root.children.length; i++) {
            Util.clear(this.root.children[i] as Container);
        }

        // Setup new children, based on the current properties of the tile
        switch (this.tileId) {
            case TileId.STRAIGHT:
                {
                    const property: TileProperties = this.property(DirectionId.INTERNAL);
                    const texture: PalettePipeTextures<Texture> = textures.straight[property.pressure - 1];
                    const straight = new PIXI.Sprite(texture.pipe);
    
                    straight.anchor.set(0.5);
                    
                    this.pipe.addChild(straight);
                    this.addOverlay(property, texture);
                }
                break;
            case TileId.CURVE:
                {
                    const property: TileProperties = this.property(DirectionId.INTERNAL);
                    const texture: PalettePipeTextures<Texture> = textures.curve[property.pressure - 1];
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

                    const textureH: PalettePipeTextures<Texture> = textures.straight[propertyH.pressure - 1];
                    const textureV: PalettePipeTextures<Texture> = textures.straight[propertyV.pressure - 1];

                    const horizontal = new PIXI.Sprite(textureH.pipe);
                    const vertical = new PIXI.Sprite(textureV.pipe);
                    const mask = new PIXI.Graphics();
    
                    const cornerX = Util.insideTop(palette, propertyV.pressure) - palette.pipeWidth;
                    const cornerY = Util.insideTop(palette, propertyH.pressure) - palette.pipeWidth;
    
                    mask.beginFill(Constants.COLOR_BLACK);
                    mask.drawRect(cornerX, cornerY, palette.tileWidth - 2 * cornerX, palette.tileWidth - 2 * cornerY);
                    mask.pivot.set(palette.tileWidth / 2, palette.tileWidth / 2)
    
                    horizontal.anchor.set(0.5);
                    vertical.anchor.set(0.5);
                    vertical.angle += 90;
    
                    this.pipe.addChild(vertical);
                    this.pipeUpper.addChild(mask);
                    this.pipeUpper.addChild(horizontal);

                    this.addOverlay(propertyH, textureH, { upper: true });
                    this.addOverlay(propertyV, textureV, { rotation: 90 });
                }
                break;
            default:
                // Any action tile looks largely the same
                // Note the icon is added to `root`, not `pipe`, as it doesn't rotate
                {
                    const propertyLeft: TileProperties = this.property(DirectionId.LEFT);
                    const propertyTop: TileProperties = this.property(DirectionId.UP);
                    const propertyRight: TileProperties = this.property(DirectionId.RIGHT);

                    const textureLeft: PalettePipeTextures<Texture> = textures.port[propertyLeft.pressure - 1];
                    const textureTop: PalettePipeTextures<Texture> = textures.port[propertyTop.pressure - 1];
                    const textureRight: PalettePipeTextures<Texture> = textures.port[propertyRight.pressure - 1];

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
                    this.addOverlay(propertyTop, textureTop, { rotation: 90 });
                    this.addOverlay(propertyRight, textureRight, { rotation: 180 });
                    this.pipeFixed.addChild(icon); // Add the icon to root (top level) so it does not rotate
                }
                break;
        }
    }

    private addOverlay(property: TileProperties, texture: Pick<PalettePipeTextures<Texture>, 'overlay'>, options: { upper?: boolean, rotation?: 90 | 180 } | null = null): void {
        if (property.color !== null) {

            // Need to flip the H/V texture, then rotate the H texture by 180 after
            if (options?.rotation === 90) {
                texture = { overlay: { h: texture.overlay.v, v: texture.overlay.h } };
            }

            const overlayH = new PIXI.Sprite(texture.overlay.h);
            const overlayV = new PIXI.Sprite(texture.overlay.v);

            overlayH.anchor.set(0.5);
            overlayV.anchor.set(0.5);
            overlayH.tint = Util.COLORS[property.color];
            overlayV.tint = Util.COLORS[property.color];

            overlayH.visible = Util.dirToAxis(this.dir) === AxisId.HORIZONTAL;
            overlayV.visible = Util.dirToAxis(this.dir) === AxisId.VERTICAL;
            overlayV.angle -= 90; // vertical overlays are already rotated by 90, so invert that here.

            if (options?.rotation === 90) {
                overlayV.angle += 180;
            }
            
            if (options?.rotation === 180) {
                overlayH.angle += 180;
                overlayV.angle += 180;
            }

            const root = options?.upper ? this.overlayUpper : this.overlay;

            root.addChild(overlayH);
            root.addChild(overlayV);
        }
    }
}