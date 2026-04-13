(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZmQ4MTIyNjVlZTg0Njc2OGYzMGIwNWNhODFhNTcyNSIsIm5iZiI6MTc3NDg1NTQyNC4wNDksInN1YiI6IjY5Y2EyNTAwYTBhMDliNDkzYTgzOTU0MyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.u9DE4rHEAg1KJaPOEujViD_kagQYiKSiEHZm6V3t5YQ";
const options = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`
  }
};
const BASE_URL = "https://api.themoviedb.org/3";
const fetchAPI = async (req) => {
  const url = new URL(BASE_URL + req.path);
  if (req.params.query) {
    url.searchParams.append("query", req.params.query);
  }
  url.searchParams.append("page", String(req.params.page));
  url.searchParams.append("region", "ko-KR");
  url.searchParams.append("language", "ko");
  const response = await fetch(url.toString(), options);
  if (!response.ok) {
    throw new Error("영화 데이터를 불러오는 데 실패했습니다.");
  }
  const data = await response.json();
  return data;
};
const fetchSearchMovies = (query, page = 1) => {
  return fetchAPI({
    path: "/search/movie",
    params: { query, page }
  });
};
const fetchPopularMovies = (page = 1) => {
  return fetchAPI({
    path: "/movie/popular",
    params: { page }
  });
};
const fetchMovieDetail = async (movieId) => {
  const url = new URL(`${BASE_URL}/movie/${movieId}`);
  url.searchParams.append("region", "ko-KR");
  url.searchParams.append("language", "ko");
  const response = await fetch(url.toString(), options);
  if (!response.ok) {
    throw new Error("영화 데이터를 불러오는 데 실패했습니다.");
  }
  const data = await response.json();
  return data;
};
const renderSkeleton = ($target) => {
  $target.insertAdjacentHTML("beforeend", createSkeletonHTML());
};
const removeSkeleton = ($target) => {
  $target.querySelectorAll(".skeleton-item").forEach((node) => {
    node.remove();
  });
};
const createSkeletonHTML = () => {
  const skelHTML = (
    /* html */
    `
    <li class="skeleton-item">
      <div class="item">
        <div class="thumbnail skeleton skeleton-thumbnail"></div>
        <div class="item-desc">
          <div class="skeleton skeleton-text" style="width: 40%;"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>
    </li>`
  );
  return skelHTML.repeat(20);
};
const renderMovieList = ($target, movies) => {
  const dataHTML = movies.map(renderMovieItem).join("");
  $target.insertAdjacentHTML("beforeend", dataHTML);
};
const renderMovieItem = (data) => {
  const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : "./images/woowacourse_logo.png";
  return (
    /* html */
    `
      <li class="movie-item" data-id="${data.id}">
        <div class="item">
          <img class="thumbnail" src="${posterUrl}" alt="${data.title}" />
          <div class="item-desc">
            <p class="rate">
              <img src="./images/star_filled.png" class="star" alt="별점" />
              <span>${data.vote_average.toFixed(1)}</span>
            </p>
            <strong>${data.title}</strong>
          </div>
        </div>
      </li>
    `
  );
};
const renderEmptyState = ($target, query) => {
  $target.innerHTML = renderEmptyPage(query);
};
const renderEmptyPage = (query) => {
  return (
    /* html */
    `
      <div class = "empty-result">
        <img src="./images/empty.png" alt="검색 결과가 없습니다." class="empty-image" />
        <p>"${query}" 검색 결과가 없습니다.</p>
      </div>`
  );
};
const updateHeroBanner = (movie) => {
  const $bg = document.querySelector(".background-container");
  if ($bg && movie.backdrop_path) {
    $bg.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`;
  }
  const $title = document.querySelector(".top-rated-movie .title");
  if ($title) $title.textContent = movie.title;
  const $rate = document.querySelector(".top-rated-movie .rate-value");
  if ($rate) $rate.textContent = movie.vote_average.toFixed(1);
  const $detailBtn = document.querySelector(".top-rated-movie .detail");
  if ($detailBtn) {
    $detailBtn.dataset.id = String(movie.id);
  }
};
const toggleButton = (totalPage, currentPage) => {
  if (currentPage < totalPage) {
    showMoreButton();
  } else {
    hideMoreButton();
  }
};
const showMoreButton = () => {
  document.querySelector("#more-page-button")?.classList.remove("hidden");
};
const hideMoreButton = () => {
  document.querySelector("#more-page-button")?.classList.add("hidden");
};
class LocalReviewStorage {
  STORAGE_KEY = "movie_ID_stars";
  // movie_id, star 순의 영화리뷰 데이터 뽑아오기
  getReviews() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }
  async getRating(movieId) {
    const reviews = this.getReviews();
    return reviews[movieId] || null;
  }
  // 전체 영화데이터를 긁어와서 원하는 영화의 score 덮어쓰고 다시 로컬에 저장
  async saveRating(movieId, score) {
    const reviews = this.getReviews();
    reviews[movieId] = score;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reviews));
  }
}
const reviewStorage = new LocalReviewStorage();
const $modalBackground = document.querySelector("#modalBackground");
const $modalContainer = document.querySelector("#modalContainer");
const RATING_MESSAGES = {
  2: "최악이에요",
  4: "별로에요",
  6: "보통이에요",
  8: "재미있어요",
  10: "명작이에요"
};
const openModalUI = () => {
  $modalBackground?.classList.add("active");
  document.body.classList.add("modal-open");
};
const closeModalUI = () => {
  $modalBackground?.classList.remove("active");
  document.body.classList.remove("modal-open");
};
const showModalSkeleton = () => {
  if ($modalContainer) {
    $modalContainer.innerHTML = `
      <div class="modal-loading-wrapper">
        <h2>정보를 불러오는 중입니다...</h2>
      </div>
    `;
  }
};
const showError = () => {
  if ($modalContainer) {
    $modalContainer.innerHTML = `
      <div class="modal-description">
        <h2>에러가 발생했습니다! 모달창을 닫고 다시 켜주세요!</h2>
      </div>
    `;
  }
};
const renderModalContent = (data, myRating) => {
  if (!$modalContainer) return;
  const year = data.release_date ? data.release_date.split("-")[0] : "연도가 없습니다!";
  const genres = data.genres ? data.genres.map((genre) => genre.name).join(", ") : "장르가 없습니다!";
  const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/original${data.poster_path}` : "./images/woowacourse_logo.png";
  const ratingText = myRating > 0 ? RATING_MESSAGES[myRating] : "평가해주세요";
  const starsHTML = [2, 4, 6, 8, 10].map((score) => {
    const imgSrc = score <= myRating ? "./images/star_filled.png" : "./images/star_empty.png";
    return `<img src="${imgSrc}" class="rate-star-img" data-score="${score}" alt="${score}점" />`;
  }).join("");
  $modalContainer.innerHTML = /* html */
  `
    <div class="modal-image">
      <img src="${posterUrl}" alt="${data.title}" />
    </div>
    <div class="modal-description">
      <h2>${data.title}</h2>
      <p class="category">${year} · ${genres}</p>
      <p class="rate">
        <span class="average-text">평균</span>
        <img src="./images/star_filled.png" class="average-star" />
        <span>${data.vote_average.toFixed(1)}</span>
      </p>
      <hr />

      <div class="my-rating-container">
        <h3>내 별점</h3>
        <div class="star-rating" id="starRating">
          <div class="stars-wrapper">
            ${starsHTML}
          </div>
          <span class="rating-desc" id="ratingDescription">
          ${ratingText} 
          ${myRating > 0 ? `<span class="score-number">(${myRating}/10)</span>` : ""}
          </span
        </div>
      </div>
      <hr />

      <div class="plot-container">
        <h3>줄거리</h3>
        <p class="detail">${data.overview || "줄거리 정보가 없습니다."}</p>
      </div>
    </div>
  `;
};
const updateStarsUI = (score) => {
  const $stars = document.querySelectorAll(".rate-star-img");
  const $description = document.querySelector("#ratingDescription");
  $stars.forEach(($star) => {
    const starScore = Number($star.dataset.score);
    const imgElement = $star;
    imgElement.src = starScore <= score ? "./images/star_filled.png" : "./images/star_empty.png";
  });
  if ($description) {
    if (score > 0) {
      $description.innerHTML = `${RATING_MESSAGES[score]} <span class="score-number">(${score}/10)</span>`;
    } else {
      $description.innerHTML = "평가해주세요";
    }
  }
};
const openModal = async (movieId) => {
  openModalUI();
  showModalSkeleton();
  try {
    const data = await fetchMovieDetail(movieId);
    const myRating = await reviewStorage.getRating(movieId) || 0;
    renderModalContent(data, myRating);
    initStarRatingEvents(movieId, myRating);
  } catch (error) {
    showError();
  }
};
const initStarRatingEvents = (movieId, savedRating) => {
  const $starContainer = document.querySelector("#starRating");
  let currentSavedRating = savedRating;
  $starContainer?.addEventListener("mouseover", (e) => {
    const target = e.target;
    if (target.classList.contains("rate-star-img")) {
      const hoverScore = Number(target.dataset.score);
      updateStarsUI(hoverScore);
    }
  });
  $starContainer?.addEventListener("mouseout", () => {
    updateStarsUI(currentSavedRating);
  });
  $starContainer?.addEventListener("click", async (e) => {
    const target = e.target;
    if (target.classList.contains("rate-star-img")) {
      const clickedScore = Number(target.dataset.score);
      currentSavedRating = clickedScore;
      updateStarsUI(clickedScore);
      await reviewStorage.saveRating(movieId, clickedScore);
    }
  });
};
const initModalCloseEvents = () => {
  const $closeModalButton = document.querySelector("#closeModal");
  const $modalBackground2 = document.querySelector("#modalBackground");
  if ($closeModalButton) {
    $closeModalButton.addEventListener("click", closeModalUI);
  }
  if ($modalBackground2) {
    $modalBackground2.addEventListener("click", (event) => {
      if (event.target === $modalBackground2) {
        closeModalUI();
      }
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $modalBackground2?.classList.contains("active")) {
      closeModalUI();
    }
  });
};
initModalCloseEvents();
const initMovieList = (query) => {
  let currentPage = 1;
  let isFetching = false;
  let isError = false;
  const $thumbnailList = document.querySelector(".thumbnail-list");
  const $button = document.querySelector("#more-page-button");
  const $heroDetailBtn = document.querySelector(".top-rated-movie .detail");
  if (!$thumbnailList || !$button) return;
  const loadMovies = async () => {
    try {
      renderSkeleton($thumbnailList);
      const data = query ? await fetchSearchMovies(query, currentPage) : await fetchPopularMovies(currentPage);
      removeSkeleton($thumbnailList);
      if (query && data.results.length === 0) {
        renderEmptyState($thumbnailList, query);
        return;
      }
      if (currentPage === 1 && !query && data.results.length > 0) {
        updateHeroBanner(data.results[0]);
      }
      renderMovieList($thumbnailList, data.results);
      toggleButton(data.total_pages, currentPage);
      currentPage++;
    } catch (error) {
      removeSkeleton($thumbnailList);
      showMoreButton();
      isError = true;
      if (error instanceof Error) {
        alert("영화 목록을 불러오지 못했습니다! 새로고침을 누르거나 더보기 버튼을 한번 더 눌러주세요!");
      }
    }
  };
  const handleIntersect = async (entries) => {
    const entry = entries[0];
    if (entry.isIntersecting && !isFetching && !isError) {
      isFetching = true;
      await loadMovies();
      isFetching = false;
    }
  };
  const observerOptions = {
    root: null,
    rootMargin: "0px 0px 200px 0px",
    // 더보기 버튼 200px 위부터 관찰하기
    threshold: 0
  };
  const observer = new IntersectionObserver(handleIntersect, observerOptions);
  const start = async () => {
    isFetching = true;
    await loadMovies();
    isFetching = false;
    observer.observe($button);
  };
  start();
  if ($heroDetailBtn) {
    $heroDetailBtn.addEventListener("click", (event) => {
      const target = event.currentTarget;
      const movieId = Number(target.dataset.id);
      if (movieId) {
        openModal(movieId);
      }
    });
  }
  $button?.addEventListener("click", async () => {
    isError = false;
    hideMoreButton();
    if (!isFetching) {
      isFetching = true;
      await loadMovies();
      isFetching = false;
    }
  });
  $thumbnailList.addEventListener("click", (event) => {
    const target = event.target;
    const $movieItem = target.closest(".movie-item");
    if ($movieItem) {
      const movieId = Number($movieItem.dataset.id);
      if (movieId) {
        openModal(movieId);
      }
    }
  });
};
export {
  initMovieList as i
};
