import { i as initMovieList } from "./movieController-Cb7qE2Ac.js";
addEventListener("load", () => {
  const app = document.querySelector("#app");
  if (app) {
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) {
      initMovieList(query);
    }
  }
});
