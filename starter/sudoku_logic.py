import copy
import random

SIZE = 9
EMPTY = 0

random.seed()

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def find_empty(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                return row, col
    return None

def solve_board(board, limit=2):
    empty = find_empty(board)
    if not empty:
        return 1
    row, col = empty
    solutions = 0
    for candidate in range(1, SIZE + 1):
        if is_safe(board, row, col, candidate):
            board[row][col] = candidate
            solutions += solve_board(board, limit)
            board[row][col] = EMPTY
            if solutions >= limit:
                return solutions
    return solutions

def fill_board(board):
    empty = find_empty(board)
    if not empty:
        return True
    row, col = empty
    candidates = list(range(1, SIZE + 1))
    random.shuffle(candidates)
    for num in candidates:
        if is_safe(board, row, col, num):
            board[row][col] = num
            if fill_board(board):
                return True
            board[row][col] = EMPTY
    return False

def remove_cells(board, clues):
    target = SIZE * SIZE - clues
    positions = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(positions)
    removed = 0
    for row, col in positions:
        if removed >= target:
            break
        if board[row][col] == EMPTY:
            continue
        backup = board[row][col]
        board[row][col] = EMPTY
        board_copy = deep_copy(board)
        if solve_board(board_copy, limit=2) != 1:
            board[row][col] = backup
        else:
            removed += 1


def generate_puzzle(clues=35):
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution
