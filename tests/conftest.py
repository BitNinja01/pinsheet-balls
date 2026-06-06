"""Shared test fixtures for pinsheet-balls."""
import pytest


@pytest.fixture
def sample_csv(tmp_path):
    """3 balls, 2 metrics, 2 condition combos."""
    f = tmp_path / "ball_data.csv"
    f.write_text(
        "ball,metric,speed,club,value\n"
        "Pro V1,Total,fast,driver,310.5\n"
        "Pro V1,Spin,fast,driver,2400\n"
        "Pro V1,Total,slow,driver,280.2\n"
        "Pro V1,Spin,slow,driver,2600\n"
        "TP5,Total,fast,driver,308.1\n"
        "TP5,Spin,fast,driver,2500\n"
        "TP5,Total,slow,driver,278.9\n"
        "TP5,Spin,slow,driver,2700\n"
        "Chrome Soft,Total,fast,driver,305.8\n"
        "Chrome Soft,Spin,fast,driver,2450\n"
        "Chrome Soft,Total,slow,driver,275.3\n"
        "Chrome Soft,Spin,slow,driver,2550\n"
    )
    return f


@pytest.fixture
def empty_csv(tmp_path):
    f = tmp_path / "ball_data.csv"
    f.write_text("ball,metric,speed,club,value\n")
    return f
