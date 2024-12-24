const board = document.querySelector("div.game-board");
// Pre-defined difficulty settings following Google's Minesweeper
const difficultySettings = {
    "Easy": { x: 10, y: 8, bombs: 10, size: 50, textSize: 38 },
    "Medium": { x: 18, y: 14, bombs: 40, size: 35, textSize: 25 },
    "Hard": { x: 24, y: 20, bombs: 99, size: 25, textSize: 17 }
};
// Variable initialization to pass difficulty settings to
let x;
let y;
let bombs;
let size;
let textSize;
// Selecting different parts of the game
let flagCount = document.querySelector("span#flag-count");
let timeDisplay = document.querySelector('span#time');
let difficultySelect = document.querySelector("select");
// Selected difficulty should hold the value of the select 
let selectedDifficulty;
// This variable is used so that flag placement is visually more appealing (by removing the flagged cells content) 
// and removing a flag can return original value (either a number or a bomb icon).
let previousInnerCellContent;
// Build the board with the default difficulty
difficultySelection();
difficultySelect.addEventListener("change", difficultySelection);
function difficultySelection() {
    // Reset game state controlling variables
    let gameOver = false;
    let started = false;
    // Re-select the select(since it has been changed) and its value
    difficultySelect = document.querySelector("select");
    selectedDifficulty = difficultySelect.value;
    // Assign variables according to the settings
    Object.entries(difficultySettings).forEach(([key, v]) => {
        if (key == selectedDifficulty) {
            [x, y, bombs, size, textSize] = [v.x, v.y, v.bombs, v.size, v.textSize];
        }
    });
    // Return the board to inital state: Empty Board, 000 Timer, 
    // Size according to the Difficulty, Flag count according to Bombs
    board.innerHTML = "";
    timeDisplay.innerText = "000";
    board.style.gridTemplateColumns = `repeat(${x}, ${size}px)`;
    board.style.gridTemplateRows = `repeat(${y}, ${size}px)`;
    flagCount.innerText = `${bombs}`;
    // Create cells on now an Empty Grid
    for (let _ = 0; _ < x * y; _++) {
        const div = document.createElement("div");
        div.className = "cell";
        board.appendChild(div);
    }
    // Select newly created cells
    const cells = document.querySelectorAll("div.cell");
    // Class names to create checkerboard pattern styling.
    let first = "evenish";
    let second = "oddish";
    cells.forEach((cell, i) => {
        // Assign proper class name if it's even or odd
        if (i % 2) {
            cell.className = `${second} ${i} cell hidden`;
        }
        else {
            cell.className = `${first} ${i} cell hidden`;
        }
        // This would normally display different colored stripes,
        // since we have a horizontally even sized grids, 
        // but we want a checkerboard pattern here
        // so the color repeats on grid wrap.
        if (x & 2 && (i + 1) % x == 0) {
            [first, second] = [second, first];
        }
        // This will contain all the indices that have been checked by the emptyCells() function
        // to avoid "maximum call stack exceeded" Errors
        let calledIndices = new Set();
        cell.addEventListener("mousedown", function (event) {
            // Don't do anything if the game's over
            if (gameOver)
                return;
            // Check which mouse button was clicked:
            // *event.button: 0 = Left, 1 = Middle, 2 = Right.
            if (event.button == 1) {
                // to count flagged cells
                let flaggedCellCount = 0;
                // find the indices of the neighbors 
                /*
                    [top left]      [top]       [top right]
                    [left]          {cell}      [right]
                    [bottom left]   [bottom]    [bottom right]
                */
                let neighborIndices = propagate(cells, i);
                // If the Neighbor is flagged, add to the counter
                neighborIndices.forEach((index) => {
                    if (cells[index].classList.contains("flagged")) {
                        flaggedCellCount++;
                    }
                });
                // If the number of Flagged cells matches the number of Bombs the cell is adjacent to
                // Then the game assumes you've done it correctly and tries to clear every neighboring cell (starting a chain)
                if (flaggedCellCount == +(cell.innerHTML)) {
                    emptyCells(cells, i, calledIndices);
                    return;
                }
                // If there's still bombs to discover around a number show which cells are unmarked 
                // by a flag, by adding a "hover" class with the same visual as the actual hover
                neighborIndices.forEach((index) => {
                    if (cells[index].classList.contains("hidden") && !cells[index].classList.contains("flagged")) {
                        cells[index].classList.add("hovered");
                    }
                });
            }
        });
        cell.addEventListener("mouseup", function (event) {
            // If game is already over, don't do anything
            if (gameOver)
                return;
            // Is the cell not Revealed?
            const containment = cell.classList.contains("hidden");
            // *Remainder event.button = 0 means the left button has been clicked
            if (event.button == 0) {
                // Handle a bomb click:
                // - Reveal all bombs.
                // - End the game and notify the player.
                if (this.classList.contains("bomb")) {
                    cells.forEach((cell) => {
                        if (cell.classList.contains("bomb")) {
                            cell.style.color = `black`;
                            clearInterval(timer);
                            gameOver = true;
                        }
                    });
                    // Alert the user and get out of the function
                    alert("Game Over. You Lost 😯");
                    return;
                    // TODO: !Game Over! screen with "_" as the current time; best time and try again button
                }
                // Start the timer only once, on the first cell reveal.
                // Prevents restarting the timer on subsequent cell clicks.
                if (!started)
                    startTimer();
                // is the cell NOT revealed?
                if (containment) {
                    // The game has started
                    started = true;
                    // Reveal the cell and its neighbors
                    cell.classList.remove("hidden");
                    if (cell.classList.contains("empty")) {
                        emptyCells(cells, i, calledIndices);
                    }
                }
            }
            // *Remainder event.button == 1, middle mouse button/scroll wheel click (click released in this case).
            else if (event.button == 1) {
                // Get the neighbors and clear the "hovered" class from the neighboring cells
                let neighborIndices = propagate(cells, i);
                neighborIndices.forEach((index) => {
                    cells[index].classList.remove("hovered");
                });
            }
            // *Remainder event.button == 2, right mouse button 
            else if (event.button == 2) {
                // If it's not revealed
                if (cell.classList.contains("hidden")) {
                    if (cell.classList.contains("flagged")) {
                        // If it's Flagged unflag it
                        cell.classList.remove("flagged");
                        // Change its innerHTML to what it was previously - a Number or a Bomb icon
                        cell.innerHTML = previousInnerCellContent;
                        // Increase the displayed flag count
                        flagCount.innerText = (+flagCount.innerText + 1).toString();
                    }
                    else {
                        // If it's not Flagged save what was previous innerHTML (if we want to unflag)
                        previousInnerCellContent = cell.innerHTML;
                        // Add the class for flagged
                        cell.classList.add("flagged");
                        // Change flag count and display the flag on the clicked cell
                        flagCount.innerText = (+flagCount.innerText - 1).toString();
                        cell.innerHTML = `<i class="fas fa-flag" style="font-size: ${textSize}px;"></i>`;
                    }
                }
            }
            // Get the hidden cells on each click to check the game state
            let hiddenElems = document.querySelectorAll("div.hidden");
            // Since clicking on a bomb would trigger game over
            // What's left to check is the win condition
            // Which would be true if only the bombs remain as hidden, non-revealed cells
            if (hiddenElems.length == bombs) {
                gameOver = true;
                alert("Game Over. You've Won!!!");
                // Game is over, user Alerted, Timer stopped
                clearInterval(timer);
                return;
                // TODO: game win screen with current time; best time and play again button
            }
        });
        // Disable default browser context menu to allow right-click for Flagging cells
        cell.addEventListener("contextmenu", function (event) {
            event.preventDefault();
        });
    });
    createBombs(cells);
    cells.forEach(el => {
        const count = el.innerText;
        // Count will tell us if the current cell has a number or not
        // *It will say a bombed cell is empty since <i> is not visible with .innerText)
        // Add appropriate class to keep count of the empty(or bombed) and numbered cells
        if (count == "")
            el.classList.add("empty");
        else {
            el.classList.add(`number-${count}`);
            el.style.fontSize = `${textSize}px`;
        }
    });
}
/**
 * Randomly place bombs around the board
 * Updates bomb cells with the bomb icon and calculates numbers for neighboring cells.
 *
 * @param cells - All the board cells
 *
 * TODO: ensure the bomb placement doesn't make the game impossible
 */
