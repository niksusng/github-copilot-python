from flask import Flask, render_template, jsonify, request
import random
import sudoku_logic

app = Flask(__name__)

CURRENT = {
    'puzzle': None,
    'solution': None
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    clues = int(request.args.get('clues', 35))
    puzzle, solution = sudoku_logic.generate_puzzle(clues)
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({'puzzle': puzzle})

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.json
    board = data.get('board')
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    if not isinstance(board, list) or len(board) != sudoku_logic.SIZE:
        return jsonify({'error': 'Invalid board data'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if not isinstance(board[i][j], int):
                continue
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})

@app.route('/hint', methods=['POST'])
def hint():
    data = request.json
    board = data.get('board')
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    if not isinstance(board, list) or len(board) != sudoku_logic.SIZE:
        return jsonify({'error': 'Invalid board data'}), 400

    empty_cells = [
        (i, j)
        for i in range(sudoku_logic.SIZE)
        for j in range(sudoku_logic.SIZE)
        if board[i][j] == 0
    ]
    wrong_cells = [
        (i, j)
        for i in range(sudoku_logic.SIZE)
        for j in range(sudoku_logic.SIZE)
        if isinstance(board[i][j], int) and board[i][j] != 0 and board[i][j] != solution[i][j]
    ]

    candidates = empty_cells or wrong_cells
    if not candidates:
        return jsonify({'error': 'No hints available'}), 400

    row, col = random.choice(candidates)
    return jsonify({'row': row, 'col': col, 'value': solution[row][col]})

if __name__ == '__main__':
    app.run(debug=True)
