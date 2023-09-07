import { Builder } from "./builder";
import { Fonts, type AssetBundle, Constants } from "./gen/constants";
import { Menu } from "./menu";


declare global {
    interface Window {
        game: Menu;
        builder: Builder;
    }

    const DEBUG: true;
}


async function main() {

    const start: number = DEBUG ? performance.now() : 0;

    // Font
    const font: FontFaceObserver = new FontFaceObserver(Fonts.ERAS_BOLD_ITC);

    // Settings
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
    PIXI.settings.RESOLUTION = devicePixelRatio;

    // Initialize loading bar
    const bar = new PIXI.Graphics();
    bar.lineStyle(2, Constants.COLOR_WHITE);
    bar.drawRect(50, 225, Constants.STAGE_WIDTH - 100, 25);

    const progress = new PIXI.Graphics();
    progress.position.set(50 + 2, 225 + 2);
    progress.beginFill(Constants.COLOR_GREEN);
    progress.drawRect(0, 0, Constants.STAGE_WIDTH - 100 - 2, 25 - 4);
    progress.width = 0;

    const updateProgress = (pct: number) => progress.width = (Constants.STAGE_WIDTH - 100 - 2) * pct;

    const app = new PIXI.Application({
        background: Constants.COLOR_BLACK,
        width: Constants.STAGE_WIDTH,
        height: Constants.STAGE_HEIGHT,
        view: document.getElementById('main-canvas') as HTMLCanvasElement,
    });

    const manifest: AssetManifest = {
        puzzles: 'lib/puzzles.json',

        pipe_72: 'art/pipe_72@1x.png.json',
        pipe_90: 'art/pipe_90@1x.png.json',
        pipe_120: 'art/pipe_120@1x.png.json',

        core: 'art/core@1x.png.json',
    };

    app.stage.addChild(progress);
    app.stage.addChild(bar);

    PIXI.Assets.addBundle('core', manifest);

    const loader = PIXI.Assets.loadBundle('core', updateProgress) as Promise<AssetBundle>;
    const fontLoader = font.load();

    const [core, _] = await Promise.all([loader, fontLoader]);

    app.stage.removeChild(bar, progress);
    bar.destroy();
    progress.destroy();

    window.game = new Menu(app, core);

    const puzzlesSpan = document.getElementById('main-number-of-puzzles') as HTMLSpanElement;
    puzzlesSpan.innerText = String(core.puzzles.puzzles.length);

    if (DEBUG) {
        console.log(`Finished loading in ${performance.now() - start} ms`);
        window.builder = new Builder();
    }
}

window.onload = () => main();
