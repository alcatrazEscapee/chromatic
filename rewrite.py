
import json


COLOR_OLD_TO_NAME = {
    'R': 'red',
    'B': 'blue',
    'Y': 'yellow',
    'O': 'orange',
    'P': 'purple',
    'G': 'green',
    'Br': 'brown',
    'Lm': 'lime',
    'Cy': 'cyan',
    'Am': 'amber',
    'Gd': 'gold',
    'Vi': 'violet',
    'Mg': 'magenta',
}

COLOR_NAME_TO_INT = {
    'red': 0,
    'blue': 1,
    'yellow': 2,
    'orange': 3,
    'purple': 4,
    'green': 5,
    'brown': 6,
    'lime': 7,
    'cyan': 8,
    'amber': 9,
    'gold': 10,
    'violet': 11,
    'magenta': 12,
}

LEFT = 'left'
UP = 'up'
RIGHT = 'right'
DOWN = 'down'

DIR_NAME_INVERSE = {
    LEFT: RIGHT,
    RIGHT: LEFT,
    UP: DOWN,
    DOWN: UP,
}

DIR_NAME_OFFSET = {
    LEFT: (-1, 0),
    RIGHT: (1, 0),
    UP: (0, -1),
    DOWN: (0, 1),
}

DIR_NAME_TO_INT = {
    LEFT: 0,
    UP: 1,
    RIGHT: 2,
    DOWN: 3,
}

SIZE_TO_GRID_ID = {
    3: 0,
    4: 1,
    5: 2,
}

# Map of old 'pos' field to {x, y, dir}, where dir represents the incoming flow
# Old position went clockwise around the outer edge, starting from (0, 0)
# New position is the (x, y) of the puzzle tile it's about to flow into, and the direction it's flowing
# (NOT the direction of the side)
# So the first one will always be {x: 0, y: 0, dir: DOWN}
POS3 = {}
POS4 = {}
POS5 = {}
POS_AT_SIZE = {3: POS3, 4: POS4, 5: POS5}

def init():
    for (POS, n) in ((POS3, 3), (POS4, 4), (POS5, 5)):
        m = n - 1
        for i in range(n):
            POS[0 + i] = {'x': i, 'y': 0, 'dir': DOWN}
            POS[n + i] = {'x': m, 'y': i, 'dir': LEFT}
            POS[2 * n + i] = {'x': m - i, 'y': m, 'dir': UP}
            POS[3 * n + i] = {'x': 0, 'y': m - i, 'dir': RIGHT}

init()


def convert_pos_to_input(size, pos):
    # Converts a pos to an input flow
    return dict(POS_AT_SIZE[size][int(pos)])

def convert_pos_to_output(size, pos):
    # Converts a pos to an output flow
    # Output flows are opposite to input flows - they are positioned along the outer edge, with the direction of the incoming flow
    # as it lines up with the output. But the old positions are labeled the same. So, we flip the direction, add offset, then good
    out = dict(POS_AT_SIZE[size][int(pos)])
    dx, dy = DIR_NAME_OFFSET[DIR_NAME_INVERSE[out['dir']]]
    out['x'] += dx
    out['y'] += dy
    out['dir'] = DIR_NAME_INVERSE[out['dir']]
    return out





rewrite = {
    'puzzles': []
}
sizes = []

with open('./data.json', 'r') as f:
    data = json.load(f)

for pack_data in data['pack']:
    sizes.append(int(pack_data['size']))

for pz_data in data['puzzle']:
    pin_data = pz_data['pin']
    if not isinstance(pin_data, list):
        pin_data = [pin_data]
    
    pout_data = pz_data['pout']
    if not isinstance(pout_data, list):
        pout_data = [pout_data]
    
    pf_data = None
    if 'fil' in pz_data:
        pf_data = pz_data['fil']
        if not isinstance(pf_data, list):
            pf_data = [pf_data]
    
    size = sizes[int(pz_data['pack'])]
    pz = {
        'id': int(pz_data['pack']) * 16 + int(pz_data['id']),
        'size': size,
        'inputs': [{
            'color': COLOR_OLD_TO_NAME[p['col']],
            'pressure': int(p['pres']),
            **convert_pos_to_input(size, p['pos'])
        } for p in pin_data],
        'outputs': [{
            'color': COLOR_OLD_TO_NAME[p['col']],
            'pressure': int(p['pres']),
            **convert_pos_to_output(size, p['pos'])
        } for p in pout_data],
    }
    if pf_data:
        pz['filters'] = [{
            'pos1': int(p['p1']),  # todo: figure out how these were done
            'pos2': int(p['p2']),
            'color': COLOR_OLD_TO_NAME[p['col']],
            'direction': p['dir'],
        } for p in pf_data]
    
    rewrite['puzzles'].append(pz)


with open('./data-rewrite.json', 'w') as f:
    json.dump(rewrite, f, indent=2)


compressed = {
    'puzzles': [None] * len(rewrite['puzzles'])
}

for pz_data in rewrite['puzzles']:
    index = pz_data['id']
    pz = {
        'id': index,
        'size': SIZE_TO_GRID_ID[pz_data['size']],
        'inputs': [
            [inp['x'], inp['y'], DIR_NAME_TO_INT[inp['dir']], COLOR_NAME_TO_INT[inp['color']], inp['pressure']]
            for inp in pz_data['inputs']
        ],
        'outputs': [
            [inp['x'], inp['y'], DIR_NAME_TO_INT[inp['dir']], COLOR_NAME_TO_INT[inp['color']], inp['pressure']]
            for inp in pz_data['outputs']
        ],
    }

    compressed['puzzles'][index] = pz

with open('./data-compressed.json', 'w') as f:
    json.dump(compressed, f)