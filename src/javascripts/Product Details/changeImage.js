const changeImage = () => {
    const subImages = document.querySelectorAll(".subImages img");
    for (const element of subImages) {
        element.addEventListener("click", (e) =>
            changeMainImage(element.src, e)
        );
    }
};
const changeMainImage = (newSrc, event) => {
    document.querySelector(".mainImage img").src = newSrc;
    document.querySelectorAll(".subImages img").forEach((img) => {
        img.classList.remove("active");
    });
    event.target.classList.add("active");
};
export default changeImage;
