import { ColorId, Constants, DirectionId, GridId, NetworkPuzzle } from "./gen/constants";
import type { Menu } from "./menu";


type RelaxedIO = [number, number, DirectionId, ColorId, PressureId][];
type DirectionKey = keyof typeof DirectionId;
type ColorKey = keyof typeof ColorId;

export class Builder {

    readonly menu: Menu;
    readonly puzzle: NetworkPuzzle;

    constructor() {
        console.log('[Debug Mode] Builder loaded');

        this.menu = window.game;
        this.puzzle = {
            id: -1,
            size: GridId._3x3,
            inputs: [],
            outputs: [],
            filters: [],
        }
    }

    /**
     * Open the puzzle builder UI
     * This is special, only possible in debug mode (due to requiring `DEBUG`), in order to help make puzzles
     * In this mode, puzzle input/output/filter properties can be hot reloaded and modified.
     */
    public open(size: GridId = GridId._3x3): void {
        // No animation, just jump straight to it
        console.log('[Debug Mode] opening puzzle builder');

        this.menu.active = false;
        this.menu.leaveMenu();
        this.menu.stage.addChildAt(this.menu.gameContainer, 0);
        this.menu.game.init({
            id: -1,
            size,
            inputs: [],
            outputs: [],
            filters: [],
        });
        this.menu.game.postInit();
    }

    public size(size: GridId): void {
        this.puzzle.size = size - Constants.GRID_ID_TO_WIDTH;
        this.reload();
    }

    public input(x: number, y: number, dir: string, color: string, pressure: PressureId) {
        (this.puzzle.inputs as RelaxedIO).push([x, y, DirectionId[dir.toUpperCase() as DirectionKey], ColorId[color.toUpperCase() as ColorKey], pressure]);
        this.reload();
    }

    public output(x: number, y: number, dir: string, color: string, pressure: PressureId) {
        (this.puzzle.outputs as RelaxedIO).push([x, y, DirectionId[dir.toUpperCase() as DirectionKey], ColorId[color.toUpperCase() as ColorKey], pressure]);
        this.reload();
    }

    private reload(): void {
        this.menu.game.teardown();
        this.menu.game.init(this.puzzle);
        this.menu.game.postInit();
    }
}