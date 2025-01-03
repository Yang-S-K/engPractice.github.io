
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
async function loadRecordsFromGitHub() {
    try {
        const response = await fetch("https://yang-s-k.github.io/engPractice.github.io/data/quizRecords.json");
        records = await response.json();
        console.log("成功載入紀錄：", records);
    } catch (error) {
        console.error("載入紀錄時發生錯誤:", error);
        alert("無法載入紀錄！");
    }
}

// 載入單字庫
async function loadWordBank() {
    try {
        const response = await fetch("wordbank.json");
        wordBank = await response.json();
        resetQuizState();
    } catch (error) {
        console.error("無法載入單字庫", error);
        document.getElementById("content").innerText = "無法載入單字庫，請確認檔案位置！";
    }
}
async function saveRecordsToGitHub(records) {
    const token = "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";
    const repoOwner = "Yang-S-K";
    const repoName = "engPractice.github.io";
    const filePath = "data/quizRecords.json";
    const commitMessage = "更新測驗紀錄";

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(records, null, 2))));

    try {
        const fileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        const headers = {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
        };

        let sha = null;
        try {
            const response = await fetch(fileUrl, { headers });
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
            } else if (response.status === 404) {
                console.warn("檔案不存在，將創建新檔案。");
            } else {
                const errorData = await response.json();
                console.error("無法取得檔案資訊：", errorData);
            }
        } catch (error) {
            console.warn("檔案檢查時發生錯誤：", error);
        }

        const response = await fetch(fileUrl, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                message: commitMessage,
                content,
                sha,
            }),
        });

        if (response.ok) {
            alert("紀錄已成功儲存到 GitHub！");
        } else {
            const errorData = await response.json();
            console.error("儲存失敗：", errorData);
            alert(`儲存失敗：${errorData.message}`);
        }
    } catch (error) {
        console.error("儲存時發生錯誤：", error);
        alert("無法儲存紀錄到 GitHub！");
    }
}



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
    if (inputLimit > wordBank.length) {
        alert(`題數不能超過資料庫的題數 (${wordBank.length})！`);
        return;
    }
    questionLimit = inputLimit;
    showPage("quiz");
    startQuiz();
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

// 測驗方向選擇
document.querySelectorAll(".direction-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".direction-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        quizDirection = btn.id === "direction-english-to-chinese" ? "英翻中" : "中翻英";
    });
});
document.getElementById("go-to-json-generator").addEventListener("click", () => {
    window.location.href = "json_generator.html"; // 替換為您的 JSON 生成器頁面的路徑
});
// 上傳單字庫
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
    }
});

