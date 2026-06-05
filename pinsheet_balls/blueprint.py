"""Ball Comparison Blueprint — page and data API routes."""
from __future__ import annotations

from flask import Blueprint, jsonify, render_template
from flask_login import login_required
from source.request_data import base_context

from .data import load_ball_data

bp = Blueprint("balls", __name__)

_cache: dict | None = None


def _clear_cache():
    global _cache
    _cache = None


@bp.route("/")
@login_required
def balls_page():
    return render_template("balls.html", current_page="balls", **base_context())


@bp.route("/data")
@login_required
def balls_data():
    global _cache
    if _cache is None:
        _cache = load_ball_data()
    if _cache is None:
        return jsonify({"error": "Ball data not available"}), 503
    return jsonify(_cache)
