"""Tests for data.py — CSV loading and pivoting."""


class TestLoadBallData:
    def test_returns_correct_structure(self, sample_csv, monkeypatch):
        from pinsheet_balls.data import load_ball_data
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", sample_csv)
        result = load_ball_data()
        assert result["balls"] == ["Test Ball A", "Test Ball B"]
        assert result["conditions"] == ["slow_driver", "slow_mid-iron"]
        assert "ball-speed" in result["metrics"]
        assert "carry" in result["metrics"]
        assert "spin" in result["metrics"]

    def test_pivots_rows_correctly(self, sample_csv, monkeypatch):
        from pinsheet_balls.data import load_ball_data
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", sample_csv)
        result = load_ball_data()
        rows = result["rows"]
        a_driver = [r for r in rows if r["ball"] == "Test Ball A" and r["condition"] == "slow_driver"][0]
        assert a_driver["ball-speed"] == 120.5
        assert a_driver["carry"] == 210.3
        assert a_driver["spin"] == 2500.0

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
            "metric,condition,ball,value\n"
            "ball-speed,slow_driver,Good Ball,100.0\n"
            "bad-line-no-commas\n"
            "carry,slow_driver,Good Ball,200.0\n"
        )
        from pinsheet_balls.data import load_ball_data
        monkeypatch.setattr("pinsheet_balls.data.DATA_FILE", sample_csv)
        result = load_ball_data()
        assert len(result["rows"]) == 1
