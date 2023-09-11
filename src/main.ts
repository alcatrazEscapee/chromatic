import { Animations } from './animation';
import { Builder } from './builder';
import { Constants, Fonts, type AssetBundle } from './constants';
import { Util } from './game/util';
import { Menu } from './menu';


declare global {
    interface Window {
        game: Menu;
        version: string;
        builder: Builder;
    }

    const DEBUG: true;
    const VERSION: string;
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
    bar.drawRect(50, 225, 300, 25);

    const progress = new PIXI.Graphics();
    progress.position.set(50 + 2, 225 + 2);
    progress.beginFill(Constants.COLOR_GREEN);
    progress.drawRect(0, 0, 298, 21);
    progress.width = 0;

    const updateProgress = (pct: number) => progress.width = 298 * pct;

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

    const menu = window.game = new Menu(app, core);

    const puzzlesSpan = document.getElementById('main-number-of-puzzles') as HTMLSpanElement;
    puzzlesSpan.innerText = String(core.puzzles.puzzles.length);

    // Audio
    document.addEventListener('click', () => menu.music.setup(), { once: true });
    document.addEventListener('touchstart', () => menu.music.setup(), { once: true });

    if (DEBUG) {
        Util.debug(`Finished loading in ${performance.now() - start} ms`);
        window.builder = new Builder();
    }

    // Additionally setup the small filter animation
    const filterApp = new PIXI.Application({
        background: Constants.COLOR_DARK_GRAY,
        width: 120 * 3,
        height: 120,
        view: document.getElementById('filter-canvas') as HTMLCanvasElement,
    });

    Animations.filterDemo(filterApp, menu);

    // Update the version both in the bottom of the display, and to the global constant
    // `VERSION` is replaced by esbuild with the version from `package.json`
    (document.getElementById('chromatic-version') as HTMLSpanElement).innerText = window.version = VERSION;
    (document.getElementById('chromatic-version-link') as HTMLLinkElement).href = `https://github.com/alcatrazEscapee/chromatic/tree/v${VERSION}`;
}

window.onload = () => main();
