import type { Texture } from "pixi.js";

import { Constants, NetworkData } from "./game/constants.js";
import { Menu } from "./menu.js";


declare global {
    interface Window {
        game: Menu;
    }
}


async function main() {

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
        background: '#000',
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

        ui_background: 'art/ui_background.png',
        ui_btn_play: 'art/ui_btn_play.png',
        ui_btn_stop: 'art/ui_btn_stop.png',

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

    const loader = PIXI.Assets.loadBundle('core', updateProgress) as Promise<AssetBundle<NetworkData, Texture>>;
    const fontLoader = font.load();

    const [core, _] = await Promise.all([loader, fontLoader]);

    app.stage.removeChild(bar, progress);
    bar.destroy();
    progress.destroy();

    window.game = new Menu(app, core);
}

window.onload = () => main();