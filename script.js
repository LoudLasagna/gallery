let mainContentWrapper = document.getElementsByClassName("main-content-wrapper")[0];
let catalogLink = document.getElementsByClassName("button-link")[0];
let favoritesLink = document.getElementsByClassName("button-link")[1];

/*let test = new ListItem({name: "Romaguera-Crona", id: 559}, "user");
mainContentWrapper.appendChild(test.tag);*/


let favoritesStorage = "localStorage"; // cookies или localStorage
function getFavoritePictures() { 
    if (favoritesStorage === "cookies") {
        return document.cookie.length !== 0 && document.cookie.length !== 5
        ? document.cookie.split(/;/)[0].split(/=/)[1].split(',').filter((elem) => elem !== "")
        : []; 
    } else if (favoritesStorage === "localStorage"){
        return localStorage.getItem("favs") !== null 
        ? localStorage.getItem("favs").split(',').filter((elem) => elem !== "")
        : [];
    }
};

function setFavoritePictures(array) {
    if (favoritesStorage === "cookies") document.cookie = `favs=${array};path=/;max-age=86400`;
    else if (favoritesStorage = "localStorage") localStorage.setItem("favs", array.join(","));
};

function getHTMLTag(tag, insides, ...classes) {
    let rtag = document.createElement(tag);
    rtag.innerHTML = insides;
    rtag.classList.add(...classes);
    return rtag;
} 

function Loader() {
    this.tag = getHTMLTag("div", "<img src='static/ezgif-6-72ed6200d8f7.gif'>", "loader");
    let standartMessage = "<b>Произошла ошибка</b> мы работаем над этим";
    this.setState = (type, message) => {
        if (message) standartMessage = message;
        this.tag.classList.add("error");
        this.tag.innerHTML = `<img src='static/${type}.png'> ` + standartMessage;
    }
    this.remove = () => { this.tag.remove() };
}


function Star(id) {
    let star = getHTMLTag("div", "&#9733", "star");
    let favArr = getFavoritePictures();
    let favourited = false;
    for (let i = 0 ; i < favArr.length; i++) {
        if (Number(favArr[i]) === id) {
            favourited = true;
            star.classList.add("clicked");
            break;
        }
    }
    star.addEventListener("click", function(){
        if (!favourited) {
            favArr = getFavoritePictures();
            favArr.push(id);
            setFavoritePictures(favArr);
            star.classList.add("clicked");
            favourited = !favourited;
        } else {
            favArr = getFavoritePictures().filter((element) => Number(element) !== id);
            setFavoritePictures(favArr);
            star.classList.remove("clicked");
            favourited = !favourited;
        }
    });
    return star;
}

// Картинки из альбомов
function GalleryImage(imageObject, inFavs) {
    this.tag = document.createElement("div");

    let image = document.createElement("img",);
    image.src = imageObject.thumbnailUrl;
    image.title = imageObject.title;

    this.tag.appendChild(image);
    this.tag.appendChild(Star(imageObject.id));

    if (inFavs) { // Если отображается в избранных, то добавляется title картинки
        let imgDesc = document.createElement("p");
        imgDesc.innerHTML = imageObject.title
        this.tag.appendChild(imgDesc);
    }

    image.addEventListener("click", function(){ // обработчик события для отображения полноразмерной картинки
        let imgWrapper = getHTMLTag("div", `<img src="${imageObject.url}" title="${imageObject.title}">`, "image-view-wrapper");
        imgWrapper.addEventListener("click", function(event) { 
            if (event.target === imgWrapper) {
                imgWrapper.remove();
            }
        });
        document.body.appendChild(imgWrapper);
    });
}

