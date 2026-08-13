let values = [1.00, 1.01, 1.19, 1.20, 1.39, 1.40, 1.59, 1.60, 1.79, 1.80];
for (let v of values) {
    let cp = Math.floor((v + 0.001) / 0.2) * 0.2;
    cp = Math.round(cp * 100) / 100;
    console.log(v, "->", cp);
}