function createBombs(cells) {
    const bombsSet = new Set();
    // It contains all bomb indices and will try to create a new one until its length is reached
    while (bombsSet.size < bombs) {
        // Create the randomIndex depending on the board size 
        const randomIndex = Math.floor(Math.random() * (x * y));
        // and add in the bomb Set
        bombsSet.add(randomIndex);
        // Since a Set only allows distinct values it we can ignore checking repetition 
    }
    // Create bombs at the random chosen indices
    bombsSet.forEach((index) => {
        cells[index].classList.add("bomb");
        cells[index].innerHTML = `<i class="fas fa-bomb" style="font-size: ${textSize}px;"></i>`;
        createNumbers(cells, index);
        // To simplify number counting i would rather it check and create around the bombs
        // instead of doing it by checking the entire Board
    });
}
/**
 * Get valid neighboring cell indices around a given cell.
 * Filters out indices that are:
 * - Outside the grid boundaries (e.g., negative or too large).
 * - Incorrect neighbors due to wrapping (e.g., last cell of one row
 *   shouldn't connect to the first cell of the next).
 *
 * @param cells - All game board cells.
 * @param index - The index of the current cell.
 * @returns An array of valid neighbor indices.
 */
function propagate(cells, index) {
    let neighborIndices = [
        index + 1, // the Right neighbor index
        index - 1, // the Left neighbor index
        index - x, // the Upper neighbor index
        index + x, // the Lower neighbor index
        index - x - 1, // the Upper-Left neighbor index
        index - x + 1, // the Upper-Right neighbor index
        index + x - 1, // the Lower-Left neighbor index
        index + x + 1, // the Lower-Right neighbor index
    ];
    neighborIndices = neighborIndices.filter((neighborIndex) => {
        if (neighborIndex < 0 || neighborIndex >= x * y)
            return false;
        // If the cell is in the first collumn, 
        // the 3 left neighbors would be on the other side of the grid
        // and we don't want that to happen
        if (index % x == 0) {
            if (neighborIndex === index - x - 1 || // Upper-left
                neighborIndex === index - 1 || // Left
                neighborIndex === index + x - 1 // Lower-left
            ) {
                return false;
            }
        }
        // Similarly, If they're in the last column,
        // the Right indices would be in the first column
        if (index % x == x - 1) {
            if (neighborIndex === index - x + 1 || // Upper-right
                neighborIndex === index + 1 || // Right
                neighborIndex === index + x + 1 // Lower-right
            ) {
                return false;
            }
        }
        return true;
    });
    return neighborIndices;
}
/**
 * Create numbers around bombs
 *
 * For each bomb cell, this function calculates how many bombs are adjacent
 * and updates the text in the neighboring cells accordingly.
 * @param cells - All the board cells
 * @param index - The index of the bomb around which we're creating the numbers
 */
