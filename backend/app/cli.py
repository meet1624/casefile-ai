"""Play the case in the terminal:  python -m app.cli"""

from pathlib import Path

from .engine.case_models import load_case
from .engine.session import GameError, Session

CASE_FILE = Path(__file__).parent / "cases" / "the_midnight_gala.json"

HELP = """Commands:
  list                      show locations, topics, suspects
  search <location>         e.g.  search study
  ask <suspect> <topic>     e.g.  ask tomas whereabouts
  show <suspect> <evidence> e.g.  show tomas cellar_sheet
  journal                   evidence, statements and contradictions so far
  accuse <suspect>          end the game and name the culprit
  help, quit"""


def main() -> None:
    case = load_case(CASE_FILE)
    game = Session(case)
    print(f"\n=== {case.title} ===\n{case.setting}\n\n{case.briefing}\n\n{HELP}\n")
    while game.phase == "investigation":
        try:
            raw = input("> ").strip()
        except EOFError:
            return
        cmd, *args = raw.split() if raw else ("",)
        try:
            if cmd == "quit":
                return
            elif cmd == "help":
                print(HELP)
            elif cmd == "list":
                print("locations:", ", ".join(case.locations))
                print("topics:   ", ", ".join(case.topics))
                for s in case.suspects:
                    print(f"  {s.id:8} {s.name}, {s.role}. {s.personality}")
            elif cmd == "search" and args:
                found = game.search(" ".join(args))
                for e in found:
                    print(f"FOUND: {e.name} [{e.id}]\n  {e.description}")
                if not found:
                    print("Nothing new here.")
            elif cmd == "ask" and len(args) == 2:
                print(f'{args[0]}: "{game.ask(*args)}"')
            elif cmd == "show" and len(args) == 2:
                print(f'{args[0]}: "{game.present(*args)}"')
            elif cmd == "journal":
                j = game.journal()
                print("Evidence:", ", ".join(e["id"] for e in j["evidence"]) or "none")
                for c in j["contradictions"]:
                    print(f'CONTRADICTION: {c["suspect"]} said "{c["said"]}" but [{c["refuted_by"]}] says otherwise')
            elif cmd == "accuse" and args:
                result = game.accuse(args[0])
                print("\nCORRECT!" if result["correct"] else "\nWRONG.")
                print(f'Culprit: {result["culprit"]}\nMotive: {result["motive"]}\n'
                      f'Method: {result["method"]}\n\n{result["explanation"]}\n'
                      f'\nScore: {result["score"]} (key evidence found {result["key_evidence_found"]})')
            else:
                print("Unknown command. Type 'help'.")
        except GameError as err:
            print(f"! {err}")


if __name__ == "__main__":
    main()
