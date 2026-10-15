
// HTMLファイルを直接開いた場合の予備データ
var fallbackWorks = [
    {
        title: "Travel",
        description: "街中の写真",
        image: "./media/A9B8D6ED-F4EF-4DC8-96EC-4571CC794BEE.JPG",
        link: "travel.html",
        category: "Travel",
        year: ""
    },
    {
        title: "Music",
        description: "ライブ中の写真",
        image: "./media/EFCD936C-0914-4EEE-ACCA-CD9B330C1D82.JPG",
        link: "music.html",
        category: "Music",
        year: ""
    },
    {
        title: "Photography",
        description: "サンタモニカの写真",
        image: "./media/DSCN6131.JPG",
        link: "photography.html",
        category: "Photography",
        year: ""
    }
];

function setupWorks(works) {

    // Worksを表示する場所
    var grid = document.getElementById("works-grid");

    var categorySelect = document.getElementById("category");

    var sortSelect = document.getElementById("sort");

    var categories = [];

    works.forEach(function(work) {
        if (!categories.includes(work.category)) {
            categories.push(work.category);
        }
    });

    categories.forEach(function(category) {
        var option = document.createElement("option");
        option.value = category;
        option.textContent = ({
            "旅行": "Travel",
            "音楽": "Music",
            "写真": "Photography"
        })[category] || category;
        categorySelect.appendChild(option);
    });

    function displayWorks() {

        var selectedCategory = categorySelect.value;

        var sortType = sortSelect.value;

        var filteredWorks = works.slice();

        if (selectedCategory !== "all") {
            filteredWorks = filteredWorks.filter(function(work) {
                return work.category === selectedCategory;
            });
        }

        if (sortType === "new") {
            filteredWorks.sort(function(a, b) {
                return Number(b.year) - Number(a.year);
            });
        }
        else if (sortType === "old") {
            filteredWorks.sort(function(a, b) {
                return Number(a.year) - Number(b.year);
            });
        }
        else if (sortType === "title") {
            filteredWorks.sort(function(a, b) {
                return a.title.localeCompare(b.title, "ja");
            });
        }

        grid.innerHTML = "";

        // 作品を1つずつ表示
        filteredWorks.forEach(function(work) {

            var card = document.createElement("article");

            card.className = "work-card";

            card.innerHTML =
                '<a href="' + work.link + '">' +
                    '<img src="' + work.image + '" alt="' + work.description + '">' +
                    '<h4>' + work.title + '</h4>' +
                '</a>';

            grid.appendChild(card);
        });

        // カードを複製して無限ループさせる
if (filteredWorks.length > 1) {
    const cards = Array.from(grid.children);

    cards.forEach(function(card) {
        const copy = card.cloneNode(true);

        copy.setAttribute("aria-hidden", "true");

        copy.querySelectorAll("a").forEach(function(link) {
            link.tabIndex = -1;
        });

        grid.appendChild(copy);
    });
}

grid.classList.toggle(
    "is-scrolling",
    filteredWorks.length > 1
);
    }

    displayWorks();

    categorySelect.addEventListener("change", displayWorks);

    sortSelect.addEventListener("change", displayWorks);
}

// 元のCSV読込処理
fetch("works.csv")
    .then(function(response) {
        if (!response.ok) {
            throw new Error("CSVを読み込めませんでした");
        }
        return response.text();
    })
    .then(function(data) {

        // CSVを行ごとに分割
        var rows = data.trim().split(/\r?\n/);

        // 1行目は見出し
        var headers = rows[0].split(",");

        // 2行目以降は作品データにする
        var works = rows.slice(1).map(function(row) {

            var values = row.split(",");

            var work = {};

            headers.forEach(function(header, index) {
                work[header.trim()] = (values[index] || "").trim();
            });

            return work;

        }).filter(function(work) {
            return work.title && work.image && work.link;
        });

        setupWorks(works.length ? works : fallbackWorks);
    })
    .catch(function() {
        setupWorks(fallbackWorks);
    });