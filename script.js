
let wordBank = [];
let score = 0;
let totalQuestions = 0;
let quizDirection = "英翻中"; // 預設測驗方向
let totalTimer = 0;
let totalTimerInterval = null;
let records = {
    "英翻中": [],
    "中翻英": []
};
let currentAnswers = []; // 用來記錄本次測驗的作答內容
let questionLimit = Infinity; // 默認為不限題數

// 載入單字庫
async function loadWordBank() {
    try {
        const response = await fetch("final.json");
        if (!response.ok) throw new Error("檔案載入失敗");
        wordBank = await response.json();
        console.log("預設單字庫已載入：", wordBank);
        if (wordBank.length === 0) {
            alert("預設單字庫為空，請確認檔案內容！");
        }
        resetQuizState();
    } catch (error) {
        console.error("無法載入預設單字庫", error);
        alert("無法載入預設單字庫，請確認 final.json 是否存在！");
    }
}

// 上傳單字庫事件
document.getElementById("upload-database").addEventListener("change", event => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const uploadedData = JSON.parse(reader.result);
                if (Array.isArray(uploadedData) && uploadedData.every(item => "word" in item && "translation" in item)) {
                    wordBank = uploadedData.map(item => ({ ...item, seen: false }));
                    alert("單字庫上傳成功！");
                } else {
                    alert("上傳的檔案格式不正確！");
                }
            } catch (error) {
                alert("無法解析上傳的檔案，請確保格式正確！");
            }
        };
        reader.readAsText(file);
    } else {
        alert("未選擇檔案，將載入預設單字庫。");
        loadWordBank();
    }
});



let quizType = "fill-in-the-blank"; // 預設為填空題

// 題型切換按鈕邏輯
document.querySelectorAll(".quiz-type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".quiz-type-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        quizType = btn.id === "quiz-type-fill" ? "fill-in-the-blank" : "multiple-choice";
    });
});

// 預設選中填空題按鈕
document.getElementById("quiz-type-fill").classList.add("selected");
// 換頁邏輯
function showPage(page) {
    document.getElementById("home-page").style.display = page === "home" ? "block" : "none";
    document.getElementById("quiz-page").style.display = page === "quiz" ? "block" : "none";
    document.getElementById("record-page").style.display = page === "record" ? "block" : "none";
    document.getElementById("word-bank-page").style.display = page === "word-bank" ? "block" : "none";
    if (page === "quiz") startTotalTimer();
    else stopTotalTimer();
}

// 整個測驗的計時器
function startTotalTimer() {
    totalTimer = 0;
    document.getElementById("total-timer").innerText = `總計時: 0 秒`;
    totalTimerInterval = setInterval(() => {
        totalTimer++;
        document.getElementById("total-timer").innerText = `總計時: ${totalTimer} 秒`;
    }, 1000);
}

function stopTotalTimer() {
    clearInterval(totalTimerInterval);
    totalTimerInterval = null;
}

// 初始化程式
document.getElementById("start-quiz").addEventListener("click", () => {
    const questionInput = document.getElementById("question-limit");
    const inputLimit = questionInput.value ? parseInt(questionInput.value, 10) : wordBank.length;

    if (isNaN(inputLimit) || inputLimit <= 0 || inputLimit > wordBank.length) {
        alert(`請輸入有效的題數（最多 ${wordBank.length} 題）！`);
        return;
    }

    questionLimit = inputLimit;
    showPage("quiz");

    if (quizType === "multiple-choice") {
        startQuizMultipleChoice();
    } else if (quizType === "fill-in-the-blank") {
        startQuizFillInTheBlank();
    } else {
        alert("無效的測驗類型！");
    }
});
document.getElementById("go-to-json-generator").addEventListener("click", () => {
    window.location.href = "json_generator.html"; // 替換為您的 JSON 生成器頁面的路徑
});


document.getElementById("back-to-home").addEventListener("click", () => {
    resetQuizState();
    showPage("home");
});
document.getElementById("back-to-home-from-record").addEventListener("click", () => showPage("home"));
document.getElementById("back-to-home-from-word-bank").addEventListener("click", () => showPage("home"));
document.getElementById("view-words-home").addEventListener("click", () => {
    showPage("word-bank");
    viewWords();
});
document.getElementById("view-records-home").addEventListener("click", () => {
    showPage("record");
    viewRecords();
});

