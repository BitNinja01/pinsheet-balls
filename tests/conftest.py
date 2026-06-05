"""Shared test fixtures for pinsheet-balls."""
import pytest


@pytest.fixture
def sample_csv(tmp_path):
    """Creates a minimal valid CSV for testing."""
    csv_path = tmp_path / "ball_data.csv"
    csv_path.write_text(
        "metric,condition,ball,value\n"
        "ball-speed,slow_driver,Test Ball A,120.5\n"
        "carry,slow_driver,Test Ball A,210.3\n"
        "spin,slow_driver,Test Ball A,2500.0\n"
        "ball-speed,slow_mid-iron,Test Ball A,85.2\n"
        "carry,slow_mid-iron,Test Ball A,160.1\n"
        "spin,slow_mid-iron,Test Ball A,6500.0\n"
        "ball-speed,slow_driver,Test Ball B,122.1\n"
        "carry,slow_driver,Test Ball B,215.7\n"
        "spin,slow_driver,Test Ball B,2400.0\n"
    )
    return csv_path


@pytest.fixture
def empty_csv(tmp_path):
    """Creates a CSV with only a header row."""
    csv_path = tmp_path / "ball_data.csv"
    csv_path.write_text("metric,condition,ball,value\n")
    return csv_path
