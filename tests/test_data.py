"""Tests for data.py — CSV loading and pivoting."""


class TestLoadBallData:
    def test_returns_correct_structure(self, sample_csv, monkeypatch):
        from pinsheet_balls.data import load_ball_data
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", sample_csv)
        result = load_ball_data()
        assert result["balls"] == ["Chrome Soft", "Pro V1", "TP5"]
        assert result["conditions"] == ["fast_driver", "slow_driver"]
        assert "Total" in result["metrics"]
        assert "Spin" in result["metrics"]

    def test_pivots_rows_correctly(self, sample_csv, monkeypatch):
        from pinsheet_balls.data import load_ball_data
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", sample_csv)
        result = load_ball_data()
        rows = result["rows"]
        a_driver = [r for r in rows if r["ball"] == "Chrome Soft" and r["condition"] == "fast_driver"][0]
        assert a_driver["Total"] == 305.8
        assert a_driver["Spin"] == 2450.0

    def test_values_are_floats(self, sample_csv, monkeypatch):
        from pinsheet_balls.data import load_ball_data
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", sample_csv)
        result = load_ball_data()
        row = result["rows"][0]
        for m in result["metrics"]:
            assert isinstance(row[m], float), f"{m} is {type(row[m])}"

    def test_missing_file_returns_none(self, tmp_path, monkeypatch):
        from pinsheet_balls.data import load_ball_data
        missing = tmp_path / "nonexistent.csv"
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", missing)
        assert load_ball_data() is None

    def test_malformed_row_is_skipped(self, sample_csv, monkeypatch):
        sample_csv.write_text(
            "ball,metric,speed,club,value\n"
            "Good Ball,ball-speed,fast,driver,100.0\n"
            "bad-line-no-commas\n"
            "Good Ball,carry,fast,driver,200.0\n"
        )
        from pinsheet_balls.data import load_ball_data
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", sample_csv)
        result = load_ball_data()
        assert len(result["rows"]) == 1
