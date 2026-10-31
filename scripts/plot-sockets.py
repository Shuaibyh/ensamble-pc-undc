"""Offline geometric inspection, not a substitute for localhost visual QA."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
import numpy as np

folder = Path(__file__).resolve().parents[2] / 'docs' / 'qa-sockets'
for kind, names in [('pc', ['Object_94','Object_96','Object_5','Object_7','Object_26','Object_28','Object_34']),('monitor',['Cube_Case_0','Cube_USB_0'])]:
    meshes = json.loads((folder / f'{kind}-geometry.json').read_text())
    fig, ax = plt.subplots(figsize=(12,12))
    for mesh in meshes:
        if mesh['name'] not in names: continue
        p = np.array(mesh['positions'])
        ix = np.array(mesh['indices']).reshape(-1,3)
        if not len(ix): ix = np.arange(len(p)).reshape(-1,3)
        coords = p[:,[2,1]] if kind == 'pc' else p[:,[0,1]]
        ax.add_collection(PolyCollection(coords[ix],facecolors='none',edgecolors='black',linewidths=.2))
    ax.autoscale(); ax.set_aspect('equal'); ax.grid(); ax.set_xlabel('z (PC) / x (monitor)'); ax.set_ylabel('y')
    fig.savefig(folder / f'{kind}-port-geometry.png',dpi=180); plt.close(fig)
