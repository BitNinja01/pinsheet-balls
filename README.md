[![Release](https://img.shields.io/github/v/release/BitNinja01/pinsheet-balls.svg?style=for-the-badge&color=green)](https://github.com/BitNinja01/pinsheet-balls/releases)
[![Downloads](https://img.shields.io/github/downloads/BitNinja01/pinsheet-balls/total.svg?style=for-the-badge&color=green)](https://github.com/BitNinja01/pinsheet-balls/releases)
[![Platform](https://img.shields.io/badge/Platforms-Linux%20|%20macOS%20|%20Windows-white.svg?style=for-the-badge&color=green)](https://github.com/BitNinja01/pinsheet-balls)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg?style=for-the-badge&color=green)](https://www.python.org/downloads/)

---

> Find your ball.

---

A plugin for [PinSheet](https://github.com/BitNinja01/pinsheet), the golf stats and round tracking app. Compares golf ball performance data across swing speeds and conditions to help you find the ball that fits your game.

- **44 ball models** — major OEMs covered: Titleist, Callaway, TaylorMade, Srixon, Bridgestone, Wilson, Maxfli, Vice, Mizuno, PXG, Kirkland, and more
- **4 swing conditions** — slow driver, slow mid-iron, partial wedge (35%), and full sand wedge
- **8 metrics per shot** — ball speed, carry, total distance, spin, launch angle, descent angle, max height, and height-at-distance
- **Side-by-side comparison** — select any two balls and compare across all metrics
- **Rank & filter** — sort balls by any metric to see which performs best for your swing

### Setup

Requires PinSheet v2.1.0+.

---

## Installation

### Prerequisites

- **Python 3.11+**
- **PinSheet v2.1.0+** — the parent app must be installed and its plugin system available

**PinSheet's launcher (`launch.sh`/`launch.bat`) auto-installs plugin dependencies at startup** — no manual `pip install` needed when running inside PinSheet. The steps below just place the files in the right directory.

### Option 1: Release zip (recommended)

Download the latest release from the [releases page](https://github.com/BitNinja01/pinsheet-balls/releases) and extract it into PinSheet's `plugins/` directory:

```bash
# From your PinSheet install directory
mkdir -p plugins
cd plugins
wget https://github.com/BitNinja01/pinsheet-balls/releases/latest/download/pinsheet-balls_0.1.0.zip
unzip pinsheet-balls_0.1.0.zip -d balls
```

### Option 2: Git clone

```bash
# From your PinSheet install directory
mkdir -p plugins
cd plugins
git clone https://github.com/BitNinja01/pinsheet-balls.git
```

For standalone use outside PinSheet, run `pip install -r requirements.txt` from the balls directory.

### Verify installation

Launch PinSheet — if installed correctly, you'll see Ball Comparison listed in the plugin bindings.

---

## Usage

Navigate to the Ball Comparison screen in PinSheet's web UI:

1. **Select a ball** to see its full performance profile across all swing conditions
2. **Compare two balls** side-by-side to spot differences in carry, spin, launch, and descent
3. **Sort the field** by any metric to see where a ball ranks — best for distance? Most spin on wedge shots?
4. **Filter by condition** to evaluate performance specifically for your driver swing, iron play, or short game

---

## Data

Ball performance data sourced from robot testing using a consistent swing robot across all models. Metrics captured for four swing profiles:

| Condition | Club | Speed |
|-----------|------|-------|
| Slow driver | Driver | ~90 mph |
| Slow mid-iron | 6-iron | ~75 mph |
| Partial wedge | Sand wedge (35%) | ~50 mph |
| Full wedge | Sand wedge | ~80 mph |

---

## Development

```bash
pip install -r requirements.txt
```

The ball comparison UI is built as a standalone web app. Data lives in `ball_data.csv` and is loaded at runtime.
