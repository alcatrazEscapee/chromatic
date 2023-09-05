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

        pipe_72: 'art/sheets/pipe_72@1x.png.json',
        pipe_90: 'art/sheets/pipe_90@1x.png.json',
        pipe_120: 'art/sheets/pipe_120@1x.png.json',

        menu_background: 'art/menu_background.png',
        menu_panel: 'art/menu_panel.png',
        menu_star: 'art/menu_star.png',
        menu_btn_left: 'art/menu_btn_left.png',
        menu_btn_x: 'art/menu_btn_x.png',
        menu_btn_main: 'art/menu_btn_main.png',

        ui_background: 'art/ui_background.png',
        ui_btn_play: 'art/ui_btn_play.png',
        ui_btn_stop: 'art/ui_btn_stop.png',
        ui_tab_bot: 'art/ui_tab_bot.png',
        ui_tab_top: 'art/ui_tab_top.png',

        ui_btn_pipe_empty: 'art/ui_btn_pipe_empty.png',
        ui_btn_pipe_straight: 'art/ui_btn_pipe_straight.png',
        ui_btn_pipe_curve: 'art/ui_btn_pipe_curve.png',
        ui_btn_pipe_cross: 'art/ui_btn_pipe_cross.png',
        ui_btn_pipe_mix: 'art/ui_btn_pipe_mix.png',
        ui_btn_pipe_unmix: 'art/ui_btn_pipe_unmix.png',
        ui_btn_pipe_up: 'art/ui_btn_pipe_up.png',
        ui_btn_pipe_down: 'art/ui_btn_pipe_down.png',

        grid_3x3: 'art/grid_3x3.png',
        grid_4x4: 'art/grid_4x4.png',
        grid_5x5: 'art/grid_5x5.png',
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

    if (DEBUG) {
        console.log(`Finished loading in ${performance.now() - start} ms`);
        window.builder = new Builder();
    }
}

window.onload = () => main();
