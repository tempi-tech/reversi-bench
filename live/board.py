from PIL import Image, ImageDraw, ImageFont

WIDTH = 480
CELL = 44
MARGIN = 56
BOARD_TOP = 132
INK = (243, 234, 214)
GOLD = (217, 181, 106)
BACKDROP = (12, 11, 9)
FELT = (28, 61, 50)
GRID = (18, 42, 34)
BLACK_STONE = (24, 22, 20)
WHITE_STONE = (240, 234, 222)

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


def cells_of(snapshot):
    return snapshot["board"]


def coord_of(last, size):
    move = last.get("move") if isinstance(last, dict) else last
    if not move or move == "pass":
        return None
    column = ord(move[0]) - ord("a")
    row = size - int(move[1:])
    return column, row


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

    draw.text((MARGIN, 26), "REVERSI BENCH", font=small, fill=(150, 140, 120))
    draw.text((MARGIN, 44), snapshot.get("title", "Reversi"), font=title, fill=INK)

    counts = snapshot["counts"]
    turn = snapshot.get("turn")
    over = snapshot.get("status") == "over"
    winner = snapshot.get("winner")

    for side, name, count, x in (("B", black, counts["B"], MARGIN), ("W", white, counts["W"], WIDTH // 2 + 8)):
        active = (not over and turn == side) or (over and winner == side)
        draw.text((x, 84), name[:30].upper(), font=small, fill=GOLD if active else (130, 122, 108))
        draw.text((x, 98), str(count), font=score, fill=INK if active else (120, 113, 100))

    left = (WIDTH - board_px) // 2
    draw.rectangle([left, BOARD_TOP, left + board_px, BOARD_TOP + board_px], fill=FELT)

    last = coord_of(snapshot.get("lastMove"), size)
    rows = cells_of(snapshot)
    for row in range(size):
        for column in range(size):
            x0 = left + column * CELL
            y0 = BOARD_TOP + row * CELL
            draw.rectangle([x0, y0, x0 + CELL, y0 + CELL], outline=GRID)
            if last == (column, row):
                draw.rectangle([x0 + 1, y0 + 1, x0 + CELL - 1, y0 + CELL - 1], outline=GOLD)
            cell = rows[row][column]
            if cell in ("B", "W"):
                pad = 7
                draw.ellipse(
                    [x0 + pad, y0 + pad, x0 + CELL - pad, y0 + CELL - pad],
                    fill=BLACK_STONE if cell == "B" else WHITE_STONE,
                    outline=(60, 56, 50),
                )

    for column in range(size):
        draw.text((left + column * CELL + CELL // 2 - 3, BOARD_TOP + board_px + 6), chr(ord("a") + column), font=label, fill=(120, 113, 100))
    for row in range(size):
        draw.text((left - 14, BOARD_TOP + row * CELL + CELL // 2 - 6), str(size - row), font=label, fill=(120, 113, 100))

    last_move = snapshot.get("lastMove")
    move_text = last_move.get("move") if isinstance(last_move, dict) else last_move
    footer = (
        f"final · {counts['B']} - {counts['W']}"
        if over
        else f"last {move_text or '-'} · {'black' if turn == 'B' else 'white'} to move"
    )
    draw.text((MARGIN, height - 26), footer, font=small, fill=(150, 140, 120))

    image.save(path, "JPEG", quality=72)
    return path
