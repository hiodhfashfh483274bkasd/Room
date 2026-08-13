for(let i=0; i<10; i++) {
    let crashPoint = 1.00;
    const r = Math.random();
    if (r < 0.08) { crashPoint = 1.00; } 
    else if (r < 0.35) { crashPoint = 1.01 + (Math.random() * 0.59); } 
    else if (r < 0.70) { crashPoint = 1.60 + (Math.random() * 1.40); }
    else if (r < 0.90) { crashPoint = 3.00 + (Math.random() * 3.00); }
    else { crashPoint = 6.00 + (Math.random() * 4.00); }
    
    crashPoint = Math.floor(crashPoint / 0.2) * 0.2;
    crashPoint = Math.round(crashPoint * 100) / 100;
    
    if (crashPoint < 1.20) { crashPoint = 1.00; }
    if (crashPoint > 10.0) { crashPoint = 10.0; }
    console.log(crashPoint.toFixed(2));
}
