import fs from 'fs';


// Mock PIXI
class Point {
    set(): any {}
}

(global as any).PIXI = {
    Container: class {
        children: any[] = [];
        position: Point = new Point();

        constructor() {}
        
        addChild(): void {}
    },
    Graphics: class {
        position: Point = new Point();

        constructor() {}

        beginFill(): void {}
        drawRect(): void {}
    },
    Ticker: {
        shared: {
            add(): any {}
        }
    },
};

// Load puzzles
(global as any).PUZZLES = JSON.parse(fs.readFileSync('./data-compressed.json', 'utf8')).puzzles;