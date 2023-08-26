
// Mock PIXI
(global as any).PIXI = {
    Container: class {
        constructor() {}
        addChild(): void {}
    }
}