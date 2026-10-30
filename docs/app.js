/**
 * The site works without JavaScript. This only adds a copy button to code
 * blocks in posts.
 */
document.querySelectorAll(".prose pre").forEach((pre) => {
  const code = pre.querySelector("code");
  if (!code) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy";
  button.textContent = "copy";
  button.setAttribute("aria-label", "Copy code to clipboard");

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ""));
      button.textContent = "copied";
    } catch {
      button.textContent = "failed";
    }
    window.setTimeout(() => {
      button.textContent = "copy";
    }, 1600);
  });

  pre.append(button);
});
