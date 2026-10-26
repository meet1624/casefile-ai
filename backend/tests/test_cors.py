from app.config import CORS_ORIGINS


def preflight(client, origin):
    return client.options("/games", headers={
        "Origin": origin, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type"})


def test_the_frontend_origin_is_allowed(client):
    r = preflight(client, CORS_ORIGINS[0])
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == CORS_ORIGINS[0]


def test_other_websites_are_not(client):
    r = preflight(client, "https://evil.example")
    assert "access-control-allow-origin" not in r.headers
