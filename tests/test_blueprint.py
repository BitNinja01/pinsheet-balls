"""Tests for blueprint.py — Flask routes."""
from pathlib import Path

import jinja2
import pytest
from flask import Flask

from pinsheet_balls.blueprint import bp as _bp


def _make_app():
    app = Flask(__name__)
    app.root_path = str(Path(__file__).resolve().parent.parent)
    app.config["SECRET_KEY"] = "test"
    app.config["TESTING"] = True
    app.config["LOGIN_DISABLED"] = True
    app.jinja_loader = jinja2.ChoiceLoader([
        app.jinja_loader,
        jinja2.FunctionLoader(lambda name: (
            '{% block content %}{% endblock %}' if name == 'base.html' else None
        )),
    ])
    app.register_blueprint(_bp, url_prefix="/plugins/balls")
    return app


@pytest.fixture
def app(sample_csv, monkeypatch):
    monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", sample_csv)
    monkeypatch.setattr("pinsheet_balls.blueprint.base_context", lambda **x: {"settings": {}, "all_users": []})
    from pinsheet_balls.blueprint import _clear_cache
    _clear_cache()
    return _make_app()


@pytest.fixture
def client(app):
    return app.test_client()


class TestBallsData:
    def test_data_returns_json(self, client):
        resp = client.get("/plugins/balls/data")
        assert resp.status_code == 200
        assert resp.content_type == "application/json"

    def test_data_has_expected_keys(self, client):
        resp = client.get("/plugins/balls/data")
        data = resp.get_json()
        assert "balls" in data
        assert "conditions" in data
        assert "metrics" in data
        assert "rows" in data

    def test_data_rows_have_pivoted_metrics(self, client):
        resp = client.get("/plugins/balls/data")
        data = resp.get_json()
        row = data["rows"][0]
        for m in data["metrics"]:
            assert m in row

    def test_missing_file_returns_503(self, tmp_path, monkeypatch):
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", tmp_path / "nope.csv")
        from pinsheet_balls.blueprint import _clear_cache
        _clear_cache()
        client = _make_app().test_client()
        resp = client.get("/plugins/balls/data")
        assert resp.status_code == 503

    def test_empty_csv_returns_503(self, empty_csv, monkeypatch):
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", empty_csv)
        from pinsheet_balls.blueprint import _clear_cache
        _clear_cache()
        client = _make_app().test_client()
        resp = client.get("/plugins/balls/data")
        assert resp.status_code == 503


class TestBallsPage:
    def test_page_returns_html(self, client):
        resp = client.get("/plugins/balls/")
        assert resp.status_code == 200
        assert resp.content_type.startswith("text/html")

    def test_page_has_app_container(self, client):
        resp = client.get("/plugins/balls/")
        html = resp.data.decode()
        assert 'id="balls-app"' in html
