from .conftest import PASSWORD


def login(client, password):
    return client.post("/auth/login", data={"username": "ann", "password": password})


def test_repeated_wrong_passwords_get_locked_out(client):
    client.post("/auth/register", json={"username": "ann", "password": PASSWORD})
    assert [login(client, "nope").status_code for _ in range(5)] == [401] * 5
    r = login(client, PASSWORD)  # even the right password waits out the lockout
    assert r.status_code == 429 and int(r.headers["Retry-After"]) > 0


def test_success_clears_the_count(client):
    client.post("/auth/register", json={"username": "ann", "password": PASSWORD})
    for _ in range(4):
        login(client, "nope")
    assert login(client, PASSWORD).status_code == 200
    assert [login(client, "nope").status_code for _ in range(5)] == [401] * 5


def test_lockout_is_per_username(client):
    client.post("/auth/register", json={"username": "ann", "password": PASSWORD})
    client.post("/auth/register", json={"username": "bob", "password": PASSWORD})
    for _ in range(5):
        login(client, "nope")
    r = client.post("/auth/login", data={"username": "bob", "password": PASSWORD})
    assert r.status_code == 200


def test_registration_is_throttled(client):
    codes = [client.post("/auth/register", json={"username": f"user{i:02}", "password": PASSWORD}).status_code for i in range(11)]
    assert codes[:10] == [201] * 10 and codes[10] == 429
