import os
import re
import json

from typing import Dict


ENUMS: Dict[str, int] = {}


def main():
    import_constants()
    export_data()


def import_constants():
    with open('./src/gen/constants.ts', 'r', encoding='utf-8') as f:
        text = f.read()
    
    for line in text.split('\n'):
        m = re.match('^    ([A-Z_]+) = ([0-9]+),', line)
        if m:
            ENUMS[m.group(1).lower()] = int(m.group(2))

def export_data():
    with open('./data/puzzles.json', 'r', encoding='utf-8') as f:
        input = json.load(f)
    
    output = {
        'puzzles': [None] * len(input['puzzles'])
    }

    for pz_data in input['puzzles']:
        index = pz_data['id']
        pz = {
            'id': index,
            'size': pz_data['size'] - ENUMS['grid_id_to_width'],
            'inputs': [
                [inp['x'], inp['y'], ENUMS[inp['dir']], ENUMS[inp['color']], inp['pressure']]
                for inp in pz_data['inputs']
            ],
            'outputs': [
                [inp['x'], inp['y'], ENUMS[inp['dir']], ENUMS[inp['color']], inp['pressure']]
                for inp in pz_data['outputs']
            ],
        }

        if 'filters' in pz_data and pz_data['filters']:
            pz['filters'] = [
                [inp['x'], inp['y'], ENUMS[inp['dir']], ENUMS[inp['color']]]
                for inp in pz_data['filters']
            ]

        output['puzzles'][index] = pz
    
    os.makedirs('out', exist_ok=True)
    with open('./out/puzzles.json', 'w', encoding='utf-8') as f:
        json.dump(output, f)


if __name__ == '__main__':
    main()
