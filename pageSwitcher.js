function PageSwitcher() {
    this.previousPageName = null;
}

PageSwitcher.prototype.switchToPage = function (pageName) {
    console.log("switching to " + pageName);
    //hide previous page
    if (this.previousPageName != null) {
        var previousPageElements = document.getElementsByClassName(this.previousPageName);
        for (var i = 0; i < previousPageElements.length; i++) {
            previousPageElements[i].style.display = "none";
        }
    }

    //show new page
    var pageElements = document.getElementsByClassName(pageName);
    for (var i = 0; i < pageElements.length; i++) {
        pageElements[i].style.display = "flex";
    }
    this.previousPageName = pageName;

    this.onPageSwitch(this.previousPageName == null);
}


PageSwitcher.prototype.onPageSwitch = function (initial) {

}