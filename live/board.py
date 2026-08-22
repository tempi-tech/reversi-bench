from PIL import Image, ImageDraw, ImageFont

WIDTH = 480
CELL = 44
MARGIN = 64
BOARD_TOP = 150
SWATCH = 30
COLUMN_WIDTH = 168
INK = (243, 234, 214)
GOLD = (217, 181, 106)
MUTED = (150, 140, 120)
BACKDROP = (12, 11, 9)
FELT = (28, 61, 50)
GRID = (18, 42, 34)
BLACK_STONE = (24, 22, 20)
WHITE_STONE = (240, 234, 222)
STONE_EDGE = (60, 56, 50)
MARKER_EDGE = (124, 118, 106)
LABEL_GOLD = (231, 214, 164)
SIDES = {"B": "BLACK", "W": "WHITE"}

FONT_PATHS = [
    "/System/Library/Fonts/Supplemental/Menlo.ttc",
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
]


def font_of(size):
    for path in FONT_PATHS:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def move_of(last):
    return last.get("move") if isinstance(last, dict) else last


def coord_of(last, size):
    move = move_of(last)
    if not move or move == "pass":
        return None
    return ord(move[0]) - ord("a"), size - int(move[1:])


def fit(draw, text, font, limit):
    if draw.textlength(text, font=font) <= limit:
        return text
    trimmed = text
    while trimmed and draw.textlength(trimmed + "…", font=font) > limit:
        trimmed = trimmed[:-1]
    return trimmed + "…"


def chip(draw, text, font, filled):
    width = 54
    box = [WIDTH - MARGIN - width, 18, WIDTH - MARGIN, 36]
    draw.rectangle(box, fill=GOLD if filled else None, outline=GOLD, width=1)
    offset = (width - draw.textlength(text, font=font)) / 2
    draw.text((box[0] + offset, 22), text, font=font, fill=BACKDROP if filled else LABEL_GOLD)


def marker(draw, x, side, active):
    draw.rectangle([x, 74, x + SWATCH, 74 + SWATCH], fill=FELT, outline=GOLD if active else GRID, width=2)
    draw.ellipse(
        [x + 5, 79, x + SWATCH - 5, 69 + SWATCH],
        fill=BLACK_STONE if side == "B" else WHITE_STONE,
        outline=MARKER_EDGE,
    )


def render(snapshot, path, black, white):
    size = snapshot["size"]
    board_px = CELL * size
    height = BOARD_TOP + board_px + 52
    image = Image.new("RGB", (WIDTH, height), BACKDROP)
    draw = ImageDraw.Draw(image)

    title = font_of(20)
    label = font_of(11)
    score = font_of(30)
    small = font_of(10)
    tiny = font_of(9)

    counts = snapshot["counts"]
    turn = snapshot.get("turn")
    over = snapshot.get("status") == "over"
    winner = snapshot.get("winner")
    names = {"B": black, "W": white}

    draw.text((MARGIN, 22), "REVERSI BENCH", font=small, fill=MUTED)
    draw.text((MARGIN, 40), snapshot.get("title", "Reversi"), font=title, fill=INK)
    chip(draw, ("FINAL" if winner in names else "DRAW") if over else "LIVE", small, over)

    for side, x in (("B", MARGIN), ("W", WIDTH // 2 + 8)):
        active = (not over and turn == side) or (over and winner == side)
        marker(draw, x, side, active)
        draw.text((x + SWATCH + 8, 76), SIDES[side], font=small, fill=LABEL_GOLD if active else INK)
        draw.text((x + SWATCH + 8, 90), fit(draw, names[side].upper(), tiny, COLUMN_WIDTH - SWATCH - 8), font=tiny, fill=INK)
        draw.text((x, 110), str(counts[side]), font=score, fill=INK)

    left = (WIDTH - board_px) // 2
    draw.rectangle([left, BOARD_TOP, left + board_px, BOARD_TOP + board_px], fill=FELT)

    last = snapshot.get("lastMove")
    spot = coord_of(last, size)
    rows = snapshot["board"]
    for row in range(size):
        for column in range(size):
            x0 = left + column * CELL
            y0 = BOARD_TOP + row * CELL
            draw.rectangle([x0, y0, x0 + CELL, y0 + CELL], outline=GRID)
            if spot == (column, row):
                draw.rectangle([x0 + 1, y0 + 1, x0 + CELL - 1, y0 + CELL - 1], outline=GOLD)
            cell = rows[row][column]
            if cell in ("B", "W"):
                draw.ellipse(
                    [x0 + 7, y0 + 7, x0 + CELL - 7, y0 + CELL - 7],
                    fill=BLACK_STONE if cell == "B" else WHITE_STONE,
                    outline=STONE_EDGE,
                )

    for column in range(size):
        draw.text((left + column * CELL + CELL // 2 - 3, BOARD_TOP + board_px + 6), chr(ord("a") + column), font=label, fill=MUTED)
    for row in range(size):
        draw.text((left - 14, BOARD_TOP + row * CELL + CELL // 2 - 6), str(size - row), font=label, fill=MUTED)

    played = last.get("side") if isinstance(last, dict) else None
    footer = (
        f"final · {SIDES[winner]} wins {counts['B']}-{counts['W']}"
        if over and winner in names
        else f"final · draw {counts['B']}-{counts['W']}"
        if over
        else f"last {move_of(last) or '-'} by {SIDES.get(played, '-')} · {SIDES[turn]} to move"
    )
    draw.text((MARGIN, height - 26), fit(draw, footer, small, WIDTH - 2 * MARGIN), font=small, fill=MUTED)

    image.save(path, "JPEG", quality=72)
    return path
