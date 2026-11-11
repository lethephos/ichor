/* Light and dark theme.
   The page follows the system until the reader picks a theme. A pick that matches the
   system is not saved, so the page goes back to following it. */
import "./state.js";

const themeBtn = document.getElementById("themeBtn");
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const isDark = () => (document.documentElement.dataset.theme || (systemDark.matches ? "dark" : "light")) === "dark";
function showTheme(){
  const next = isDark() ? "light" : "dark";
  themeBtn.setAttribute("aria-label", `Switch to the ${next} theme`);
  themeBtn.title = `${next[0].toUpperCase()}${next.slice(1)} theme`;
  themeBtn.classList.toggle("dark", isDark());
}
themeBtn.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  const follows = next === (systemDark.matches ? "dark" : "light");
  if (follows) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
  try { follows ? localStorage.removeItem("ichor-theme") : localStorage.setItem("ichor-theme", next); } catch(e) {}
  showTheme();
});
systemDark.addEventListener("change", showTheme);
showTheme();
