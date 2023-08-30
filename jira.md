# Jira

### Main Menu

- Render 'X' on completed puzzles
- Implement swipe events, to detect puzzle switching
- Add left/right buttons to change page on main menu, for desktops

### Save

- Save completed puzzles to local storage
- Add console utils for clearing / setting local storage
- Save other puzzle completion information (time taken, pipes, moves)?

### Game

- Add Filters
    - Data rewrite needs to include filters in output
    - Graphics for filters in puzzle
    - Filter support in simulator
    - Break label placement (color only) in navigator
- Add tap on pipe input/output to pop up modal tooltips
- When victory happens, raise a modal with 'Victory', 'Next' button, 'Close' button and 'Menu' button

### Graphics

- Improve background for main screen, along with text rendering
- Improve background for tab top/bot buttons in game UI
- Figure out / use an improved font

### Website

- Add some information, lower down on how to play
- Add some images or other information
- Make the background... passable? Somehow
- Add a favicon.ico for alcatrazescapee somewhere

### Bugs

- 4x4 Puzzles have missing pixels (1) between the two parts of a crossover pipe
    - Also on 5x5 puzzles, and worse, too?
- 5x5 Puzzles have the wrong size of input / output pipes, according to their pressure.
    - This only occurs on action tiles, so likely a texture issue with the `_port` texture