// Элемент списка
function ListItem(object, type) {
    this.tag = getHTMLTag("div", type === "user" ? object.name : object.title, "list-header"); // Если элемент списка - пользователь, то отображается имя, иначе - заголовок альбома
    this.clicked = false;
    this.tag.addEventListener("click", function(){
        let loader = new Loader();
        let data;
        let loaderMessage;
        if (!this.clicked){
            if (type === "user") { // если элемент списка - пользователь, то при клике будут грузится альбомы
                data = getList("https://json.medrating.org/albums?userId=", object.id, "list-body");
                loaderMessage = "У пользователя отсутствуют альбомы";
            };
            if (type === "gallery") { // если элемент списка - альбом, то при клике будут грузится картинки
                data = getList("https://json.medrating.org/photos?albumId=", object.id, "gallery"); 
                loaderMessage = "В альбоме отсутствуют фотографии";
            };

            this.clicked = !this.clicked;
            this.after(loader.tag);
            this.classList.add("clicked");

            data.then((result) => {
                loader.remove();
                if (this.clicked) this.after(result);
                if (type === "user") result.classList.add("level2")
            }).catch((err) => {
                err === "Пусто" ? loader.setState("empty", loaderMessage) : loader.setState("error");
            })
        } else {
            this.nextElementSibling.remove();
            this.classList.remove("clicked");
            this.clicked = !this.clicked;
        }
    })
}

// Получает данные по api 
const getList = (url, id, listClass) => new Promise((resolve, reject) => {
    let listBody = getHTMLTag("div", "", listClass); //создание списка
    fetch(url + id).then((response) => {
        response.json().then((data) => {
            for (let i = 0; i < data.length; i++ ){
                switch (listClass) { // Создает объект в соответствии с передаваемым классом родительского элемента и заносит его в список
                    case "userlist":
                        if (data[i].name) listBody.appendChild(new ListItem(data[i], "user").tag); // Пользователь
                        break;
                    case "list-body":
                        listBody.appendChild(new ListItem(data[i], "gallery").tag); // Альбом
                        break;
                    case "gallery":
                        listBody.appendChild(new GalleryImage(data[i]).tag); // Картинка
                        break;
                    case "favImage":
                        resolve(new GalleryImage(data[i], true).tag); // Возвращает картинку для отображения в избранном
                        break;
                };
            };
            if (listBody.childElementCount > 0) resolve(listBody);
            else reject("Пусто");
        });
    })
    .catch((error) => {
        reject(error);
    });
})

const output = (page) => { 
    let loader = new Loader();
    loader.tag.style.position = "absolute";
    mainContentWrapper.appendChild(loader.tag);
    if (page === "users") { // Отображение каталога
        let data = getList("https://json.medrating.org/users/", "", "userlist")
        data.then((response) =>{
            mainContentWrapper.replaceChildren(response);
        })
        .catch((error) => {
            console.log(error);
            loader.setState("error");
        });
    } else { // Отображение избранного
        let gallery = getHTMLTag("div", "", "gallery", "favs");

        favArr = getFavoritePictures();
        if (favArr.length > 0) {
            favArr.forEach((element) => {
                if (element !== "") {
                    let image = getList("https://json.medrating.org/photos?id=", element, "favImage");
                    image.then((result) => {
                        gallery.appendChild(result);
                        if (gallery.childElementCount === favArr.length) mainContentWrapper.replaceChildren(gallery);
                    })
                    .catch((error) => {
                        console.log(error);
                        loader.setState("error");
                    });
                }
            })
        } else loader.setState("empty", "<b>Список избранного пуст</b> добавляйте изображения, нажимая на звёздочки");
    }
}

catalogLink.addEventListener("click", function() {
    if (!this.classList.contains("active")) {
        mainContentWrapper.innerHTML = "";
        this.classList.add("active");
        favoritesLink.innerHTML = "<span>&#9734</span> Избранное";
        favoritesLink.classList.remove("active");
        output("users");
    }
});
favoritesLink.addEventListener("click", function(){
    if (!this.classList.contains("active")) {
        mainContentWrapper.innerHTML = "";
        this.classList.add("active");
        this.innerHTML = "<span>&#9733</span> Избранное";
        catalogLink.classList.remove("active");
        output("favs");
    }
});

output("users");