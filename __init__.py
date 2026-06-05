"""Ball Comparison plugin for PinSheet Server."""
from __future__ import annotations

import importlib
import logging
import sys
from pathlib import Path

log = logging.getLogger("pinsheet")

plugin_info = {
    "name": "pinsheet-balls",
    "version": "0.1.0",
    "description": "Golf ball performance comparison across swing speeds and conditions",
    "author": "PinSheet",
}


def register(app):
    _parent = Path(__file__).parent

    # Register pinsheet_balls subpackage in sys.modules so that
    # blueprint.py's relative import (from .data) resolves correctly.
    _pkg_spec = importlib.util.spec_from_file_location(
        "pinsheet_balls", str(_parent / "pinsheet_balls" / "__init__.py"),
    )
    _pkg_mod = importlib.util.module_from_spec(_pkg_spec)
    sys.modules["pinsheet_balls"] = _pkg_mod
    _pkg_spec.loader.exec_module(_pkg_mod)

    _bp_spec = importlib.util.spec_from_file_location(
        "pinsheet_balls.blueprint",
        str(_parent / "pinsheet_balls" / "blueprint.py"),
    )
    _bp_mod = importlib.util.module_from_spec(_bp_spec)
    sys.modules[_bp_mod.__name__] = _bp_mod
    _bp_spec.loader.exec_module(_bp_mod)

    app.register_blueprint(_bp_mod.bp, url_prefix="/plugins/balls")

    pname = plugin_info["name"]
    head_tag = f'<link rel="stylesheet" href="/plugins/{pname}/static/balls.css">'
    if not hasattr(app, "_plugin_blocks"):
        app._plugin_blocks = {}
    app._plugin_blocks["head"] = (
        (app._plugin_blocks.get("head", "") + "\n" + head_tag).strip()
    )

    if not hasattr(app, "_plugin_nav"):
        app._plugin_nav = []
    app._plugin_nav.append({
        "label": "Ball Comparison",
        "url": "/plugins/balls/",
        "page_id": "balls",
    })

    log.info("balls: registered v%s", plugin_info["version"])


def unregister(app):
    pname = plugin_info["name"]
    head_tag = f'<link rel="stylesheet" href="/plugins/{pname}/static/balls.css">'
    current_head = app._plugin_blocks.get("head", "")
    app._plugin_blocks["head"] = current_head.replace(head_tag, "").strip()
    app._plugin_nav[:] = [n for n in app._plugin_nav if n.get("page_id") != "balls"]
