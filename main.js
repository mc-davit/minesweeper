// Easy Mode 10x8 - 10 Bombs - flag size-12
// Medium mode 18x14 - 40 Bombs - flag size-10
// Hard Mode 24x20 - 99 Bombs - flag size-8
const board = document.querySelector("div.game-board");
const difficulties = {
    "Easy": { x: 10, y: 8, bombs: 10, size: 50, flagSize: 38 },
    "Medium": { x: 18, y: 14, bombs: 40, size: 35, flagSize: 25 },
    "Hard": { x: 24, y: 20, bombs: 99, size: 25, flagSize: 17 }
};
let x;
let y;
let bombs;
let size;
let flagSize;
let flagCount = document.querySelector("span#flag-count");
let timeDisplay = document.querySelector('span#time');
let difficultySelect = document.querySelector("select");
let selectedDifficulty;
let previousInner;
difficultySelection();
difficultySelect.addEventListener("change", difficultySelection);
function difficultySelection() {
    let gameOver = false;
    let started = false;
    selectedDifficulty = document.querySelector("select").value;
    for (let key in difficulties) {
        if (key == selectedDifficulty) {
            ({ x, y, bombs, size, flagSize } = difficulties[key]);
        }
    }
    board.innerHTML = "";
    timeDisplay.innerText = "000";
    board.style.gridTemplateColumns = `repeat(${x}, ${size}px)`;
    board.style.gridTemplateRows = `repeat(${y}, ${size}px)`;
    flagCount.innerText = `${bombs}`;
    for (let _ = 0; _ < x * y; _++) {
        const div = document.createElement("div");
        div.className = "cell";
        board.appendChild(div);
    }
    const cells = document.querySelectorAll("div.cell");
    let first = "evenish cell";
    let second = "oddish cell";
    cells.forEach((cell, i) => {
        if (i % 2) {
            cell.className = `${second} ${i} hidden`;
        }
        else {
            cell.className = `${first} ${i} hidden`;
        }
        if ((i + 1) % x == 0) {
            [first, second] = [second, first];
        }
        let called = [];
        cell.addEventListener("mousedown", function (event) {
            if (gameOver)
                return;
            if (event.button == 1) {
                let flaggedCounter = 0;
                let neighborIndices = propagate(cells, i);
                neighborIndices.forEach((index) => {
                    if (cells[index].classList.contains("flagged")) {
                        flaggedCounter++;
                    }
                });
                if (flaggedCounter == +(cell.innerHTML)) {
                    emptyCells(cells, i, called);
                    return;
                }
                neighborIndices.forEach((index) => {
                    if (cells[index].classList.contains("hidden") && !cells[index].classList.contains("flagged")) {
                        cells[index].classList.add("hovered");
                    }
                });
            }
        });
        cell.addEventListener("mouseup", function (event) {
            if (gameOver)
                return;
            const containment = cell.classList.contains("hidden");
            if (event.button == 0) {
                if (this.classList.contains("bomb")) {
                    cells.forEach((cell) => {
                        if (cell.classList.contains("bomb")) {
                            cell.style.color = `black`;
                            stopTimer();
                            gameOver = true;
                        }
                    });
                    return;
                }
                if (!started)
                    startTimer();
                if (containment) {
                    started = true;
                    cell.classList.remove("hidden");
                    if (cell.classList.contains("empty")) {
                        emptyCells(cells, i, called);
                    }
                }
            }
            else if (event.button == 1) {
                let neighborIndices = propagate(cells, i);
                neighborIndices.forEach((index) => {
                    cells[index].classList.remove("hovered");
                });
            }
            else if (event.button == 2) {
                if (cell.classList.contains("hidden")) {
                    if (cell.classList.contains("flagged")) {
                        cell.classList.remove("flagged");
                        cell.innerHTML = previousInner;
                        flagCount.innerText = (+flagCount.innerText + 1).toString();
                    }
                    else {
                        previousInner = cell.innerHTML;
                        cell.classList.add("flagged");
                        flagCount.innerText = (+flagCount.innerText - 1).toString();
                        cell.innerHTML = `<i class="fas fa-flag" style="font-size: ${flagSize}px;"></i>`;
                    }
                }
            }
            let hiddenElems = document.querySelectorAll("div.hidden");
            if (hiddenElems.length == bombs) {
                gameOver = true;
                stopTimer();
            }
        });
        cell.addEventListener("contextmenu", function (event) {
            event.preventDefault();
        });
    });
    createBombs(cells);
    cells.forEach(el => {
        const count = el.innerText;
        if (count == "")
            el.classList.add("empty");
        else {
            el.classList.add(`number-${count}`);
            el.style.fontSize = `${flagSize}px`;
        }
    });
}
function createBombs(cells) {
    const bombsArr = [];
    while (bombsArr.length < bombs) {
        const randomIndex = Math.floor(Math.random() * (x * y));
        if (!bombsArr.includes(randomIndex)) {
            bombsArr.push(randomIndex);
        }
    }
    bombsArr.forEach((index) => {
        cells[index].classList.add("bomb");
        cells[index].innerHTML = `<i class="fas fa-bomb" style="font-size: ${flagSize}px;"></i>`;
        createNumbers(cells, index);
    });
}
function propagate(cells, index) {
    let neighborIndices = [
        index + 1, // the right neighbor index
        index - 1, // the left neighbor index
        index - x, // the upper neighbor index
        index + x, // the lower neighbor index
        index - x - 1, // the upper-left neighbor index
        index - x + 1, // the upper-right neighbor index
        index + x - 1, // the lower-left neighbor index
        index + x + 1, // the lower-right neighbor index
    ];
    neighborIndices = neighborIndices.filter((neighborIndex) => {
        if (neighborIndex < 0 || neighborIndex >= x * y)
            return false;
        if (index % x == 0) {
            if (neighborIndex === index - x - 1 || // Upper-left
                neighborIndex === index - 1 || // Left
                neighborIndex === index + x - 1 // Lower-left
            ) {
                return false;
            }
        }
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
function createNumbers(cells, index) {
    let neighborIndices = propagate(cells, index);
    neighborIndices.forEach((neighborIndex) => {
        if (!cells[neighborIndex].classList.contains("bomb")) {
            let counter = +(cells[neighborIndex].innerText);
            counter++;
            cells[neighborIndex].innerHTML = counter.toString();
        }
    });
}
function emptyCells(cells, index, called) {
    let neighborIndices = propagate(cells, index);
    neighborIndices.forEach(neighborIndex => {
        const bombed = cells[neighborIndex].classList.contains("bomb");
        const flagged = cells[neighborIndex].classList.contains("flagged");
        const empty = cells[neighborIndex].classList.contains("empty");
        if (called.indexOf(neighborIndex) != -1)
            return;
        called.push(neighborIndex);
        if (!bombed && !flagged) {
            cells[neighborIndex].classList.remove("hidden");
            if (empty) {
                emptyCells(cells, neighborIndex, called);
            }
        }
    });
}
let timer;
let timeElapsed = 0;
function startTimer() {
    timer = setInterval(() => {
        timeElapsed++;
        timeDisplay.innerText = timeElapsed.toString().padStart(3, "0");
    }, 1000);
}
function stopTimer() {
    clearInterval(timer);
}