// 初始化方向按鈕
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("direction-english-to-chinese").classList.add("selected");
    document.getElementById("quiz-type-fill").classList.add("selected");
    loadWordBank(); // 頁面載入時自動載入預設單字庫
});

// 測驗方向選擇按鈕事件
document.querySelectorAll(".direction-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".direction-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        quizDirection = btn.id === "direction-english-to-chinese" ? "英翻中" : "中翻英";
    });
});


function startQuizMultipleChoice() {
    const content = document.getElementById("content");
    content.innerHTML = "";

    const remainingWords = wordBank.filter(word => !word.seen);

    if (remainingWords.length === 0 || totalQuestions >= questionLimit) {
        showQuizEnd(content);
        return;
    }

    const randomIndex = Math.floor(Math.random() * remainingWords.length);
    const selectedWord = remainingWords[randomIndex];

    const question = document.createElement("h2");
    question.innerText = quizDirection === "英翻中" ? `請翻譯: ${selectedWord.word}` : `請翻譯: ${selectedWord.translation}`;

    const choices = generateChoices(selectedWord);
    const optionsContainer = document.createElement("div");
    optionsContainer.id = "options-container";

    choices.forEach(choice => {
        const button = document.createElement("button");
        button.className = "choice-btn";
        button.innerText = quizDirection === "英翻中" ? choice.translation : choice.word;
        button.addEventListener("click", () => handleChoice(selectedWord, choice));
        optionsContainer.appendChild(button);
    });

    const scoreboard = document.createElement("div");
    scoreboard.id = "scoreboard";
    updateScoreboard(scoreboard);

    content.appendChild(scoreboard);
    content.appendChild(question);
    content.appendChild(optionsContainer);
}

function startQuiz() {
    if (quizType === "multiple-choice") {
        startQuizMultipleChoice();
    } else {
        startQuizFillInTheBlank();
    }
}
function startQuizFillInTheBlank() {
    const content = document.getElementById("content");
    content.innerHTML = "";

    const remainingWords = wordBank.filter(word => !word.seen);

    if (remainingWords.length === 0 || totalQuestions >= questionLimit) {
        showQuizEnd(content);
        return;
    }

    const randomIndex = Math.floor(Math.random() * remainingWords.length);
    const selectedWord = remainingWords[randomIndex];

    const question = document.createElement("h2");
    question.innerText = quizDirection === "英翻中" ? `請翻譯: ${selectedWord.word}` : `請翻譯: ${selectedWord.translation}`;

    const input = document.createElement("input");
    input.type = "text";
    input.id = "answer";

    const result = document.createElement("div");
    result.id = "result";

    const submit = document.createElement("button");
    submit.id = "submit-answer";
    submit.innerText = "提交";

    // 按下 Enter 提交答案
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            submit.click();
        }
    });

    submit.addEventListener("click", () => {
        const userAnswer = input.value.trim();
        const correctAnswer = quizDirection === "英翻中" ? selectedWord.translation : selectedWord.word;

        const isCorrect = userAnswer === correctAnswer;
        result.innerText = isCorrect ? "✅ 正確！" : `❌ 錯誤！正確答案是: ${correctAnswer}`;

        selectedWord.seen = true;
        currentAnswers.push({
            question: quizDirection === "英翻中" ? selectedWord.word : selectedWord.translation,
            userAnswer,
            correctAnswer,
            isCorrect,
        });

        totalQuestions++;
        if (isCorrect) score++;

        updateScoreboard();
        setTimeout(() => {
            startQuizFillInTheBlank();
        }, 1000);
    });

    const scoreboard = document.createElement("div");
    scoreboard.id = "scoreboard";
    updateScoreboard(scoreboard);

    content.appendChild(scoreboard);
    content.appendChild(question);
    content.appendChild(input);
    content.appendChild(submit);
    content.appendChild(result);

    // 確保焦點設定
    setTimeout(() => {
        input.focus();
    }, 0);
}

