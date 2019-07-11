var names = ["A",2,3,4,5,6,7,8,9,10,"J","Q","K"];
var namesCorrect = [1,2,3,4,5,6,7,8,9,10,11,12,13];
var colors = ["C", "D", "S", "H"];

var urlpre = "https://upload.wikimedia.org/wikipedia/commons/7/76/"
var urlsuf = ".svg";

colors.forEach((c,j) => {
    names.forEach((n,i) => {      
        // console.log(`ren ${n}${c}.svg ${namesCorrect[i]+(j*names.length)}.svg`);
        console.log(`"${namesCorrect[i]+(j*names.length)}":{ type : "${c}", val : "${namesCorrect[i]}" },`);
    });
});