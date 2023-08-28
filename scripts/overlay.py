"""
An investigation of tiling conditions for the overlay sprite texture

Conditions for the texture to be tile-able:
- bottom edge must seamlessly continue to the next
    => this implies an infinite line that tiles
    => this implies everything above + below tiles

therefor just need to make sure the bottom line is mod N?
    where N := width of tile

so, where:
    N := width of tile
    Wc := horizontal width of colored line
    Wb := horizontal width of blank section

there must exist some integer k s.t.

N = k * (Wc + Wb)

QED

Rotation condition:

First, given Wc, Wb, derive a formula for the tiling:

F(x) = floor( mod( (x + a), (Wc + Wb) ) / Wc )

    for some arbitrary integer a,
    this returns 0 or 1 if the tile is colored

Then, if the top must be able to rotate to the bottom
    => top (moving left) == bottom (moving right)

So find the corresponding formula for the top

bottom (moving right) = F(x)
bottom + 1 (moving right) = F(x - 1)
...
top (moving right) = F(x - (N - 1))

Note:
    to invert to moving left, F(x) -> F'((N - 1) - x)

...
top (moving left) = F(-x)

Then we must have that

F(x) = F(-x)
    
    for all 0 <= x < N

QED

Note we also want these to be similar, so we compute two ratios:
    R  := (Wc + Wb) / N ~ the number of lines per tile
    R2 := Wc / Wb ~ the difference between on and off lines

-----------------------------------

Usage Instructions:

    --scan returns a list, with _ordinals_ (i.e. [13]) of each size
    pass in --overlay<N>=<ordinal>, i.e. --overlay72=13 to generate the images for that ordinal

"""

import sys

from PIL import Image


class Palette:
    tile_width: int
    inside_width: int
    port_width: int
    inside_top: int

    def __init__(self, pressure: int, tile_width: int, pressure_width: int, pipe_width: int, base_inside_width: int, base_inside_top: int, port_width: int):
        self.tile_width = tile_width
        self.inside_width = base_inside_width + 2 * (pressure - 1) * pressure_width
        self.inside_top = base_inside_top - (pressure - 1) * pressure_width
        self.port_width = port_width


PALETTES = {
    120: lambda pr: Palette(pr, 120, 5, 4, 18, 51, 27),
    90: lambda pr: Palette(pr, 90, 4, 4, 12, 39, 20),
    72: lambda pr: Palette(pr, 72, 3, 5, 10, 31, 16),
}
SIZES = sorted(PALETTES.keys())


def main():
    if '--scan' in sys.argv:
        for N in SIZES:
            scan_possible_values(N)
    
    print_scan: bool = '--scan' in sys.argv
    selected = dict(
        tuple(map(int, arg[len('--overlay'):].split('=')))
        for arg in sys.argv
        if '--overlay' in arg
    )

    for N in SIZES:
        values = scan_possible_values(N)

        if print_scan:
            print('Found:')
            for n, (Wc, Wb, a) in enumerate(values[:30]):
                print('    [%2d] N = %d, Wc = %d, Wb = %d, R = %.2f, R2 = %.2f, a = %d' % (n, N, Wc, Wb, (Wc + Wb) / N, Wc / Wb, a))

        if N in selected:
            make_overlays(N, values[selected[N]])


def F(x: int, a: int, Wc: int, Wb: int) -> bool:
    return ((x + a) % (Wc + Wb)) >= Wc


def scan_possible_values(N: int):
    values = dict()  # (Wc, Wb) -> min a
    for Wc in range(1, N):
        for Wb in range(1, N):
            W = Wc + Wb
            if W < N and N % W == 0:  # Tiling condition
                for a in range(W):
                    if all(  # Rotation condition
                        F(x, a, Wc, Wb) == F(-x, a, Wc, Wb)
                        for x in range(N)
                    ):
                        key = Wc, Wb
                        if key not in values:
                            values[key] = a
                        else:
                            values[key] = min(values[key], a)
    
    values = [(Wc, Wb, a) for (Wc, Wb), a in values.items()]
    values.sort(key=lambda k: (abs(k[0] - k[1]), k))
    return values


def make_overlays(N: int, values: list[int]):    
    Wc, Wb, a = values
    overlay = make_overlay(N, a, Wc, Wb)
    recipes = make_recipes(N)

    for name, width, height, squares in recipes:
        img = Image.new('RGBA', (width, height))

        for x, y, src_x, src_y, w, h in squares:
            img.paste(overlay.crop((src_x, src_y, src_x + w, src_y + h)), (x, y, x + w, y + h))

        img.save('./art-work/pipe/%d/%s.png' % (N, name))


def make_overlay(N: int, a: int, Wc: int, Wb: int):
    img = Image.new('RGBA', (N, N))

    for x in range(N):
        for y in range(N):
            n = (x - (N - 1 - y))
            if F(n, a, Wc, Wb):
                img.putpixel((x, y), (255, 255, 255))
    
    return img


def make_recipes(N: int):
    recipes = []  # (name, width, height, squares: [x, y, src x, src y, w, h]...)

    for pr in (1, 2, 3, 4):
        p = PALETTES[N](pr)
        recipes += (
            ('straight_%d_overlay_h' % pr, p.tile_width, p.inside_width, [(0, 0, 0, p.inside_top, p.tile_width, p.inside_width)]),
            ('straight_%d_overlay_v' % pr, p.inside_width, p.tile_width, [(0, 0, p.inside_top, 0, p.inside_width, p.tile_width)]),
            ('port_%d_overlay_h' % pr, p.tile_width, p.inside_width, [(0, 0, 0, p.inside_top, p.port_width, p.inside_width)]),
            ('port_%d_overlay_v' % pr, p.inside_width, p.tile_width, [(0, 0, p.inside_top, 0, p.inside_width, p.port_width)]),
            ('curve_%d_overlay_h' % pr, p.tile_width, p.tile_width, [
                (0, p.inside_top, 0, p.inside_top, p.inside_top + p.inside_width, p.inside_width),
                (p.inside_top, 0, p.inside_top, 0, p.inside_width, p.inside_top),
            ]),
            ('curve_%d_overlay_v' % pr, p.tile_width, p.tile_width, [
                (p.inside_top, p.inside_top, p.inside_top, p.inside_top, p.inside_top + p.inside_width, p.inside_width),
                (p.inside_top, 0, p.inside_top, 0, p.inside_width, p.inside_top),
            ]),
        )
    return recipes


if __name__ == '__main__':
    main()