function createNumbers(cells, index) {
    let neighborIndices = propagate(cells, index);
    // First get the neighbors
    neighborIndices.forEach((neighborIndex) => {
        // If the neighbor is not a bomb increment the text
        if (!cells[neighborIndex].classList.contains("bomb")) {
            let counter = +(cells[neighborIndex].innerText);
            // Since .innerText returns a string, we need to convert it to a number.
            // You can use parseInt() or the unary + operator (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unary_plus).
            counter++;
            cells[neighborIndex].innerHTML = counter.toString();
        }
    });
}
/**
 * Recursive function to reveal empty cells
 * It will continue until it hits a number
 * creating an orthogonally connected region of empty cells
 *
 * @param cells - All the board cells
 * @param index - The index of the cell to start the reveal chain
 * @param calledIndices - A Set of indices on which the chain has passed through
 */
function emptyCells(cells, index, calledIndices) {
    // Get the neighbors again
    let neighborIndices = propagate(cells, index);
    neighborIndices.forEach(neighborIndex => {
        // Make sure the neighbor isn't bombed, isn't flagged and is empty
        const notBombed = !cells[neighborIndex].classList.contains("bomb");
        const notFlagged = !cells[neighborIndex].classList.contains("notFlagged");
        const empty = cells[neighborIndex].classList.contains("empty");
        // If the neighbor hasn't been calledIndices before, recursively reveal it and its neighbors
        if (calledIndices.has(neighborIndex))
            return;
        calledIndices.add(neighborIndex);
        if (notBombed && notFlagged) {
            // Don't recurse if we hit a non-empty, non-flagged and non-bombed neighbor (i.e. a numbered cell)
            cells[neighborIndex].classList.remove("hidden");
            if (empty) {
                // Recursively reveal the empty cells around the neighbor
                emptyCells(cells, neighborIndex, calledIndices);
            }
        }
    });
}
// Timer is needed to save setIntervals ID, necessary for clearInterval() function 
let timer;
// Initialize the seconds counter as 0
let timeElapsed = 0;
/**
 * Start a timer that increments each second
 * with a predetermined padding format(000)
 */
function startTimer() {
    timer = setInterval(() => {
        timeElapsed++;
        timeDisplay.innerText = timeElapsed.toString().padStart(3, "0");
    }, 1000);
}
