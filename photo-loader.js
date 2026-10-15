
(function () {

    fetch("works.csv")
        .then(function (response) {
            if (!response.ok) {
                throw new Error("CSVを読み込めません");
            }
            return response.text();
        })

        .then(function (text) {

            // CSVを読み込む
            const lines = text
                .replace(/^\uFEFF/, "")
                .trim()
                .split(/\r?\n/);

            const headers = lines.shift()
                .split(",")
                .map(function (h) {
                    return h.trim();
                });

            const works = lines
                .filter(function (line) {
                    return line.trim() !== "";
                })
                .map(function (line) {

                    const values = line.split(",");
                    const work = {};

                    headers.forEach(function (header, i) {
                        work[header] =
                            (values[i] || "").trim();
                    });

                    return work;
                });

            // --------------------------
            // TRAVEL
            // --------------------------

            if (document.getElementById("city-buttons")) {

                Object.keys(places).forEach(function (id) {

                    places[id].photos = works
                        .filter(function (work) {
                            return work.section === "travel-" + id;
                        })
                        .map(function (work) {
                            return {
                                src: work.image,
                                caption: work.title
                            };
                        });

                });

                // 現在選ばれている都市を再表示
                const activePin =
                    document.querySelector(".pin.active");

                const currentPlace = activePin
                    ? activePin.dataset.place
                    : "losangeles";

                selectPlace(currentPlace);
            }

            // --------------------------
            // MUSIC
            // --------------------------

            const musicPhoto =
                document.getElementById("music-hero-photo");

            if (musicPhoto) {

                const photo = works.find(function (work) {
                    return work.section === "music-hero";
                });

                if (photo) {
                    musicPhoto.src = photo.image;
                }
            }

        })

        .catch(function (error) {
            console.error("写真の読み込みエラー:", error);
        });

})();