function startQuiz() {
    const content = document.getElementById("content");
    content.innerHTML = "";

    const remainingWords = wordBank.filter(word => !word.seen);

    // 檢查是否已達到題目數限制或題庫用盡
    if (remainingWords.length === 0 || totalQuestions >= questionLimit) {
        endQuiz(); // 呼叫測驗結束函式
        return;
    }

    const randomIndex = Math.floor(Math.random() * remainingWords.length);
    const selectedWord = remainingWords[randomIndex];

    const question = document.createElement("h2");
    question.innerText = quizDirection === "英翻中" ? `請翻譯: ${selectedWord.word}` : `請翻譯: ${selectedWord.translation}`;

    const input = document.createElement("input");
    input.type = "text";
    input.id = "answer";
    input.autofocus = true;
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("submit-answer").click();
        }
    });

    const result = document.createElement("div");
    result.id = "result";

    const submit = document.createElement("button");
    submit.id = "submit-answer";
    submit.innerText = "提交";
    submit.addEventListener("click", () => {
        const userAnswer = input.value.trim();
        let correctAnswer = quizDirection === "英翻中" ? selectedWord.translation : selectedWord.word;

        const isCorrect = userAnswer === correctAnswer;
        if (isCorrect) {
            score++;
            result.innerText = "✅ 正確！";
        } else {
            result.innerText = `❌ 錯誤！正確答案是: ${correctAnswer}`;
        }

        currentAnswers.push({
            question: quizDirection === "英翻中" ? selectedWord.word : selectedWord.translation,
            userAnswer,
            correctAnswer,
            isCorrect,
        });

        totalQuestions++;
        selectedWord.seen = true;
        updateScoreboard();
        setTimeout(() => {
            startQuiz(); // 繼續下一題或結束
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
}

function endQuiz() {
    stopTotalTimer(); // 停止計時

    // 將本次測驗紀錄加入 records
    records[quizDirection].push({
        direction: quizDirection,
        score,
        totalQuestions,
        totalTime: totalTimer,
        answers: currentAnswers.slice(), // 深拷貝本次作答內容
    });

    // 顯示測驗結果
    const content = document.getElementById("content");
    content.innerHTML = `
        <h2>測驗結束！</h2>
        <p>你完成了 ${totalQuestions} / ${questionLimit === Infinity ? totalQuestions : questionLimit} 題</p>
        <p>總計時: ${totalTimer} 秒</p>
        <button id="restart-quiz">重新測驗</button>
    `;

    document.getElementById("restart-quiz").addEventListener("click", resetQuiz);

    // 呼叫儲存函式，儲存到 GitHub
    saveRecordsToGitHub(records);
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

    for (const direction in records) {
        const directionRecords = records[direction];
        const section = document.createElement("div");
        section.innerHTML = `<h3>${direction}</h3>`;
        const recordList = document.createElement("div");
        recordList.className = "record-list";

        if (directionRecords.length === 0) {
            section.innerHTML += "<p>目前沒有紀錄。</p>";
        } else {
            directionRecords.forEach((record, index) => {
                const item = document.createElement("div");
                item.className = "record-list-item";

                item.innerHTML = `
                    <span>#${index + 1}</span>
                    <span>得分: ${record.score}/${record.totalQuestions}</span>
                    <span>時間: ${record.totalTime} 秒</span>
                    <span>
                        <button class="view-details-btn" data-direction="${direction}" data-index="${index}">查看詳情</button>
                    </span>
                `;
                recordList.appendChild(item);
            });
        }

        section.appendChild(recordList);
        content.appendChild(section);
    }

    document.querySelectorAll(".view-details-btn").forEach(button => {
        button.addEventListener("click", event => {
            const direction = event.target.getAttribute("data-direction");
            const recordIndex = event.target.getAttribute("data-index");
            viewRecordDetails(direction, recordIndex);
        });
    });
}


function viewRecordDetails(direction, index) {
    const record = records[direction][index];
    const content = document.getElementById("record-content");

    content.innerHTML = `
        <h2>測驗詳情 (${direction})</h2>
        <p>完成時間: ${record.totalTime} 秒</p>
        <p>完成題數: ${record.totalQuestions}</p>
        <div class="record-list" id="record-detail-list"></div>
        <button id="back-to-records">返回紀錄列表</button>
    `;

    const detailList = document.getElementById("record-detail-list");
    record.answers.forEach((answer, idx) => {
        const detailItem = document.createElement("div");
        detailItem.className = "record-list-item";

        detailItem.innerHTML = `
            <span>題目 ${idx + 1}</span>
            <span>${answer.question}</span>
            <span>你的答案: ${answer.userAnswer}</span>
            <span>正確答案: ${answer.correctAnswer}</span>
            <span>${answer.isCorrect ? "✅" : "❌"}</span>
        `;
        detailList.appendChild(detailItem);
    });

    document.getElementById("back-to-records").addEventListener("click", viewRecords);
}


function viewWords() {
    const content = document.getElementById("word-bank-content");
    content.innerHTML = "<h2>單字庫</h2>";

    const wordList = document.createElement("div");
    wordList.className = "word-list";
    wordList.id = "paginated-word-list";

    const wordsPerPage = 10; // 每頁顯示 10 個單字
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

// 測驗結束後的紀錄更新與儲存
function saveRecordAfterQuiz() {
    records.push({
        direction: quizDirection,
        score,
        totalQuestions,
        totalTime: totalTimer,
        answers: currentAnswers.slice(), // 深拷貝
    });

    saveRecordsToGitHub(records); // 自動儲存到 GitHub
}


loadWordBank();
