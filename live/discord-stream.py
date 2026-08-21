import argparse
import base64
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

parser = argparse.ArgumentParser(description="Stream a reversi-bench game to a Discord forum as board screenshots")
parser.add_argument("--arena", required=True, help="directory holding reversi.mjs and the live match")
parser.add_argument("--handler", required=True, help="AGI Wings handler id running live/discord-handler.js")
parser.add_argument("--channel", required=True, help="Discord forum channel id to open the live post in")
parser.add_argument("--tab", default="", help="AGI Cockpit browser tab id, used only when --render screenshot")
parser.add_argument("--render", choices=["local", "screenshot"], default="local", help="draw the board locally (needs Pillow) or screenshot the spectator page")
parser.add_argument("--black", required=True)
parser.add_argument("--white", required=True)
parser.add_argument("--title", required=True)
parser.add_argument("--marks", required=True, help="state file so a restarted stream resumes where it stopped")
parser.add_argument("--link", default="", help="optional URL shown in the opening and closing posts")
parser.add_argument("--minutes", type=int, default=150)
args = parser.parse_args()

ARENA = os.path.expanduser(args.arena)
SHOT = f"{args.marks}.jpg"
LINK = f"\n{args.link}" if args.link else ""


def log(message):
    print(f"{time.strftime('%H:%M:%S')} {message}", flush=True)


def run(command, timeout):
    return subprocess.run(command, capture_output=True, timeout=timeout, stdin=subprocess.DEVNULL)


def invoke(event):
    for attempt in range(4):
        try:
            result = run(["wings", "run", args.handler, "--event", json.dumps(event, ensure_ascii=False)], 120)
            payload = json.loads(result.stdout)["data"]["result"]
            if payload.get("id"):
                return payload
            raise RuntimeError(str(payload)[:120])
        except Exception as error:
            log(f"post attempt {attempt + 1} failed: {type(error).__name__} {str(error)[:120]}")
        time.sleep(20 * (attempt + 1))
    return None


def state():
    result = run(["node", f"{ARENA}/reversi.mjs", "state", "--json"], 30)
    return json.loads(result.stdout)["data"]


def board_local(snapshot):
    try:
        import board
        board.render(snapshot, SHOT, args.black, args.white)
        return base64.b64encode(open(SHOT, "rb").read()).decode()
    except Exception as error:
        log(f"local render failed: {type(error).__name__} {str(error)[:120]}")
        return None


def board_shot():
    for attempt in range(3):
        try:
            result = run(["cockpit", "browser", "screenshot", args.tab, "--json"], 90)
            path = json.loads(result.stdout)["data"]["path"]
            sips = run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "70", "--resampleWidth", "480", path, "--out", SHOT], 60)
            if sips.returncode != 0:
                raise RuntimeError(f"sips rc={sips.returncode}")
            return base64.b64encode(open(SHOT, "rb").read()).decode()
        except Exception as error:
            log(f"shot attempt {attempt + 1} failed: {type(error).__name__} {str(error)[:120]}")
            time.sleep(5)
    log("falling back to text board")
    return None


def board_text(rows):
    return "\n".join(rows).replace("B", "●").replace("W", "○")


def marks():
    try:
        return json.load(open(args.marks))
    except Exception:
        return {"thread": None, "posted": 0, "final": False}


def save(state_dict):
    open(args.marks, "w").write(json.dumps(state_dict))


def line_of(index, entry):
    side = "●" if entry["side"] == "B" else "○"
    return f"#{index} {side} {entry['move']}({len(entry.get('flips', []))} flipped)"


def post_update(thread, snapshot, lines, tail):
    content = "\n".join(lines + [tail])
    shot = board_local(snapshot) if args.render == "local" else board_shot()
    if shot:
        return invoke({"op": "image", "channelId": thread, "content": content, "dataBase64": shot, "filename": "board.jpg"})
    return invoke({"op": "post", "channelId": thread, "content": content + "\n```\n" + board_text(snapshot["boardRows"]) + "\n```"})


live = marks()
if not live["thread"]:
    opening = invoke({
        "op": "forum",
        "channelId": args.channel,
        "name": args.title,
        "content": (
            f"**{args.title}**\n"
            f"● Black: `{args.black}`\n"
            f"○ White: `{args.white}`\n"
            "Both players are blind to who they face. One board screenshot per move follows." + LINK
        ),
    })
    if not opening:
        sys.exit("could not open the live post")
    live["thread"] = opening["id"]
    save(live)

deadline = time.time() + args.minutes * 60
while time.time() < deadline:
    try:
        snapshot = state()
    except Exception as error:
        log(f"state read failed: {type(error).__name__}")
        time.sleep(10)
        continue
    history = snapshot["history"]
    if live["posted"] < len(history):
        fresh = range(live["posted"] + 1, len(history) + 1)
        lines = [line_of(index, history[index - 1]) for index in fresh]
        last = history[len(history) - 1]
        name = args.black if last["side"] == "B" else args.white
        counts = snapshot["counts"]
        tail = f"**{name}**  |  ●{counts['B']} - ○{counts['W']}"
        if post_update(live["thread"], snapshot, lines, tail):
            live["posted"] = len(history)
            save(live)
    if snapshot["status"] == "over" and not live["final"]:
        counts = snapshot["counts"]
        winner = snapshot.get("winner")
        winner_name = args.black if winner == "B" else args.white if winner == "W" else "draw"
        mark = "●" if winner == "B" else "○" if winner == "W" else "—"
        tail = f"**Final** — {mark} **{winner_name}**  ●{counts['B']} - ○{counts['W']}" + LINK
        if post_update(live["thread"], snapshot, [], tail):
            live["final"] = True
            save(live)
            log("final posted")
            sys.exit(0)
    time.sleep(12)
log("live window elapsed")