function showQuizEnd(content) {
    stopTotalTimer();

    records[quizDirection].push({
        direction: quizDirection,
        quizType, // 題型：填空或選擇
        score,
        totalQuestions,
        totalTime: totalTimer,
        answers: currentAnswers.slice(),
    });

    content.innerHTML = `
        <h2>測驗結束！</h2>
        <p>得分: ${score} / ${totalQuestions}</p>
        <p>總計時: ${totalTimer} 秒</p>
        <button id="restart-quiz">重新測驗</button>
    `;

    document.getElementById("restart-quiz").addEventListener("click", resetQuiz);
}


function generateChoices(correctWord) {
    const choices = [correctWord];
    const remainingWords = wordBank.filter(word => word !== correctWord);

    while (choices.length < 4 && remainingWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * remainingWords.length);
        const randomWord = remainingWords.splice(randomIndex, 1)[0];
        choices.push(randomWord);
    }

    return choices.sort(() => Math.random() - 0.5); // 隨機打亂選項
}
function handleChoice(correctWord, selectedChoice) {
    const result = document.createElement("div");
    result.id = "result";

    const correctAnswer = quizDirection === "英翻中" ? correctWord.translation : correctWord.word;
    const userAnswer = quizDirection === "英翻中" ? selectedChoice.translation : selectedChoice.word;

    const isCorrect = userAnswer === correctAnswer;
    result.innerText = isCorrect ? "✅ 正確！" : `❌ 錯誤！正確答案是: ${correctAnswer}`;

    currentAnswers.push({
        question: quizDirection === "英翻中" ? correctWord.word : correctWord.translation,
        userAnswer,
        correctAnswer,
        isCorrect,
    });

    if (isCorrect) score++;
    totalQuestions++;
    correctWord.seen = true;

    updateScoreboard();
    document.getElementById("content").appendChild(result);

    setTimeout(() => {
        startQuizMultipleChoice();
    }, 1000);
}



function resetQuiz() {
    wordBank.forEach(word => (word.seen = false));
    score = 0;
    totalQuestions = 0;
    currentAnswers = [];
    showPage("quiz");
    startQuiz();
}

function resetQuizState() {
    wordBank.forEach(word => (word.seen = false));
    score = 0;
    totalQuestions = 0;
    currentAnswers = [];
    stopTotalTimer();
}

function updateScoreboard(scoreboardElement = document.getElementById("scoreboard")) {
    if (scoreboardElement) {
        scoreboardElement.innerHTML = `已完成: ${totalQuestions} / ${questionLimit === Infinity ? wordBank.length : questionLimit}`;
    }
}

function viewRecords() {
    const content = document.getElementById("record-content");
    content.innerHTML = "<h2>測驗紀錄</h2>";

    const recordsPerPage = 5; // 每頁顯示 5 條紀錄
    let currentPage = 1;

    function renderPage(page) {
        currentPage = page; // 更新當前頁面
        const start = (page - 1) * recordsPerPage;
        const end = start + recordsPerPage;

        content.innerHTML = "<h2>測驗紀錄</h2>";

        const section = document.createElement("div");
        section.className = "record-list";

        for (const direction in records) {
            const directionRecords = records[direction].slice(start, end);
            directionRecords.forEach((record, index) => {
                const item = document.createElement("div");
                item.className = "record-list-item";
                item.innerHTML = `
                    <span>#${start + index + 1}</span>
                    <span>題型: ${record.quizType === "multiple-choice" ? "選擇題" : "填空題"}</span>
                    <span>得分: ${record.score}/${record.totalQuestions}</span>
                    <span>時間: ${record.totalTime} 秒</span>
                    <button class="view-details-btn" data-direction="${direction}" data-index="${start + index}">查看詳情</button>
                `;
                section.appendChild(item);
            });
        }

        content.appendChild(section);

        const totalPages = Math.ceil(Object.values(records).flat().length / recordsPerPage);
        const pagination = renderPagination(currentPage, totalPages, renderPage);
        content.appendChild(pagination);

        document.querySelectorAll(".view-details-btn").forEach(button => {
            button.addEventListener("click", (event) => {
                const direction = event.target.getAttribute("data-direction");
                const recordIndex = event.target.getAttribute("data-index");
                viewRecordDetails(direction, recordIndex);
            });
        });
    }

    renderPage(currentPage);
}


