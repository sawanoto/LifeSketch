const list = document.querySelector("#works");
for (const work of window.LIFE_SKETCH_WORKS) {
  const card = document.createElement("a");
  card.className = "work";
  card.href = work.url;
  const number = document.createElement("span");
  number.className = "number";
  number.textContent = `LIFE SKETCH ${String(work.number).padStart(3, "0")}`;
  const title = document.createElement("strong");
  title.textContent = work.title;
  const description = document.createElement("span");
  description.textContent = work.description;
  const tags = document.createElement("small");
  tags.textContent = work.tags.join(" · ");
  if (work.thumbnail) {
    const thumbnail = document.createElement("img");
    thumbnail.src = work.thumbnail;
    thumbnail.alt = "";
    thumbnail.loading = "lazy";
    thumbnail.width = 640;
    thumbnail.height = 400;
    card.append(thumbnail);
  }
  card.append(number, title, description, tags);
  list.append(card);
}
