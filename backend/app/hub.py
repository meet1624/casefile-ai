"""Who is connected to which room, and sending events to them.

Lives in memory in one process, which is right for a local app. Running several server
processes would need something shared (like Redis) in its place.
"""

import anyio.from_thread
from fastapi import WebSocket


class RoomHub:
    def __init__(self):
        self._conns: dict[str, dict[str, set[WebSocket]]] = {}  # room code -> username -> sockets

    def online(self, code: str) -> set[str]:
        return set(self._conns.get(code, {}))

    def add(self, code: str, username: str, ws: WebSocket) -> None:
        self._conns.setdefault(code, {}).setdefault(username, set()).add(ws)

    def remove(self, code: str, username: str, ws: WebSocket) -> None:
        users = self._conns.get(code, {})
        users.get(username, set()).discard(ws)
        if not users.get(username):
            users.pop(username, None)
        if not users:
            self._conns.pop(code, None)

    async def broadcast(self, code: str, event: dict) -> None:
        """Send to everyone in ONE room. A dead connection is dropped, never an error."""
        for username, sockets in list(self._conns.get(code, {}).items()):
            for ws in list(sockets):
                try:
                    await ws.send_json(event)
                except Exception:
                    self.remove(code, username, ws)

    def presence(self, code: str) -> dict:
        return {"type": "presence", "online": sorted(self.online(code))}


hub = RoomHub()


def publish(code: str, event: dict) -> None:
    """For normal (sync) endpoints, which run in worker threads: hand the event to the event loop."""
    anyio.from_thread.run(hub.broadcast, code, event)