function renderPagination(currentPage, totalPages, onPageChange) {
    const paginationContainer = document.createElement("div");
    paginationContainer.id = "pagination";

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement("button");
        pageButton.innerText = i;
        pageButton.className = i === currentPage ? "current-page" : "";
        pageButton.addEventListener("click", () => {
            onPageChange(i); // 切換頁面
        });
        paginationContainer.appendChild(pageButton);
    }

    return paginationContainer;
}

function viewRecordDetails(direction, index) {
    const record = records[direction][index];
    const content = document.getElementById("record-content");

    const detailsPerPage = 5; // 每頁顯示 5 條詳情
    let currentPage = 1;

    function renderDetailsPage(page) {
        currentPage = page; // 更新當前頁面
        const start = (page - 1) * detailsPerPage;
        const end = start + detailsPerPage;
        const paginatedAnswers = record.answers.slice(start, end);

        content.innerHTML = `
            <h2>測驗詳情 (${direction})</h2>
            <p>完成時間: ${record.totalTime} 秒</p>
            <p>完成題數: ${record.totalQuestions}</p>
            <div class="record-list" id="record-detail-list"></div>
            <button id="back-to-records">返回紀錄列表</button>
        `;

        const detailList = document.getElementById("record-detail-list");
        paginatedAnswers.forEach((answer, idx) => {
            const detailItem = document.createElement("div");
            detailItem.className = "record-list-item";
            detailItem.innerHTML = `
                <span>題目 ${start + idx + 1}</span>
                <span>${answer.question}</span>
                <span>你的答案: ${answer.userAnswer}</span>
                <span>正確答案: ${answer.correctAnswer}</span>
                <span>${answer.isCorrect ? "✅" : "❌"}</span>
            `;
            detailList.appendChild(detailItem);
        });

        const totalPages = Math.ceil(record.answers.length / detailsPerPage);
        const pagination = renderPagination(currentPage, totalPages, renderDetailsPage);
        content.appendChild(pagination);

        document.getElementById("back-to-records").addEventListener("click", viewRecords);
    }

    renderDetailsPage(currentPage);
}



function viewWords() {
    const content = document.getElementById("word-bank-content");
    content.innerHTML = "<h2>單字庫</h2>";

    const wordList = document.createElement("div");
    wordList.className = "word-list";
    wordList.id = "paginated-word-list";

    const wordsPerPage = 5; // 每頁顯示 5 個單字
    let currentPage = 1;

    // 渲染特定頁面
    function renderPage(page) {
        wordList.innerHTML = ""; // 清空現有內容
        const start = (page - 1) * wordsPerPage;
        const end = start + wordsPerPage;
        const pageWords = wordBank.slice(start, end);

        pageWords.forEach(({ word, translation, seen }) => {
            const item = document.createElement("div");
            item.className = "word-list-item";
            item.innerHTML = `
                <span>${word}</span>
                <span>${translation}</span>
                <span>${seen ? "(已出現)" : ""}</span>
            `;
            wordList.appendChild(item);
        });

        updatePagination(page);
    }

    // 更新分頁按鈕
    function updatePagination(page) {
        let pagination = document.getElementById("pagination");
        if (!pagination) {
            pagination = document.createElement("div");
            pagination.id = "pagination";
            content.appendChild(pagination);
        }
        pagination.innerHTML = ""; // 清空按鈕

        const totalPages = Math.ceil(wordBank.length / wordsPerPage);

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement("button");
            pageButton.innerText = i;
            pageButton.className = i === page ? "current-page" : "";
            pageButton.addEventListener("click", () => {
                currentPage = i;
                renderPage(i);
            });
            pagination.appendChild(pageButton);
        }
    }

    content.appendChild(wordList);
    renderPage(currentPage);
}



loadWordBank();
