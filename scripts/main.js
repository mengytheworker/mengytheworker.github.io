/*
   Graphic Pulsar Catalogue - main.js
   version: 0.1.1
   Date: 29 Mar 2023 -- initial version 0.1.0
         25 Jun 2023 -- add solid colors for pulsars with profile collected v0.1.1
   Author: meng yu
*/

// Fetch pcat json
fetch(new Request('https://mengytheworker.github.io/pcat2.json'))
//fetch(new Request('http://localhost:8000/pcat2.json'))
.then((response) => {
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
})
.then((pcat) => openDb(pcat))
.catch((error) => fetchError(error));

// Handle fetch error
function fetchError(error) {
    const para1 = document.createElement('p');
    para1.innerHTML = `${error.message} - Failed in fetching files.`;
    para1.style.fontFamily = 'serif';
    para1.style.fontSize = '20px';
    para1.style.textAlign = 'center';
    para1.style.lineHeight = '50px';
    para1.style.verticalAlign = 'bottom';
    document.body.appendChild(para1);

    const para2 = document.createElement('p');
    para2.innerHTML = 'If you keep seeing this and are sure your internet connection is good,';
    para2.style.fontFamily = 'serif';
    para2.style.fontSize = '15px';
    para2.style.textAlign = 'center';
    para2.style.lineHeight = '5px';
    para2.style.verticalAlign = 'top';
    para1.appendChild(para2);
    
    const para3 = document.createElement('p');
    para3.innerHTML = 'then please let me know: <font color="#007aff">vela.yumeng@gmail.com</font>.';
    para3.style.fontFamily = 'serif';
    para3.style.fontSize = '15px';
    para3.style.textAlign = 'center';
    para3.style.lineHeight = '5px';
    para3.style.verticalAlign = 'bottom';
    para1.appendChild(para3);
}

const DB_NAME = 'pcat';
const DB_PULSAR_STORE = 'pulsars';
const DB_VERSION = 1;

// Make db global
let db;

// Read json to indexedDB if fetch ok
function openDb(pcat) {
    // Clear existing database
    const deleteDBRequest = indexedDB.deleteDatabase(DB_NAME);

    deleteDBRequest.onerror = (event) => {
        console.log('error deleting database:', event.target.errorCode);
    };

    deleteDBRequest.onsuccess = () => {
        //console.log('database deleted successfully.');
    };

    // Request to open
    const openDbRequest = indexedDB.open(DB_NAME, DB_VERSION); 

    openDbRequest.onerror = function (event) {
        console.log('Open db error:', event.target.errorCode);

        // Also Inform user
        const para1 = document.createElement('p');
        para1.innerHTML = `Database open error: ${event.target.errorCode}`;
        para1.style.fontFamily = 'serif';
        para1.style.fontSize = '20px';
        para1.style.textAlign = 'center';
        para1.style.lineHeight = '50px';
        para1.style.verticalAlign = 'bottom';
        document.body.appendChild(para1);

        const para2 = document.createElement('p');
        para2.innerHTML = 'If you keep seeing this are sure you have enabled indexedDB, ';
        para2.style.fontFamily = 'serif';
        para2.style.fontSize = '15px';
        para2.style.textAlign = 'center';
        para2.style.lineHeight = '5px';
        para2.style.verticalAlign = 'top';
        para1.appendChild(para2);
    
        const para3 = document.createElement('p');
        para3.innerHTML = 'then please let me know: <font color="#007aff">vela.yumeng@gmail.com</font>.';
        para3.style.fontFamily = 'serif';
        para3.style.fontSize = '15px';
        para3.style.textAlign = 'center';
        para3.style.lineHeight = '5px';
        para3.style.verticalAlign = 'bottom';
        para1.appendChild(para3);
    };

    openDbRequest.onsuccess = function (event) {
        db = event.target.result;

        // Retrieve pulsars object store
        const pulsarsStore = db.transaction(DB_PULSAR_STORE, 'readwrite').objectStore(DB_PULSAR_STORE);
        
        // Write
        pcat.forEach((pulsar) => {
            pulsarsStore.add(pulsar);
        });
        
        readStore(pulsarsStore);
    };

    openDbRequest.onupgradeneeded = function (event) {
        // Create pulsars object store
        event.target.result.createObjectStore(DB_PULSAR_STORE, { keyPath: 'jname' });
    };
}

// Array to store pulsar J2000 positions and DM, proper motion etc.
const positions = [];

// Pulsar coordinates on map
let coords = [];

// Coordinate x with map center the origin
let coords_ = [];

// If canvas supported
let hasCanvas = true;

// Read store if it is successfully written
function readStore(store) {
    // Use cursor
    store.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;

        if (cursor) {
            const position = [];
            position.push(cursor.value.rajDeg);
            position.push(cursor.value.decjDeg);

            if (cursor.value.dm === 'na') {
                position.push(Number.NaN);
            } else {
                position.push(parseFloat(cursor.value.dm));
            }

            if (cursor.value.p0 === 'na') {
                position.push(Number.NaN);
            } else {
                position.push(parseFloat(cursor.value.p0));
            }

            if (cursor.value.pmra === 'na') {
                position.push(Number.NaN);
            } else {
                position.push(parseFloat(cursor.value.pmra));
            }

            if (cursor.value.pmdec === 'na') {
                position.push(Number.NaN);
            } else {
                position.push(parseFloat(cursor.value.pmdec));
            }

            position.push(cursor.value.jname);

            if (typeof(cursor.value.profile) === 'undefined') {
                position.push('np');
            } else {
                position.push('yp');
            }

            positions.push(position); 
            cursor.continue();
        } else {
            // After getting all positions, retrieve canvas element
            const canvas = document.getElementById('map');

            // Get pulsar coordinates
            coords = positions.map((posn) => {
                let coord = [];

                if (posn[0]>=0.0 && posn[1]>=-90.0) {
                    // Gall-Peters projection
                    coord.push(posn[0]*Math.PI/180.0);
                    coord.push(Math.sin(posn[1]*Math.PI/180.0));
        
                    // DM
                    coord.push(posn[2]);

                    // P0
                    coord.push(posn[3]);

                    // PM
                    coord.push(posn[4]);
                    coord.push(posn[5]);

                    // Jname
                    coord.push(posn[6]);

                    // Profile flag
                    coord.push(posn[7]);
                } else {
                    coord.push(NaN);
                    coord.push(NaN);
                    coord.push(posn[2]);
                    coord.push(posn[3]);
                    coord.push(posn[4]);
                    coord.push(posn[5]);
                    coord.push(posn[6]);
                    coord.push(posn[7]);
                }

                return coord;
            });
            
            // If the browser supports canvas
            if (canvas.getContext) {
                // Show canvas
                canvas.style.backgroundColor = 'rgb(240,240,240)';

                // Convert x coordinates
                coords_ = coords.map(coord => coord[0]-Math.PI);

                // Plot
                plotPulsars(1.0, 0.5, 0.0, 0.0, 0.0);
            } else {
                // Remove canvas
                canvas.remove();

                // Set bool
                hasCanvas = false;
            }
        }
    };
}

// Plot pulsars
function plotPulsars(scale, xToW, yToH, offsetX, offsetY) {
    // Get DPR
    const dpr = window.devicePixelRatio;

    // Get dimension minimum
    const sizeMin = Math.min(window.innerWidth, window.innerHeight);

    // Retrieve canvas
    const canvas = document.getElementById('map');

    // Retrieve bounding rectangle
    const rect = canvas.getBoundingClientRect();

    // Set canvas size
    canvas.width = (window.innerWidth - 2*rect['left']) * dpr;
    canvas.height = (window.innerHeight - rect['top'])/2 * dpr;

    // Retrieve map context
    const context = canvas.getContext('2d');

    // Plot
    context.lineWidth = 0.5;
    for(let i=0; i<coords.length; i++) {
        context.beginPath();

        // Draw circle for position, dm, p0
        if (!Number.isNaN(coords[i][0]) && !Number.isNaN(coords[i][1])) {
            if (!Number.isNaN(coords[i][2])) {
                if (coords[i][3] < 0.01) {
                    if (coords[i][7] === 'np') {
                        context.strokeStyle = '#007aff';

                        if (dpr === 2) {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, Math.log(coords[i][2])/400.0*sizeMin, 0.0, Math.PI*2, true);
                        } else {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, Math.log(coords[i][2])/800.0*sizeMin, 0.0, Math.PI*2, true);
                        }

                        context.closePath();
                        context.stroke();
                    } else if (coords[i][7] === 'yp') {
                        context.strokeStyle = '#007aff';
                        context.fillStyle = 'rgba(0,122,255,0.1)';

                        if (dpr === 2) {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, Math.log(coords[i][2])/400.0*sizeMin, 0.0, Math.PI*2, true);
                        } else {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, Math.log(coords[i][2])/800.0*sizeMin, 0.0, Math.PI*2, true);
                        }

                        context.closePath();
                        context.stroke();
                        context.fill();
                        context.fillStyle = 'black';
                    }
                } else {
                    if (coords[i][7] === 'np') {
                        context.strokeStyle = 'black';

                        if (dpr === 2) {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, Math.log(coords[i][2])/400.0*sizeMin, 0.0, Math.PI*2, true);
                        } else {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, Math.log(coords[i][2])/800.0*sizeMin, 0.0, Math.PI*2, true);
                        }

                        context.closePath();
                        context.stroke();
                    } else if (coords[i][7] === 'yp') {
                        context.strokeStyle = 'black';
                        context.fillStyle = 'rgba(0,0,0,0.1)';

                        if (dpr === 2) {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, Math.log(coords[i][2])/400.0*sizeMin, 0.0, Math.PI*2, true);
                        } else {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, Math.log(coords[i][2])/800.0*sizeMin, 0.0, Math.PI*2, true);
                        }

                        context.closePath();
                        context.stroke();
                        context.fill();
                        context.fillStyle = 'black';
                    }
                }
            } else {
                if (coords[i][3] < 0.01) {
                    if (coords[i][7] === 'np') {
                        context.strokeStyle = '#007aff';

                        if (dpr === 2) {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, 0.01*sizeMin, 0.0, Math.PI*2, true);
                        } else {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, 0.005*sizeMin, 0.0, Math.PI*2, true);
                        }

                        context.closePath();
                        context.stroke();
                    } else if (coords[i][7] === 'yp') {
                        context.strokeStyle = '#007aff';
                        context.fillStyle = 'rgba(0,122,255,0.1)';

                        if (dpr === 2) {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, 0.01*sizeMin, 0.0, Math.PI*2, true);
                        } else {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, 0.005*sizeMin, 0.0, Math.PI*2, true);
                        }

                        context.closePath();
                        context.stroke();
                        context.fill();
                        context.fillStyle = 'black';
                    }
                } else {
                    if (coords[i][7] === 'np') {
                        context.strokeStyle = 'black';

                        if (dpr === 2) {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, 0.01*sizeMin, 0.0, Math.PI*2, true);
                        } else {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, 0.005*sizeMin, 0.0, Math.PI*2, true);
                        }

                        context.closePath();
                        context.stroke();
                    } else if (coords[i][7] === 'yp') {
                        context.strokeStyle = 'black';
                        context.fillStyle = 'rgba(0,0,0,0.1)';

                        if (dpr === 2) {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, 0.01*sizeMin, 0.0, Math.PI*2, true);
                        } else {
                            context.arc((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY, 0.005*sizeMin, 0.0, Math.PI*2, true);
                        }

                        context.closePath();
                        context.stroke();
                        context.fill();
                        context.fillStyle = 'black';
                    }
                }
            }
        }

        // Draw line for pm
        if (!Number.isNaN(coords[i][0]) && !Number.isNaN(coords[i][1]) && !Number.isNaN(coords[i][3]) && !Number.isNaN(coords[i][4] && !Number.isNaN(coords[i][5]))) {
            context.beginPath();

            // length = 2*sqrt(pm), pm = sqrt(pmra*pmra+pmdec*pmdec)
            const length = 2*Math.sqrt(Math.sqrt(coords[i][4]*coords[i][4]+coords[i][5]*coords[i][5]));

            // pm's direction
            const direction = Math.atan2(coords[i][5], coords[i][4]);

            if (coords[i][3] < 0.01) {
                context.strokeStyle = '#007aff';
            } else {
                context.strokeStyle = 'black';
            }

            context.moveTo((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX, (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY);
            context.lineTo((coords_[i]*scale+xToW*2*Math.PI)*canvas.width/(2*Math.PI)+offsetX+length*Math.cos(direction), (1.0-coords[i][1]*scale+yToH)*canvas.height*0.5+offsetY-length*Math.sin(direction));

            context.closePath();
            context.stroke();
        }
    }

    // Mark RA
    for (let i=0; i<24; i++) {
        context.lineWidth = 1.0;
        context.beginPath();

        context.moveTo(canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) + offsetX, 0.01*canvas.height);
        context.lineTo(canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) + offsetX, 0.02*canvas.height);

        context.closePath();
        context.stroke();

        if (scale > 2.5) {
            for (let j=1; j<6; j++) {
                context.beginPath();

                context.moveTo(canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) + canvas.width/24*scale/6*j + offsetX, 0.012*canvas.height);
                context.lineTo(canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) + canvas.width/24*scale/6*j + offsetX, 0.018*canvas.height);

                context.closePath();
                context.stroke();

                if (scale > 5.0) {
                    for (let k=1; k<6; k++) {
                        context.beginPath();

                        context.moveTo(canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) + canvas.width/24*scale/6/6*k + offsetX, 0.014*canvas.height);
                        context.lineTo(canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) + canvas.width/24*scale/6/6*k + offsetX, 0.016*canvas.height);
    
                        context.moveTo(canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) + canvas.width/24*scale/6*j + canvas.width/24*scale/6/6*k + offsetX, 0.014*canvas.height);
                        context.lineTo(canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) + canvas.width/24*scale/6*j + canvas.width/24*scale/6/6*k + offsetX, 0.016*canvas.height);
    
                        context.closePath();
                        context.stroke();
                    }
                }
            }
        }
    }

    // Mark Dec
    for (let i=0; i<13; i++) {
        context.lineWidth = 1.0;
        context.beginPath();

        context.moveTo(canvas.width*0.005, (1 - Math.sin((90-15*i)*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY);
        context.lineTo(canvas.width*0.008, (1 - Math.sin((90-15*i)*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY);

        context.closePath();
        context.stroke();

        if (scale > 2.5) {
            for (let j=1; j<15; j++) {
                context.beginPath();

                context.moveTo(canvas.width*0.0055, (1 - Math.sin((90-15*i-j)*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY);
                context.lineTo(canvas.width*0.0075, (1 - Math.sin((90-15*i-j)*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY);

                context.closePath();
                context.stroke();

                if (scale > 5.0) {
                    for (let k=1; k<6; k++) {
                        context.beginPath();

                        context.moveTo(canvas.width*0.00625, (1 - Math.sin((90-15*i-0-1/6*k)*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY);
                        context.lineTo(canvas.width*0.00675, (1 - Math.sin((90-15*i-0-1/6*k)*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY);
                        context.moveTo(canvas.width*0.00625, (1 - Math.sin((90-15*i-j-1/6*k)*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY);
                        context.lineTo(canvas.width*0.00675, (1 - Math.sin((90-15*i-j-1/6*k)*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY);

                        context.closePath();
                        context.stroke();
                    }
                }
            }
        }
    }

    // Label RA
    if (dpr === 2) {
        context.font = `${0.03*sizeMin}px ui-rounded`;
    } else {
        context.font = `${0.015*sizeMin}px ui-rounded`;
    }
    for (let i=0; i<24; i++) {
        if (scale < 2.0) {
            if (i%2 == 1) {
                context.fillText(`${i}h`, canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) - canvas.width/24*0.2 + offsetX, 0.05*canvas.height);
            }
        } else {
            context.fillText(`${i}h`, canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) - canvas.width/24*0.2 + offsetX, 0.05*canvas.height);

            if (scale > 15.0 && scale < 30.0) {
                context.fillText(`${i}h30m`, canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) - canvas.width/24*0.5 + canvas.width/24*scale/2 + offsetX, 0.05*canvas.height);
            }

            if (scale > 30.0 && scale < 45.0) {
                context.fillText(`${i}h20m`, canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) - canvas.width/24*0.5 + canvas.width/24*scale*1/3 + offsetX, 0.05*canvas.height);
                context.fillText(`${i}h40m`, canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) - canvas.width/24*0.5 + canvas.width/24*scale*2/3 + offsetX, 0.05*canvas.height);
            }

            if (scale > 45.0) {
                for (let j=1; j<6; j++) {
                    context.fillText(`${i}h${j}0m`, canvas.width/2 + (xToW-0.5)*canvas.width - canvas.width/24*scale*(12-i) - canvas.width/24*0.5 + canvas.width/24*scale*j/6 + offsetX, 0.05*canvas.height);
                }
            }
        }
    }

    // Label Dec
    if (dpr === 2) {
        context.font = `${0.03*sizeMin}px ui-rounded`;
    } else {
        context.font = `${0.015*sizeMin}px ui-rounded`;
    }
    if (scale < 2.0) {
        for (let i=1; i<6; i++) {
            const deg = 90-30*i;
            if (deg>0) {
                context.fillText(`+${deg}d`, canvas.width*0.01, (1 - Math.sin(deg*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY + 0.008*canvas.height);
            } else {
                context.fillText(`${deg}d`, canvas.width*0.01, (1 - Math.sin(deg*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY + 0.008*canvas.height);
            }
        }
    } else if (scale > 2.0 && scale < 4.0) {
        for (let i=0; i<13; i++) {
            const deg = 90-15*i;
            if (deg>0) {
                context.fillText(`+${deg}d`, canvas.width*0.01, (1 - Math.sin(deg*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY + 0.008*canvas.height);
            } else {
                context.fillText(`${deg}d`, canvas.width*0.01, (1 - Math.sin(deg*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY + 0.008*canvas.height);
            }
        }
    } else if (scale > 4.0 && scale < 15.0) {
        for (let i=0; i<37; i++) {
            const deg = 90-5*i;
            if (deg>0) {
                context.fillText(`+${deg}d`, canvas.width*0.01, (1 - Math.sin(deg*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY + 0.008*canvas.height);
            } else {
                context.fillText(`${deg}d`, canvas.width*0.01, (1 - Math.sin(deg*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY + 0.008*canvas.height);
            }
        }
    } else if (scale > 15.0) {
        for(let i=0; i<181; i++) {
            const deg = 90-i;
            if (deg>0) {
                context.fillText(`+${deg}d`, canvas.width*0.01, (1 - Math.sin(deg*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY + 0.008*canvas.height);
            } else {
                context.fillText(`${deg}d`, canvas.width*0.01, (1 - Math.sin(deg*Math.PI/180)*scale+yToH)*canvas.height/2 + offsetY + 0.008*canvas.height);
            }
        }
    }
}

// Map scale
let scale = 1.0;

// Make event position center when zooming-in/out
let xToW = 0.5, yToH = 0.0;

// Offsets for pan gesture
let offsetX = 0.0, offsetY = 0.0;

// If wheel event goes
let canPlot = true;

// Store clicked pulsar
let result;

// Click event for canvas
document.querySelector('#map').addEventListener('click', (event) => {
    const canvas = document.getElementById('map');

    // Retrieve bounding rectangle
    const rect = canvas.getBoundingClientRect();
    
    // Get DPR
    const dpr = window.devicePixelRatio;
    
    // Convert click position to Gall-Peters coordinates
    const coordX = (((event.clientX-rect['left'])*dpr-offsetX)/canvas.width-1.0+xToW)*2*Math.PI/scale + Math.PI;
    const coordY = (1.0 - 2.0*((event.clientY-rect['top'])*dpr-offsetY)/canvas.height + yToH)/scale;

    // Search which pulsar is clicked
    let results = coords.filter(coord => coord[0] < coordX+0.05 && coord[0] > coordX-0.05 && coord[1] < coordY+0.05 && coord[1] > coordY-0.05);
    let distances = results.map((res) => {
        const index = results.indexOf(res);
        const dist = (res[0]-coordX)*(res[0]-coordX)+(res[1]-coordY)*(res[1]-coordY);

        return [dist, index];
    });
    if (distances.length > 1) {
        distances.sort((d1, d2) => {
            if (d1[0] < d2[0]) {
                return -1;
            }
        });
    }

    if (Array.isArray(results) && results.length>0) {
        result = results[distances[0][1]];
        plotHighlight();
        presentPulsar();
    }
});

// Cached touches
let cachedTouches = [];

// If outside map
let isOut = false

// Initial touch length
let touchLength = 0;

// Tapped position
let tappedPosition = [];

// Touch events
document.querySelector('#map').addEventListener('touchstart', (event) => {
    event.preventDefault();

    // Cache this event
    for (let i=0; i<event.changedTouches.length && cachedTouches.length<2; i++) {
        cachedTouches.push([event.changedTouches[i].identifier, event.changedTouches[i].pageX, event.changedTouches[i].pageY]);
    }

    // Record initial touch length and position for highlight
    touchLength = cachedTouches.length;
    if (touchLength < 2) { tappedPosition.push(cachedTouches[0][1], cachedTouches[0][2]); }
});

document.querySelector('#map').addEventListener('touchend', (event) => {
    event.preventDefault();

    // Clean cached touch
    for (let i=0; i<event.changedTouches.length; i++) {
        let idx = -1;
        for (let j=0; j<cachedTouches.length; j++) {
            if (cachedTouches[j][0] === event.changedTouches[i].identifier) { idx = j; }
            if (idx > -1) { cachedTouches.splice(idx, 1); }
        }
    }

    // Reset isOut when all touches end
    if (cachedTouches.length <= 0) { isOut = false; }

    // Plot highlight only if touch length is one and touch didn't move
    if (touchLength === 1 && event.changedTouches[0].pageX === tappedPosition[0] && event.changedTouches[0].pageY === tappedPosition[1]) {
        // Retrieve canvas
        const canvas = document.getElementById('map');

        // Retrieve bounding rect
        const rect = canvas.getBoundingClientRect();

        // Get DPR
        const dpr = window.devicePixelRatio;
    
        // Convert tap position to Gall-Peters coordinates
        let coordX = (((event.changedTouches[0].pageX-rect['left'])*dpr-offsetX)/canvas.width-1.0+xToW)*2*Math.PI/scale + Math.PI;
        let coordY = (1.0 - 2.0*((event.changedTouches[0].pageY-rect['top']-window.scrollY)*dpr-offsetY)/canvas.height + yToH)/scale;

        // Search which pulsar is tapped
        let results = coords.filter(coord => coord[0] < coordX+0.05 && coord[0] > coordX-0.05 && coord[1] < coordY+0.05 && coord[1] > coordY-0.05);
        let distances = results.map((res) => {
            const index = results.indexOf(res);
            const dist = (res[0]-coordX)*(res[0]-coordX)+(res[1]-coordY)*(res[1]-coordY);

            return [dist, index];
        });
        if (distances.length > 1) {
            distances.sort((d1, d2) => {
                if (d1[0] < d2[0]) {
                    return -1;
                }
            });
        }

        if (Array.isArray(results) && results.length>0) {
            result = results[distances[0][1]];
            plotHighlight();
            presentPulsar();
        }
    }

    tappedPosition.splice(0);
});

document.querySelector('#map').addEventListener('touchcancel', (event) => {
    event.preventDefault();

    // Clean cached touches
    cachedTouches.splice(0);

    // Reset isOut
    isOut = false;
});

document.querySelector('#map').addEventListener('touchmove', (event) => {
    event.preventDefault();
    
    // Retrieve map
    const canvas = document.getElementById('map');

    // Retrieve bounding rect
    const rect = canvas.getBoundingClientRect();

    if (!isOut && cachedTouches.length === 2) {
        // If outside map
        for (let i=0; i<event.changedTouches.length; i++) {
            if (event.changedTouches[i].pageY < rect['top']+window.scrollY || event.changedTouches[i].pageY > rect['bottom']+window.scrollY) { isOut = true; }
        }

        // Old distance
        const oldDist = Math.abs(cachedTouches[0][1]-cachedTouches[1][1]);

        // Update touches
        for (let i=0; i<event.changedTouches.length; i++) {
            let idx = -1;
            for (let j=0; j<cachedTouches.length; j++) {
                if (cachedTouches[j][0] === event.changedTouches[i].identifier) { idx = j; }
            }
            if (idx > -1) { cachedTouches.splice(idx, 1, [event.changedTouches[i].identifier, event.changedTouches[i].pageX, event.changedTouches[i].pageY]); }
        }

        // New distance
        const newDist = Math.abs(cachedTouches[0][1]-cachedTouches[1][1]);

        // Set scale
        scale += 0.01*(newDist - oldDist);
        if (scale < 1.0) {
            scale = 1.0;
            xToW = 0.5;
            yToH = 0.0;
            offsetX = 0.0;
            offsetY = 0.0;
        }

        // Set xToW
        if ((cachedTouches[0][1]+cachedTouches[1][1])/2 - window.innerWidth/2 > 0) {
            if (Math.PI*scale+(1-xToW)*2*Math.PI >= 2*Math.PI) {
                xToW += ((cachedTouches[0][1]+cachedTouches[1][1])/2 - window.innerWidth/2)/window.innerWidth*0.01;
            } else {
                xToW -= ((cachedTouches[0][1]+cachedTouches[1][1])/2 - window.innerWidth/2)/window.innerWidth*0.01;
            }
        } else {
            if (-Math.PI*scale+(1-xToW)*2*Math.PI < 0) {
                xToW += ((cachedTouches[0][1]+cachedTouches[1][1])/2 - window.innerWidth/2)/window.innerWidth*0.01;
            } else {
                xToW -= ((cachedTouches[0][1]+cachedTouches[1][1])/2 - window.innerWidth/2)/window.innerWidth*0.01;
            }
        }

        // Set yToH
        if (window.innerHeight/2 - (cachedTouches[0][2]+cachedTouches[1][2])/2 + parseFloat(window.getComputedStyle(canvas).top) > 0) {
            if (1.0 - scale + yToH < 0) {
                yToH += (window.innerHeight/2 - (cachedTouches[0][2]+cachedTouches[1][2])/2 + parseFloat(window.getComputedStyle(canvas).top))/window.innerHeight*0.01;
            } else {
                yToH -= (window.innerHeight/2 - (cachedTouches[0][2]+cachedTouches[1][2])/2 + parseFloat(window.getComputedStyle(canvas).top))/window.innerHeight*0.01;
            }
        } else {
            if (1.0 + scale + yToH > 0) {
                yToH -= ((cachedTouches[0][2]+cachedTouches[1][2])/2 - parseFloat(window.getComputedStyle(canvas).top) - window.innerHeight/2)/window.innerHeight*0.01;
            } else {
                yToH += ((cachedTouches[0][2]+cachedTouches[1][2])/2 - parseFloat(window.getComputedStyle(canvas).top) - window.innerHeight/2)/window.innerHeight*0.01;
            }
        }

        // Plot
        plotPulsars(scale, 1-xToW, yToH, offsetX, offsetY);
        if (document.getElementById('highlight')) {plotHighlight();}
    }

    if (!isOut && cachedTouches.length === 1) {
        // If outside map
        if (event.changedTouches[0].pageY < rect['top']+window.scrollY || event.changedTouches[0].pageY > rect['bottom']+window.scrollY) { isOut = true; }

        // Set offsets
        offsetX += (event.changedTouches[0].pageX - cachedTouches[0][1])*2;
        offsetY += (event.changedTouches[0].pageY - cachedTouches[0][2])*2;

        // Plot
        plotPulsars(scale, 1-xToW, yToH, offsetX, offsetY);
        if (document.getElementById('highlight')) {plotHighlight();}

        // Update cache
        cachedTouches.splice(0, 1, [event.changedTouches[0].identifier, event.changedTouches[0].pageX, event.changedTouches[0].pageY]);
    }
})

// Window wheel events
document.getElementById('map').addEventListener('wheel', (event) => {
    event.preventDefault();

    if (canPlot) {
        canPlot = false;

        // Retrieve map
        const canvas = document.getElementById('map');

        // Retrieve bounding rect
        const rect = canvas.getBoundingClientRect();

        // Get dpr
        const dpr = window.devicePixelRatio;

        // If ctrl key, deltaY means scale
        if (event.ctrlKey) {
            scale -= event.deltaY*0.01;

            if (event.clientX-0.5*window.innerWidth > 0) {
                if (Math.PI*scale+(1-xToW)*2*Math.PI >= 2*Math.PI) {
                    xToW += (event.clientX-0.5*canvas.width/dpr)/(canvas.width/dpr)*0.01;
                } else {
                    xToW -= (event.clientX-0.5*canvas.width/dpr)/(canvas.width/dpr)*0.01;
                }
            } else {
                if (-Math.PI*scale+(1-xToW)*2*Math.PI < 0) {
                    xToW += (event.clientX-0.5*canvas.width/dpr)/(canvas.width/dpr)*0.01;
                } else {
                    xToW -= (event.clientX-0.5*canvas.width/dpr)/(canvas.width/dpr)*0.01;
                }
            }

            if (0.5*canvas.height/dpr - event.clientY + rect['top'] + window.scrollY > 0) {
                if (1.0 - scale + yToH < 0) {
                    yToH += (0.5*canvas.height/dpr - event.clientY + rect['top'] + window.scrollY)/(canvas.height/dpr)*0.01;
                } else {
                    yToH -= (0.5*canvas.height/dpr - event.clientY + rect['top'] + window.scrollY)/(canvas.height/dpr)*0.01;
                }
            } else {
                if (1.0 + scale + yToH > 2) {
                    yToH -= (event.clientY - rect['top'] + window.scrollY - 0.5*canvas.height/dpr)/(canvas.height/dpr)*0.01;
                } else {
                    yToH += (event.clientY - rect['top'] + window.scrollY - 0.5*canvas.height/dpr)/(canvas.height/dpr)*0.01;
                }
            }

            if (scale < 1.0) {
                scale = 1.0;
                xToW = 0.5;
                yToH = 0.0;
                offsetX = 0.0;
                offsetY = 0.0;
            }
        } else {
            // If not ctrl key, it means pan
            offsetX -= event.deltaX*4;
            offsetY -= event.deltaY*4;
        }

        plotPulsars(scale, 1-xToW, yToH, offsetX, offsetY);
        if (document.getElementById('highlight')) {plotHighlight();}

        canPlot = true;
    }
});

// Window resize event
window.addEventListener('resize', () => {
    const canvas = document.getElementById('map');

    if (hasCanvas) {
        const context = canvas.getContext('2d');

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Re-plot pulsars
        plotPulsars(scale, 1-xToW, yToH, offsetX, offsetY);

        // Retrieve highlight layer
        if (document.getElementById('highlight')) {
            const layer = document.getElementById('highlight');
            
            // Retrieve layer context
            const layerContext = layer.getContext('2d');

            // Clear
            layerContext.clearRect(0, 0, layer.width, layer.height);

            // Re-plot highlight layer
            plotHighlight();
        }
    }
});

function plotHighlight() {
    // Retrieve map
    const canvas = document.getElementById('map');

    // Retrieve bounding rectangle
    const rect = canvas.getBoundingClientRect();

    // Make highlight layer if there hasn't been one
    let layer;
    if (!document.getElementById('highlight')) {
        layer = document.createElement('canvas');
        layer.id = 'highlight';
        layer.style.position = 'absolute';
        layer.style.zIndex = 1.0;

        // Append layer
        document.body.appendChild(layer);
    } else {
        layer = document.getElementById('highlight');
    }

    // Get DPR
    const dpr = window.devicePixelRatio;

    // Get dimension minimum
    const sizeMin = Math.min(window.innerWidth, window.innerHeight);

    //  Set layer size and position
    if (!Number.isNaN(result[2])) {
        if (dpr === 2) {
            layer.style.width = `${4.0*Math.log10(result[2])/200.0*sizeMin/window.innerWidth*100}%`;
            layer.style.height = `${4.0*Math.log10(result[2])/200.0*sizeMin/window.innerHeight*100}%`;
        } else {
            layer.style.width = `${8.0*Math.log10(result[2])/400.0*sizeMin/window.innerWidth*100}%`;
            layer.style.height = `${8.0*Math.log10(result[2])/400.0*sizeMin/window.innerHeight*100}%`;
        }
    } else {
        if (dpr === 2) {
            layer.style.width = `${4.0*0.01*sizeMin/window.innerWidth*100}%`;
            layer.style.height = `${4.0*0.01*sizeMin/window.innerHeight*100}%`;
        } else {
            layer.style.width = `${8.0*0.005*sizeMin/window.innerWidth*100}%`;
            layer.style.height = `${8.0*0.005*sizeMin/window.innerHeight*100}%`;
        }
    }
    layer.width = parseFloat(layer.style.width)/100*window.innerWidth*dpr;
    layer.height = parseFloat(layer.style.height)/100*window.innerHeight*dpr;

    layer.style.left = `${((((result[0]-Math.PI)*scale+(1-xToW)*2*Math.PI)*canvas.width/(2*Math.PI) + offsetX)/dpr + rect['left'] - layer.width/2/dpr)/window.innerWidth*100}%`;
    if (parseFloat(layer.style.left)/100*window.innerWidth < rect['left']) {
        layer.style.left = `${rect['left']/window.innerWidth*100}%`;
    }
    if (parseFloat(layer.style.left)/100*window.innerWidth+parseFloat(layer.style.width)/100*window.innerWidth > rect['left']+canvas.width/dpr) {
        layer.style.left = `${(rect['left']+canvas.width/dpr-parseFloat(layer.style.width)/100*window.innerWidth)/window.innerWidth*100}%`;
    }

    layer.style.top = `${(((1-result[1]*scale+yToH)*canvas.height/2/dpr + offsetY/dpr) + rect['top'] + window.scrollY - layer.height/2/dpr)/window.innerHeight*100}%`;
    if (parseFloat(layer.style.top)/100*window.innerHeight < rect['top']+window.scrollY) {
        layer.style.top = `${(rect['top']+window.scrollY)/window.innerHeight*100}%`;
    }
    if (parseFloat(layer.style.top)/100*window.innerHeight+parseFloat(layer.style.height)/100*window.innerHeight > rect['top']+window.scrollY+canvas.height/dpr) {
        layer.style.top = `${(rect['top']+window.scrollY+canvas.height/dpr-parseFloat(layer.style.height)/100*window.innerHeight)/window.innerHeight*100}%`;
    }

    // Retrieve layer context
    const layerContext = layer.getContext('2d');

    // Set scale
    layerContext.scale(dpr, dpr);

    // Fill layer
    //layerContext.fillStyle = 'black';
    //layerContext.globalAlpha = 0.5;
    //layerContext.fillRect(0, 0, layer.width, layer.height);

    // Draw circle
    layerContext.strokeStyle = 'red';
    layerContext.lineWidth = 1.0;
    layerContext.beginPath();
    layerContext.arc(((result[0]-Math.PI)*scale+(1-xToW)*2*Math.PI)/(2*Math.PI)*canvas.width/dpr + offsetX/dpr + rect['left'] - parseFloat(layer.style.left)/100*window.innerWidth, (1-result[1]*scale+yToH)*canvas.height/2/dpr + offsetY/dpr + rect['top'] + window.scrollY - parseFloat(layer.style.top)/100*window.innerHeight, layer.width/8.0/dpr, 0, 2*Math.PI, true);
    layerContext.closePath();
    layerContext.stroke();
}

function presentPulsar() {
    // Retrieve pulsar store
    const pulsarStore = db.transaction(DB_PULSAR_STORE).objectStore(DB_PULSAR_STORE);

    // Get request
    const request = pulsarStore.get(result[6]);

    request.onerror = (event) => {
        // Retrieve box
        const box = document.getElementById('box');

        // Style box
        box.style.position = 'fixed';
        box.style.top = '55%';
        box.style.left = '20%';
        box.style.width = '60%';
        box.style.height = '20%';

        // Show message
        const para1 = document.createElement('p');
        para1.innerHTML = `${event.target.error} - IndexedDB get error.`;
        para1.style.fontFamily = 'ui-rounded';
        para1.style.fontSize = '1.2vw';
        box.appendChild(para1);

        const para2 = document.createElement('p');
        para2.innerHTML = 'How did you get here? Please tell me: <font color="#007aff">vela.yumeng@gmail.com</font>.';
        para2.style.fontFamily = 'ui-rounded';
        para2.style.fontSize = '1.2vw';
        box.appendChild(para2);
    };

    request.onsuccess = (event) => {
        if (typeof(event.target.result) === 'undefined') {
            // Retrieve box
            const box = document.getElementById('box');

            // Style box
            box.style.position = 'fixed';
            box.style.top = '55%';
            box.style.left = '20%';
            box.style.width = '60%';
            box.style.height = '20%';

            // Show message
            const para1 = document.createElement('p');
            para1.innerHTML = "Oops ... This pulsar doesn't seem to be in the database. This shouldn't happen and you shouldn't come here.";
            para1.style.fontFamily = 'system-ui';
            para1.style.fontSize = '1.2vw';
            box.appendChild(para1);

            const para2 = document.createElement('p');
            para2.innerHTML = 'How did you get here? Please tell me: <font color="#007aff">vela.yumeng@gmail.com</font>.';
            para2.style.fontFamily = 'system-ui';
            para2.style.fontSize = '1.2vw';
            box.appendChild(para2);
        } else {
            // Retrieve box
            const box = document.getElementById('box');

            // Clear existing subboxes
            while (box.firstChild) {box.removeChild(box.firstChild);}

            // Style box
            box.style.position = 'relative';
            box.style.top = '55%';
            box.style.left = '0%';
            box.style.width = '100%';
            box.style.height = 'auto';
            box.style.display = 'grid';
            box.style.gridAutoRows = '50vh';

            // Start time for animation 
            const startDate = new Date();
            const startTime = startDate.getTime();

            if (typeof(event.target.result.profile) === 'undefined') {
                // If profile unavailable, make one column
                box.style.gridTemplateColumns = '1fr';

                // Make subbox
                const subbox = document.createElement('div');
                subbox.style.display = 'grid';
                subbox.style.gridTemplateRows = '1fr 8fr';
                box.appendChild(subbox);

                // Make upper subsubbox
                const subsubbox_u = document.createElement('div');
                subsubbox_u.style.display = 'flex';
                subsubbox_u.style.alignItems = 'center';
                subbox.appendChild(subsubbox_u);

                // Make jname para
                const p_jname = document.createElement('p');
                p_jname.innerHTML = `PSR ${event.target.result.jname.replace('-', '\u2212')}`;
                p_jname.style.fontFamily = 'system-ui, ui-rounded, sans-serif, serif';
                p_jname.style.fontSize = '1.8vmin';
                p_jname.style.fontWeight = 400;
                subsubbox_u.appendChild(p_jname);

                // Make meta para
                if (event.target.result.meta !== 'na') {
                    const p_meta = document.createElement('p');
                    p_meta.innerHTML = `\xA0 ${event.target.result.meta.replace('_', ' ')}`;
                    p_meta.style.fontFamily = 'system-ui, ui-rounded, sans-serif, serif';
                    p_meta.style.fontSize = '1.6vmin';
                    p_meta.style.fontWeight = 400;
                    p_meta.style.color = 'dimgray';
                    subsubbox_u.appendChild(p_meta);
                }

                // Make lower subsubbox
                const subsubbox_l = document.createElement('div');
                subsubbox_l.style.display = 'grid';
                subsubbox_l.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80vmin, 1fr))';
                subsubbox_l.style.gridAutoRows = '10vmin';
                subbox.appendChild(subsubbox_l);

                if (event.target.result.raj !== 'na') {
                    // Make sub3box for raj
                    const sub3box_raj = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_raj);

                    // Make sub4box for raj text
                    const sub4box_raj_text = document.createElement('div');
                    sub4box_raj_text.style.width = '100%';
                    sub4box_raj_text.style.height = '20%';
                    sub4box_raj_text.style.position = 'relative';
                    sub4box_raj_text.style.top = '-10%';
                    sub4box_raj_text.style.left = '0%';
                    sub3box_raj.appendChild(sub4box_raj_text);

                    // Make canvas for raj text
                    const canvas_raj_text = document.createElement('canvas');
                    canvas_raj_text.style.width = '100%';
                    canvas_raj_text.style.height = '100%';
                    canvas_raj_text.style.position = 'relative';
                    canvas_raj_text.style.top = '0%';
                    canvas_raj_text.style.left = '0%';
                    sub4box_raj_text.appendChild(canvas_raj_text);

                    const dpr = window.devicePixelRatio;
                    const rect_raj_text = sub4box_raj_text.getBoundingClientRect();

                    canvas_raj_text.width = rect_raj_text.width*dpr;
                    canvas_raj_text.height = rect_raj_text.height*dpr;

                    const context_raj_text = canvas_raj_text.getContext('2d');
                    context_raj_text.scale(dpr, dpr);
                    context_raj_text.font = '1.4vmin system-ui';

                    let hour = 0;
                    let minute = 0;
                    let second = 0;

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_raj_text = window.setInterval(drawRajText, 100);

                    // Draw raj text
                    function drawRajText() {
                        // Clear canvas
                        context_raj_text.clearRect(0, 0, canvas_raj_text.width, canvas_raj_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // This raj degree
                        const thisRajDeg = deltaTime/5000 * event.target.result.rajDeg;

                        // Find h, m, s
                        hour = Math.floor(thisRajDeg/360*24);
                        minute = Math.floor((thisRajDeg/360*24 - hour)*60);
                        second = Math.round(((thisRajDeg/360*24 - hour)*60 - minute)*60*10)/10;

                        let hour_str;
                        if (hour<10) { hour_str =  `0${hour}`; } 
                        else { hour_str = hour.toString(); }

                        let minute_str;
                        if (minute<10) { minute_str = `0${minute}`; }
                        else { minute_str = minute.toString(); }

                        let second_str;
                        if (second<10) { second_str = `0${second}`; }
                        else { second_str = second.toString(); }

                        // Draw
                        context_raj_text.fillText(`R. A. (h:m:s): ${hour_str}:${minute_str}:${second_str}`, 0, 0.6*canvas_raj_text.height/dpr);

                        if (deltaTime > 4900.0) {
                            window.clearInterval(intId_raj_text);
                            context_raj_text.clearRect(0, 0, canvas_raj_text.width, canvas_raj_text.height);
                            context_raj_text.fillText(`R. A. (h:m:s): ${event.target.result.raj}`, 0, 0.6*canvas_raj_text.height/dpr);
                        }
                    }

                    // Make sub4box for raj pin
                    const sub4box_raj_pin = document.createElement('div');
                    sub4box_raj_pin.style.width = '100%';
                    sub4box_raj_pin.style.height = '20%';
                    sub4box_raj_pin.style.position = 'relative';
                    sub4box_raj_pin.style.top = '-10%';
                    sub4box_raj_pin.style.left = '0%';
                    sub3box_raj.appendChild(sub4box_raj_pin);
                    
                    // Make canvas for raj pin
                    const canvas_raj_pin = document.createElement('canvas');
                    canvas_raj_pin.style.width = '100%';
                    canvas_raj_pin.style.height = '100%';
                    canvas_raj_pin.style.position = 'relative';
                    canvas_raj_pin.style.top = '0%';
                    canvas_raj_pin.style.left = '0%';
                    sub4box_raj_pin.appendChild(canvas_raj_pin);

                    // Get bounding rectangle
                    const rect_raj_pin = sub4box_raj_pin.getBoundingClientRect();

                    canvas_raj_pin.width = rect_raj_pin.width*dpr;
                    canvas_raj_pin.height = rect_raj_pin.height*dpr;

                    const context_raj_pin = canvas_raj_pin.getContext('2d');
                    context_raj_pin.scale(dpr, dpr);
                    context_raj_pin.lineWidth = 0.5;

                    const intId_raj_pin = window.setInterval(drawRajPin, 10);

                    function drawRajPin() {
                        // Clear canvas
                        context_raj_pin.clearRect(0, 0, canvas_raj_pin.width, canvas_raj_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        const speed = 0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr/5000;

                        // Draw
                        context_raj_pin.beginPath();
                        context_raj_pin.moveTo(0.05*canvas_raj_pin.width/dpr+speed*deltaTime, 0.2*canvas_raj_pin.height/dpr);
                        context_raj_pin.lineTo(0.05*canvas_raj_pin.width/dpr+speed*deltaTime, 0.8*canvas_raj_pin.height/dpr);
                        context_raj_pin.closePath();
                        context_raj_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_raj_pin);
                            context_raj_pin.clearRect(0, 0, canvas_raj_pin.width, canvas_raj_pin.height);
                            context_raj_pin.beginPath();
                            context_raj_pin.moveTo(0.05*canvas_raj_pin.width/dpr+0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr, 0.2*canvas_raj_pin.height/dpr);
                            context_raj_pin.lineTo(0.05*canvas_raj_pin.width/dpr+0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr, 0.8*canvas_raj_pin.height/dpr);
                            context_raj_pin.closePath();
                            context_raj_pin.stroke();
                        }
                    }

                    // Make sub4box for raj scale
                    const sub4box_raj_scale = document.createElement('div');
                    sub4box_raj_scale.style.width = '100%';
                    sub4box_raj_scale.style.height = '60%';
                    sub4box_raj_scale.style.position = 'relative';
                    sub4box_raj_scale.style.top = '0%';
                    sub4box_raj_scale.style.left = '0%';
                    sub3box_raj.appendChild(sub4box_raj_scale);

                    // Make canvas for raj scale
                    const canvas_raj_scale = document.createElement('canvas');
                    canvas_raj_scale.style.width = '100%';
                    canvas_raj_scale.style.height = '100%';
                    canvas_raj_scale.style.position = 'relative';
                    canvas_raj_scale.style.top = '0%';
                    canvas_raj_scale.style.left = '0%';
                    sub4box_raj_scale.appendChild(canvas_raj_scale);

                    // Get bounding rectangle
                    const rect_raj_scale = sub4box_raj_scale.getBoundingClientRect();

                    canvas_raj_scale.width = rect_raj_scale.width*dpr;
                    canvas_raj_scale.height = rect_raj_scale.height*dpr;

                    const context_raj_scale = canvas_raj_scale.getContext('2d');
                    context_raj_scale.scale(dpr, dpr);

                    // Group raj degree numbers
                    const rajDegs = positions.filter(posn => posn[0]>-1.0).map(posn => posn[0]).sort((deg1, deg2) => {
                        if (deg1 < deg2) {
                            return -1;
                        }
                    });
                    
                    // Histogram boundaries
                    const boundMin = 0.99*rajDegs[0]; 
                    const boundMax = 1.01*rajDegs[rajDegs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                       const count = rajDegs.filter(deg => deg > boundMin+i*binSize && deg <= boundMin+(i+1)*binSize).length;
                       counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (let i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_raj_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_raj_scale.fillRect(0.05*canvas_raj_scale.width/dpr+i*0.9*canvas_raj_scale.width/dpr/binNum, 0, (0.9*canvas_raj_scale.width/dpr-4*0.9*canvas_raj_scale.width/dpr/binNum)/binNum, 0.5*canvas_raj_scale.height/dpr);
                    }

                    // Label
                    context_raj_scale.font = '1.4vmin system-ui';
                    context_raj_scale.fillStyle = 'black';
                    for (let i=0; i<5; i++) {
                        const hour = 6*i;
                        let label = hour.toString();
                        if (i === 0) { label += '(h)'; }
                        context_raj_scale.fillText(label, (0.05+0.225*i)*canvas_raj_scale.width/dpr, 0.8*canvas_raj_scale.height/dpr);
                    }
                }

                // Make sub3box for decj
                if (event.target.result.decj !== 'na') {
                    const sub3box_decj = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_decj);

                    // Make sub4box for decj text
                    const sub4box_decj_text = document.createElement('div');
                    sub4box_decj_text.style.width = '100%';
                    sub4box_decj_text.style.height = '20%';
                    sub4box_decj_text.style.position = 'relative';
                    sub4box_decj_text.style.top = '-10%';
                    sub4box_decj_text.style.left = '0%';
                    sub3box_decj.appendChild(sub4box_decj_text);

                    // Make canvas for decj text
                    const canvas_decj_text = document.createElement('canvas');
                    canvas_decj_text.style.width = '100%';
                    canvas_decj_text.style.height = '100%';
                    canvas_decj_text.style.position = 'relative';
                    canvas_decj_text.style.top = '0%';
                    canvas_decj_text.style.left = '0%';
                    sub4box_decj_text.appendChild(canvas_decj_text);

                    const dpr = window.devicePixelRatio;
                    const rect_decj_text = sub4box_decj_text.getBoundingClientRect();

                    canvas_decj_text.width = rect_decj_text.width*dpr;
                    canvas_decj_text.height = rect_decj_text.height*dpr;

                    const context_decj_text = canvas_decj_text.getContext('2d');
                    context_decj_text.scale(dpr, dpr);
                    context_decj_text.font = '1.4vmin system-ui';

                    let degree = 0;
                    let minute = 0;
                    let second = 0;

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_decj_text = window.setInterval(drawDecjText, 100);

                    // Draw decj text
                    function drawDecjText() {
                        // Clear canvas
                        context_decj_text.clearRect(0, 0, canvas_decj_text.width, canvas_decj_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // This decj degree
                        const thisDecjDeg = deltaTime/5000 * event.target.result.decjDeg;

                        // Find d, m, s
                        degree = Math.trunc(thisDecjDeg);
                        minute = Math.trunc(Math.abs(thisDecjDeg - degree)*60);
                        second = Math.round((Math.abs(thisDecjDeg - degree)*60 - minute)*60*10)/10;

                        let degree_str;
                        if (degree < 0) {
                            if (degree > -10) {
                                degree_str = `\u22120${Math.abs(degree)}`;
                            } else {
                                degree_str = `\u2212${Math.abs(degree)}`;
                            }
                        } else if (degree > 0) {
                            if (degree < 10) {
                                degree_str = `+0${degree}`;
                            } else {
                                degree_str = `+${degree}`;
                            }
                        } else {
                            degree_str = '0';
                        }

                        let minute_str;
                        if (minute < 10) { minute_str = `0${minute}`; } 
                        else { minute_str = minute.toString(); }

                        let second_str;
                        if (second < 10) { second_str = `0${second}`; } 
                        else { second_str = second.toString(); }

                        // Draw
                        context_decj_text.fillText(`Dec. (d:m:s): ${degree_str}:${minute_str}:${second_str}`, 0, 0.6*canvas_decj_text.height/dpr);

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_decj_text);
                            context_decj_text.clearRect(0, 0, canvas_decj_text.width, canvas_decj_text.height);
                            if (parseFloat(event.target.result.decjDeg)<0) {
                                context_decj_text.fillText(`Dec.: (d:m:s): ${event.target.result.decj.replace('-', '\u2212')}`, 0, 0.6*canvas_decj_text.height/dpr);
                            } else {
                                context_decj_text.fillText(`Dec.: (d:m:s): ${event.target.result.decj}`, 0, 0.6*canvas_decj_text.height/dpr);
                            }
                        }
                    }

                    // Make sub4box for decj pin
                    const sub4box_decj_pin = document.createElement('div');
                    sub4box_decj_pin.style.width = '100%';
                    sub4box_decj_pin.style.height = '20%';
                    sub4box_decj_pin.style.position = 'relative';
                    sub4box_decj_pin.style.top = '-10%';
                    sub4box_decj_pin.style.left = '0%';
                    sub3box_decj.appendChild(sub4box_decj_pin);

                    // Make canvas for decj pin
                    const canvas_decj_pin = document.createElement('canvas');
                    canvas_decj_pin.style.width = '100%';
                    canvas_decj_pin.style.height = '100%';
                    canvas_decj_pin.style.position = 'relative';
                    canvas_decj_pin.style.top = '0%';
                    canvas_decj_pin.style.left = '0%';
                    sub4box_decj_pin.appendChild(canvas_decj_pin);

                    // Get bounding rectangle
                    const rect_decj_pin = sub4box_decj_pin.getBoundingClientRect();

                    canvas_decj_pin.width = rect_decj_pin.width*dpr;
                    canvas_decj_pin.height = rect_decj_pin.height*dpr;

                    const context_decj_pin = canvas_decj_pin.getContext('2d');
                    context_decj_pin.scale(dpr, dpr);
                    context_decj_pin.lineWidth = 0.5;

                    const intId_decj_pin = window.setInterval(drawDecjPin, 10);

                    function drawDecjPin() {
                        // Clear canvas
                        context_decj_pin.clearRect(0, 0, canvas_decj_pin.width, canvas_decj_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        const speed = 0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90/5000;

                        // Draw
                        context_decj_pin.beginPath();
                        context_decj_pin.moveTo(0.5*canvas_decj_pin.width/dpr+speed*deltaTime, 0.2*canvas_decj_pin.height/dpr);
                        context_decj_pin.lineTo(0.5*canvas_decj_pin.width/dpr+speed*deltaTime, 0.8*canvas_decj_pin.height/dpr);
                        context_decj_pin.closePath();
                        context_decj_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_decj_pin);
                            context_decj_pin.clearRect(0, 0, canvas_decj_pin.width, canvas_decj_pin.height);
                            context_decj_pin.beginPath();
                            context_decj_pin.moveTo(0.5*canvas_decj_pin.width/dpr+0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90, 0.2*canvas_decj_pin.height/dpr);
                            context_decj_pin.lineTo(0.5*canvas_decj_pin.width/dpr+0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90, 0.8*canvas_decj_pin.height/dpr);
                            context_decj_pin.closePath();
                            context_decj_pin.stroke();
                        }
                    }

                    // Make sub4box for decj scale
                    const sub4box_decj_scale = document.createElement('div');
                    sub4box_decj_scale.style.width = '100%';
                    sub4box_decj_scale.style.height = '60%';
                    sub4box_decj_scale.style.position = 'relative';
                    sub4box_decj_scale.style.top = '0%';
                    sub4box_decj_scale.style.left = '0%';
                    sub3box_decj.appendChild(sub4box_decj_scale);

                    // Make canvas for decj scale
                    const canvas_decj_scale = document.createElement('canvas');
                    canvas_decj_scale.style.width = '100%';
                    canvas_decj_scale.style.height = '100%';
                    canvas_decj_scale.style.position = 'relative';
                    canvas_decj_scale.style.top = '0%';
                    canvas_decj_scale.style.left = '0%';
                    sub4box_decj_scale.appendChild(canvas_decj_scale);

                    // Get bounding rectangle
                    const rect_decj_scale = sub4box_decj_scale.getBoundingClientRect();

                    canvas_decj_scale.width = rect_decj_scale.width*dpr;
                    canvas_decj_scale.height = rect_decj_scale.height*dpr;

                    const context_decj_scale = canvas_decj_scale.getContext('2d');
                    context_decj_scale.scale(dpr, dpr);

                    // Group decj degree numbers
                    const decjDegs = positions.filter(posn => posn[1]>-91.0).map(posn => posn[1]).sort((deg1, deg2) => {
                        if (deg1 < deg2) {
                            return -1;
                        }
                    });
                    
                    // Histogram boundaries
                    const boundMin = 0.99*decjDegs[0];
                    const boundMax = 1.01*decjDegs[decjDegs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = decjDegs.filter(deg => deg > boundMin+i*binSize && deg <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (let i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_decj_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_decj_scale.fillRect(0.05*canvas_decj_scale.width/dpr+i*0.9*canvas_decj_scale.width/dpr/binNum, 0, (0.9*canvas_decj_scale.width/dpr - 4*0.9*canvas_decj_scale.width/dpr/binNum)/binNum, 0.5*canvas_decj_scale.height/dpr);
                    }

                    // Label
                    context_decj_scale.font = '1.4vmin system-ui';
                    context_decj_scale.fillStyle = 'black';
                    for (let i=0; i<5; i++) {
                        const degree = -90+i*45;
                        let label;
                        if (degree < 0) {
                            label = `\u2212${Math.abs(degree)}`;
                        } else if (degree > 0) {
                            label = `+${degree}`;
                        } else {
                            label = '0';
                        }
                        if (i === 0) { label += '(d)'; }
                        context_decj_scale.fillText(label, (0.05+0.225*i)*canvas_decj_scale.width/dpr, 0.8*canvas_decj_scale.height/dpr);
                    }
                }

                // Make sub3box for p0
                if (event.target.result.p0 !== 'na') {
                    const sub3box_p0 = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_p0);

                    // Make sub4box for p0 text
                    const sub4box_p0_text = document.createElement('div');
                    sub4box_p0_text.style.width = '100%';
                    sub4box_p0_text.style.height = '20%';
                    sub4box_p0_text.style.position = 'relative';
                    sub4box_p0_text.style.top = '-10%';
                    sub4box_p0_text.style.left = '0%';
                    sub3box_p0.appendChild(sub4box_p0_text);

                    // Make canvas for p0 text
                    const canvas_p0_text = document.createElement('canvas');
                    canvas_p0_text.style.width = '100%';
                    canvas_p0_text.style.height = '100%';
                    canvas_p0_text.style.position = 'relative';
                    canvas_p0_text.style.top = '0%';
                    canvas_p0_text.style.left = '0%';
                    sub4box_p0_text.appendChild(canvas_p0_text);

                    const dpr = window.devicePixelRatio;
                    const rect_p0_text = sub4box_p0_text.getBoundingClientRect();

                    canvas_p0_text.width = rect_p0_text.width*dpr;
                    canvas_p0_text.height = rect_p0_text.height*dpr;

                    const context_p0_text = canvas_p0_text.getContext('2d');
                    context_p0_text.scale(dpr, dpr);
                    context_p0_text.font = '1.4vmin system-ui';

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_p0_text = window.setInterval(drawP0Text, 100);

                    function drawP0Text() {
                        // Clear canvas
                        context_p0_text.clearRect(0, 0, canvas_p0_text.width, canvas_p0_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // This period
                        const thisP = deltaTime/5000 * parseFloat(event.target.result.p0);

                        // Draw
                        context_p0_text.fillText(`Period (s): ${thisP.toFixed(6)}`, 0, 0.6*canvas_p0_text.height/dpr);

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_p0_text);
                            context_p0_text.clearRect(0, 0, canvas_p0_text.width, canvas_p0_text.height);
                            context_p0_text.fillText(`Period (s): ${event.target.result.p0}`, 0, 0.6*canvas_p0_text.height/dpr);
                        }
                    }

                    // Make sub4box for p0 pin
                    const sub4box_p0_pin = document.createElement('div');
                    sub4box_p0_pin.style.width = '100%';
                    sub4box_p0_pin.style.height = '20%';
                    sub4box_p0_pin.style.position = 'relative';
                    sub4box_p0_pin.style.top = '-10%';
                    sub4box_p0_pin.style.left = '0%';
                    sub3box_p0.appendChild(sub4box_p0_pin);

                    // Make canvas for p0 pin
                    const canvas_p0_pin = document.createElement('canvas');
                    canvas_p0_pin.style.width = '100%';
                    canvas_p0_pin.style.height = '100%';
                    canvas_p0_pin.style.position = 'relative';
                    canvas_p0_pin.style.top = '0%';
                    canvas_p0_pin.style.left = '0%';
                    sub4box_p0_pin.appendChild(canvas_p0_pin);

                    const rect_p0_pin = sub4box_p0_pin.getBoundingClientRect();

                    canvas_p0_pin.width = rect_p0_pin.width*dpr;
                    canvas_p0_pin.height = rect_p0_pin.height*dpr;

                    const context_p0_pin = canvas_p0_pin.getContext('2d');
                    context_p0_pin.scale(dpr, dpr);
                    context_p0_pin.lineWidth = 0.5;
                    
                    const intId_p0_pin = window.setInterval(drawP0Pin, 10);

                    // Log10 periods
                    const lgPs = positions.filter(posn => !Number.isNaN(posn[3])).map(posn => Math.log10(posn[3])).sort((lgP1, lgP2) => {
                        if (lgP1 < lgP2) {
                            return -1;
                        }
                    });
                    
                    // Speed
                    const speed = 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]) / 5000;

                    // Draw p0 pin
                    function drawP0Pin() {
                        // Clear canvas
                        context_p0_pin.clearRect(0, 0, canvas_p0_pin.width, canvas_p0_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // Draw
                        context_p0_pin.beginPath();
                        context_p0_pin.moveTo(0.05*canvas_p0_pin.width/dpr+speed*deltaTime, 0.2*canvas_p0_pin.height/dpr);
                        context_p0_pin.lineTo(0.05*canvas_p0_pin.width/dpr+speed*deltaTime, 0.8*canvas_p0_pin.height/dpr);
                        context_p0_pin.closePath();
                        context_p0_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_p0_pin);
                            context_p0_pin.clearRect(0, 0, canvas_p0_pin.width, canvas_p0_pin.height);
                            context_p0_pin.beginPath();
                            context_p0_pin.moveTo(0.05*canvas_p0_pin.width/dpr + 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]), 0.2*canvas_p0_pin.height/dpr);
                            context_p0_pin.lineTo(0.05*canvas_p0_pin.width/dpr + 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]), 0.8*canvas_p0_pin.height/dpr);
                            context_p0_pin.closePath();
                            context_p0_pin.stroke();
                        }
                    }

                    // Make sub4box for p0 scale
                    const sub4box_p0_scale = document.createElement('div');
                    sub4box_p0_scale.style.width = '100%';
                    sub4box_p0_scale.style.height = '60%';
                    sub4box_p0_scale.style.position = 'relative';
                    sub4box_p0_scale.style.top = '0%';
                    sub4box_p0_scale.style.left = '0%';
                    sub3box_p0.appendChild(sub4box_p0_scale);

                    // Make canvas for p0 scale
                    const canvas_p0_scale = document.createElement('canvas');
                    canvas_p0_scale.style.width = '100%';
                    canvas_p0_scale.style.height = '100%';
                    canvas_p0_scale.style.position = 'relative';
                    canvas_p0_scale.style.top = '0%';
                    canvas_p0_scale.style.left = '0%';
                    sub4box_p0_scale.appendChild(canvas_p0_scale);

                    // Get bounding rectangle
                    const rect_p0_scale = sub4box_p0_scale.getBoundingClientRect();

                    canvas_p0_scale.width = rect_p0_scale.width*dpr;
                    canvas_p0_scale.height = rect_p0_scale.height*dpr;

                    const context_p0_scale = canvas_p0_scale.getContext('2d');
                    context_p0_scale.scale(dpr, dpr);

                    // Histogram boundaries
                    const boundMin = 0.99*lgPs[0];
                    const boundMax = 1.01*lgPs[lgPs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = lgPs.filter(lgP => lgP > boundMin+i*binSize && lgP <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_p0_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_p0_scale.fillRect(0.05*canvas_p0_scale.width/dpr+i*0.9*canvas_p0_scale.width/dpr/binNum, 0, (0.9*canvas_p0_scale.width/dpr-4*0.9*canvas_p0_scale.width/dpr/binNum)/binNum, 0.5*canvas_p0_scale.height/dpr);
                    }

                    // Label
                    context_p0_scale.font = '1.4vmin system-ui';
                    context_p0_scale.fillStyle = 'black';
                    for (let i=0; i<8; i++) {
                        const lgP = -2.5+0.5*i;
                        let label;
                        if (i !== 7) {
                            label = Math.pow(10, lgP).toPrecision(1);
                        } else {
                            label = Math.pow(10, lgP).toPrecision(2);
                        }
                        context_p0_scale.fillText(label, 0.05*canvas_p0_scale.width/dpr + 0.9*canvas_p0_scale.width/dpr*(Math.log10(parseFloat(label))-lgPs[0])/(lgPs[lgPs.length-1]-lgPs[0]), 0.8*canvas_p0_scale.height/dpr);
                    }
                }

                // Make sub3box for dm
                if (event.target.result.dm !== 'na') {
                    const sub3box_dm = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_dm);

                    // Make sub4box for dm text
                    const sub4box_dm_text = document.createElement('div');
                    sub4box_dm_text.style.width = '100%';
                    sub4box_dm_text.style.height = '20%';
                    sub4box_dm_text.style.position = 'relative';
                    sub4box_dm_text.style.top = '-10%';
                    sub4box_dm_text.style.left = '0%';
                    sub3box_dm.appendChild(sub4box_dm_text);

                    // Make canvas for dm text
                    const canvas_dm_text = document.createElement('canvas');
                    canvas_dm_text.style.width = '100%';
                    canvas_dm_text.style.height = '100%';
                    canvas_dm_text.style.position = 'relative';
                    canvas_dm_text.style.top = '0%';
                    canvas_dm_text.style.left = '0%';
                    sub4box_dm_text.appendChild(canvas_dm_text);

                    const dpr = window.devicePixelRatio;
                    const rect_dm_text = sub4box_dm_text.getBoundingClientRect();

                    canvas_dm_text.width = rect_dm_text.width*dpr;
                    canvas_dm_text.height = rect_dm_text.height*dpr;

                    const context_dm_text = canvas_dm_text.getContext('2d');
                    context_dm_text.scale(dpr, dpr);
                    context_dm_text.font = '1.4vmin system-ui';

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_dm_text = window.setInterval(drawDMText, 100);

                    function drawDMText() {
                        // Clear canvas
                        context_dm_text.clearRect(0, 0, canvas_dm_text.width, canvas_dm_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime()-startTime;

                        // This DM
                        const thisDM = deltaTime/5000 * parseFloat(event.target.result.dm);

                        // Draw
                        context_dm_text.fillText(`DM (pc cm^-3): ${thisDM.toFixed(2)}`, 0, 0.6*canvas_dm_text.height/dpr);

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_dm_text);
                            context_dm_text.clearRect(0, 0, canvas_dm_text.width, canvas_dm_text.height);
                            context_dm_text.fillText(`DM (pc cm^-3): ${event.target.result.dm}`, 0, 0.6*canvas_dm_text.height/dpr);
                        }
                    }

                    // Make sub4box for dm pin
                    const sub4box_dm_pin = document.createElement('div');
                    sub4box_dm_pin.style.width = '100%';
                    sub4box_dm_pin.style.height = '20%';
                    sub4box_dm_pin.style.position = 'relative';
                    sub4box_dm_pin.style.top = '-10%';
                    sub4box_dm_pin.style.left = '0%';
                    sub3box_dm.appendChild(sub4box_dm_pin);

                    // Make canvas for dm pin
                    const canvas_dm_pin = document.createElement('canvas');
                    canvas_dm_pin.style.width = '100%';
                    canvas_dm_pin.style.height = '100%';
                    canvas_dm_pin.style.position = 'relative';
                    canvas_dm_pin.style.top = '0%';
                    canvas_dm_pin.style.left = '0%';
                    sub4box_dm_pin.appendChild(canvas_dm_pin);

                    const rect_dm_pin = sub4box_dm_pin.getBoundingClientRect();

                    canvas_dm_pin.width = rect_dm_pin.width*dpr;
                    canvas_dm_pin.height = rect_dm_pin.height*dpr;

                    const context_dm_pin = canvas_dm_pin.getContext('2d');
                    context_dm_pin.scale(dpr, dpr);
                    context_dm_pin.lineWidth = 0.5;

                    // Log10 dm values
                    const lgDMs = positions.filter(posn => !Number.isNaN(posn[2])).map(posn => Math.log10(posn[2])).sort((lgDM1, lgDM2) => {
                        if (lgDM1 < lgDM2) {
                            return -1;
                        }
                    });
                    
                    // Speed
                    const speed = 0.9*canvas_dm_pin.width/dpr * (Math.log10(parseFloat(event.target.result.dm)) - lgDMs[0]) / (lgDMs[lgDMs.length-1] - lgDMs[0]) / 5000;

                    const intId_dm_pin = window.setInterval(drawDMPin, 10);

                    // Draw DM pin
                    function drawDMPin() {
                        // Clear canvas
                        context_dm_pin.clearRect(0, 0, canvas_dm_pin.width, canvas_dm_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // Draw
                        context_dm_pin.beginPath();
                        context_dm_pin.moveTo(0.05*canvas_dm_pin.width/dpr+speed*deltaTime, 0.2*canvas_dm_pin.height/dpr);
                        context_dm_pin.lineTo(0.05*canvas_dm_pin.width/dpr+speed*deltaTime, 0.8*canvas_dm_pin.height/dpr);
                        context_dm_pin.closePath();
                        context_dm_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_dm_pin);
                            context_dm_pin.clearRect(0, 0, canvas_dm_pin.width, canvas_dm_pin.height);
                            context_dm_pin.beginPath();
                            context_dm_pin.moveTo(0.05*canvas_dm_pin.width/dpr+0.9*canvas_dm_pin.width/dpr*(Math.log10(parseFloat(event.target.result.dm))-lgDMs[0])/(lgDMs[lgDMs.length-1]-lgDMs[0]), 0.2*canvas_dm_pin.height/dpr);
                            context_dm_pin.lineTo(0.05*canvas_dm_pin.width/dpr+0.9*canvas_dm_pin.width/dpr*(Math.log10(parseFloat(event.target.result.dm))-lgDMs[0])/(lgDMs[lgDMs.length-1]-lgDMs[0]), 0.8*canvas_dm_pin.height/dpr);
                            context_dm_pin.closePath();
                            context_dm_pin.stroke();
                        }
                    }

                    // Make sub4box for dm scale
                    const sub4box_dm_scale = document.createElement('div');
                    sub4box_dm_scale.style.width = '100%';
                    sub4box_dm_scale.style.height = '60%';
                    sub4box_dm_scale.style.position = 'relative';
                    sub4box_dm_scale.style.top = '0%';
                    sub4box_dm_scale.style.left = '0%';
                    sub3box_dm.appendChild(sub4box_dm_scale);

                    // Make canvas for dm scale
                    const canvas_dm_scale = document.createElement('canvas');
                    canvas_dm_scale.style.width = '100%';
                    canvas_dm_scale.style.height = '100%';
                    canvas_dm_scale.style.position = 'relative';
                    canvas_dm_scale.style.top = '0%';
                    canvas_dm_scale.style.left = '0%';
                    sub4box_dm_scale.appendChild(canvas_dm_scale);

                    // Get bounding rectangle
                    const rect_dm_scale = sub4box_dm_scale.getBoundingClientRect();

                    canvas_dm_scale.width = rect_dm_scale.width*dpr;
                    canvas_dm_scale.height = rect_dm_scale.height*dpr;

                    const context_dm_scale = canvas_dm_scale.getContext('2d');
                    context_dm_scale.scale(dpr, dpr);

                    // Histogram boundaries
                    const boundMin = 0.99*lgDMs[0];
                    const boundMax = 1.01*lgDMs[lgDMs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = lgDMs.filter(lgDM => lgDM > boundMin+i*binSize && lgDM <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_dm_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_dm_scale.fillRect(0.05*canvas_dm_scale.width/dpr+i*0.9*canvas_dm_scale.width/dpr/binNum, 0, (0.9*canvas_dm_scale.width/dpr-4*0.9*canvas_dm_scale.width/dpr/binNum)/binNum, 0.5*canvas_dm_scale.height/dpr);
                    }

                    // Label
                    context_dm_scale.font = '1.4vmin system-ui';
                    context_dm_scale.fillStyle = 'black';
                    for (let i=0; i<6; i++) {
                        const lgDM = 0.5+0.5*i;
                        let label = Math.pow(10, lgDM).toFixed(0);
                        if (label === '32') { label = '30'; }
                        if (label === '316') { label = '300'; }
                        context_dm_scale.fillText(label, 0.05*canvas_dm_scale.width/dpr + 0.9*canvas_dm_scale.width/dpr*(Math.log10(parseFloat(label)) - lgDMs[0])/(lgDMs[lgDMs.length-1] - lgDMs[0]), 0.8*canvas_dm_scale.height/dpr);
                    }
                }

                // Make sub3box for pmra
                if (event.target.result.pmra !== 'na') {
                    const sub3box_pmra = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_pmra);

                    // Make sub4box for pmra text
                    const sub4box_pmra_text = document.createElement('div');
                    sub4box_pmra_text.style.width = '100%';
                    sub4box_pmra_text.style.height = '20%';
                    sub4box_pmra_text.style.position = 'relative';
                    sub4box_pmra_text.style.top = '-10%';
                    sub4box_pmra_text.style.left = '0%';
                    sub3box_pmra.appendChild(sub4box_pmra_text);

                    // Make canvas for pmra text
                    const canvas_pmra_text = document.createElement('canvas');
                    canvas_pmra_text.style.width = '100%';
                    canvas_pmra_text.style.height = '100%';
                    canvas_pmra_text.style.position = 'relative';
                    canvas_pmra_text.style.top = '0%';
                    canvas_pmra_text.style.left = '0%';
                    sub4box_pmra_text.appendChild(canvas_pmra_text);

                    const dpr = window.devicePixelRatio;
                    const rect_pmra_text = sub4box_pmra_text.getBoundingClientRect();

                    canvas_pmra_text.width = rect_pmra_text.width*dpr;
                    canvas_pmra_text.height = rect_pmra_text.height*dpr;

                    const context_pmra_text = canvas_pmra_text.getContext('2d');
                    context_pmra_text.scale(dpr, dpr);
                    context_pmra_text.font = '1.4vmin system-ui';

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_pmra_text = window.setInterval(drawPMRAText, 100);

                    function drawPMRAText() {
                        // Clear canvas
                        context_pmra_text.clearRect(0, 0, canvas_pmra_text.width, canvas_pmra_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime()-startTime;

                        // This pmra
                        const thisPMRA = deltaTime/5000 * parseFloat(event.target.result.pmra);

                        // Draw
                        if (thisPMRA < 0) {
                            context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): \u2212${Math.abs(thisPMRA).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                        } else {
                            context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): ${thisPMRA.toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                        }

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_pmra_text);
                            context_pmra_text.clearRect(0, 0, canvas_pmra_text.width, canvas_pmra_text.height);
                            if (parseFloat(event.target.result.pmra) < 0) {
                                context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): \u2212${Math.abs(parseFloat(event.target.result.pmra)).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                            } else {
                                context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): ${parseFloat(event.target.result.pmra).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                            }
                        }
                    }

                    // Make sub4box for pmra pin
                    const sub4box_pmra_pin = document.createElement('div');
                    sub4box_pmra_pin.style.width = '100%';
                    sub4box_pmra_pin.style.height = '20%';
                    sub4box_pmra_pin.style.position = 'relative';
                    sub4box_pmra_pin.style.top = '-10%';
                    sub4box_pmra_pin.style.left = '0%';
                    sub3box_pmra.appendChild(sub4box_pmra_pin);

                    // Make canvas for pmra pin
                    const canvas_pmra_pin = document.createElement('canvas');
                    canvas_pmra_pin.style.width = '100%';
                    canvas_pmra_pin.style.height = '100%';
                    canvas_pmra_pin.style.position = 'relative';
                    canvas_pmra_pin.style.top = '0%';
                    canvas_pmra_pin.style.left = '0%';
                    sub4box_pmra_pin.appendChild(canvas_pmra_pin);

                    const rect_pmra_pin = sub4box_pmra_pin.getBoundingClientRect();

                    canvas_pmra_pin.width = rect_pmra_pin.width*dpr;
                    canvas_pmra_pin.height = rect_pmra_pin.height*dpr;

                    const context_pmra_pin = canvas_pmra_pin.getContext('2d');
                    context_pmra_pin.scale(dpr, dpr);
                    context_pmra_pin.lineWidth = 0.5;

                    // pmra values
                    const PMRAs = positions.filter(posn => !Number.isNaN(posn[4])).map(posn => posn[4]).sort((pmra1, pmra2) => {
                        if (pmra1 < pmra2) {
                            return -1;
                        }
                    });

                    const intId_pmra_pin = window.setInterval(drawPMRAPin, 10);

                    // Speed
                    let speed;
                    if (parseFloat(event.target.result.pmra) > 0) {
                        speed = +PMRAs[PMRAs.length-1]/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr*parseFloat(event.target.result.pmra)/PMRAs[PMRAs.length-1]/5000;
                    } else if (parseFloat(event.target.result.pmra) < 0) {
                        speed = -Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr*parseFloat(event.target.result.pmra)/PMRAs[0]/5000;
                    } else {
                        speed = 0;
                    }

                    function drawPMRAPin() {
                        // Clear canvas
                        context_pmra_pin.clearRect(0, 0, canvas_pmra_pin.width, canvas_pmra_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // Draw
                        context_pmra_pin.beginPath();
                        context_pmra_pin.moveTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*deltaTime, 0.2*canvas_pmra_pin.height/dpr);
                        context_pmra_pin.lineTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*deltaTime, 0.8*canvas_pmra_pin.height/dpr);
                        context_pmra_pin.closePath();
                        context_pmra_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_pmra_pin);
                            context_pmra_pin.clearRect(0, 0, canvas_pmra_pin.width, canvas_pmra_pin.height);
                            context_pmra_pin.beginPath();
                            context_pmra_pin.moveTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*5000, 0.2*canvas_pmra_pin.height/dpr);
                            context_pmra_pin.lineTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*5000, 0.8*canvas_pmra_pin.height/dpr);
                            context_pmra_pin.closePath();
                            context_pmra_pin.stroke();
                        }
                    }

                    // Make sub4box for pmra scale
                    const sub4box_pmra_scale = document.createElement('div');
                    sub4box_pmra_scale.style.width = '100%';
                    sub4box_pmra_scale.style.height = '60%';
                    sub4box_pmra_scale.style.position = 'relative';
                    sub4box_pmra_scale.style.top = '0%';
                    sub4box_pmra_scale.style.left = '0%';
                    sub3box_pmra.appendChild(sub4box_pmra_scale);

                    // Make canvas for pmra scale
                    const canvas_pmra_scale = document.createElement('canvas');
                    canvas_pmra_scale.style.width = '100%';
                    canvas_pmra_scale.style.height = '100%';
                    canvas_pmra_scale.style.position = 'relative';
                    canvas_pmra_scale.style.top = '0%';
                    canvas_pmra_scale.style.left = '0%';
                    sub4box_pmra_scale.appendChild(canvas_pmra_scale);

                    // Get bounding rectangle
                    const rect_pmra_scale = sub4box_pmra_scale.getBoundingClientRect();

                    canvas_pmra_scale.width = rect_pmra_scale.width*dpr;
                    canvas_pmra_scale.height = rect_pmra_scale.height*dpr;

                    const context_pmra_scale = canvas_pmra_scale.getContext('2d');
                    context_pmra_scale.scale(dpr, dpr);

                    // Histogram bounds
                    const boundMin = 0.99*PMRAs[0];
                    const boundMax = 1.01*PMRAs[PMRAs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = PMRAs.filter(pmra => pmra > boundMin+i*binSize && pmra <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (let i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_pmra_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_pmra_scale.fillRect(0.05*canvas_pmra_scale.width/dpr+i*0.9*canvas_pmra_scale.width/dpr/binNum, 0, (0.9*canvas_pmra_scale.width/dpr - 4*0.9*canvas_pmra_scale.width/dpr/binNum)/binNum, 0.5*canvas_pmra_scale.height/dpr);
                    }

                    // Label
                    context_pmra_scale.font = '1.4vmin system-ui';
                    context_pmra_scale.fillStyle = 'black';
                    for (let i=0; i<9; i++) {
                        const pmra = -100+i*50;
                        let label;
                        if (pmra<0) {
                            label = `\u2212${Math.abs(pmra)}`;
                        } else if (pmra>0) {
                            label = `+${pmra}`;
                        } else {
                            label = '0';
                        }
                        context_pmra_scale.fillText(label, 0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+pmra/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_scale.width/dpr, 0.8*canvas_pmra_scale.height/dpr);
                    }
                }

                // Make sub3box for pmdec
                if (event.target.result.pmdec !== 'na') {
                    const sub3box_pmdec = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_pmdec);

                    // Make sub4box for pmdec text
                    const sub4box_pmdec_text = document.createElement('div');
                    sub4box_pmdec_text.style.width = '100%';
                    sub4box_pmdec_text.style.height = '20%';
                    sub4box_pmdec_text.style.position = 'relative';
                    sub4box_pmdec_text.style.top = '-10%';
                    sub4box_pmdec_text.style.left = '0%';
                    sub3box_pmdec.appendChild(sub4box_pmdec_text);

                    // Make canvas for pmdec text
                    const canvas_pmdec_text = document.createElement('canvas');
                    canvas_pmdec_text.style.width = '100%';
                    canvas_pmdec_text.style.height = '100%';
                    canvas_pmdec_text.style.position = 'relative';
                    canvas_pmdec_text.style.top = '0%';
                    canvas_pmdec_text.style.left = '0%';
                    sub4box_pmdec_text.appendChild(canvas_pmdec_text);

                    const dpr = window.devicePixelRatio;
                    const rect_pmdec_text = sub4box_pmdec_text.getBoundingClientRect();

                    canvas_pmdec_text.width = rect_pmdec_text.width*dpr;
                    canvas_pmdec_text.height = rect_pmdec_text.height*dpr;

                    const context_pmdec_text = canvas_pmdec_text.getContext('2d');
                    context_pmdec_text.scale(dpr, dpr);
                    context_pmdec_text.font = '1.4vmin system-ui';

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_pmdec_text = window.setInterval(drawPMDecText, 100);

                    function drawPMDecText() {
                        // Clear canvas
                        context_pmdec_text.clearRect(0, 0, canvas_pmdec_text.width, canvas_pmdec_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime()-startTime;

                        // This pmdec
                        const thisPMDec = deltaTime/5000 * parseFloat(event.target.result.pmdec);

                        // Draw
                        if (thisPMDec < 0) {
                            context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): \u2212${Math.abs(thisPMDec).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                        } else {
                            context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): ${Math.abs(thisPMDec).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                        }

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_pmdec_text);
                            context_pmdec_text.clearRect(0, 0, canvas_pmdec_text.width, canvas_pmdec_text.height);
                            if (parseFloat(event.target.result.pmdec) < 0) {
                                context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): \u2212${Math.abs(parseFloat(event.target.result.pmdec)).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                            } else {
                                context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): ${Math.abs(parseFloat(event.target.result.pmdec)).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                            }
                        }
                    }

                    // Make sub4box for pmdec pin
                    const sub4box_pmdec_pin = document.createElement('div');
                    sub4box_pmdec_pin.style.width = '100%';
                    sub4box_pmdec_pin.style.height = '20%';
                    sub4box_pmdec_pin.style.position = 'relative';
                    sub4box_pmdec_pin.style.top = '-10%';
                    sub4box_pmdec_pin.style.left = '0%';
                    sub3box_pmdec.appendChild(sub4box_pmdec_pin);

                    // Make canvas for pmdec pin
                    const canvas_pmdec_pin = document.createElement('canvas');
                    canvas_pmdec_pin.style.width = '100%';
                    canvas_pmdec_pin.style.height = '100%';
                    canvas_pmdec_pin.style.position = 'relative';
                    canvas_pmdec_pin.style.top = '0%';
                    canvas_pmdec_pin.style.left = '0%';
                    sub4box_pmdec_pin.appendChild(canvas_pmdec_pin);

                    const rect_pmdec_pin = sub4box_pmdec_pin.getBoundingClientRect();

                    canvas_pmdec_pin.width = rect_pmdec_pin.width*dpr;
                    canvas_pmdec_pin.height = rect_pmdec_pin.height*dpr;

                    const context_pmdec_pin = canvas_pmdec_pin.getContext('2d');
                    context_pmdec_pin.scale(dpr, dpr);
                    context_pmdec_pin.lineWidth = 0.5;

                    // pmdec values
                    const PMDecs = positions.filter(posn => !Number.isNaN(posn[5])).map(posn => posn[5]).sort((pmdec1, pmdec2) => {
                        if (pmdec1 < pmdec2) {
                            return -1;
                        }
                    });

                    // Speed
                    let speed;
                    if (parseFloat(event.target.result.pmdec) > 0) {
                        speed = +PMDecs[PMDecs.length-1]/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr*parseFloat(event.target.result.pmdec)/PMDecs[PMDecs.length-1]/5000;
                    } else if (parseFloat(event.target.result.pmdec) < 0) {
                        speed = -Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr*parseFloat(event.target.result.pmdec)/PMDecs[0]/5000;
                    } else {
                        speed = 0;
                    }

                    const intId_pmdec_pin = window.setInterval(drawPMDecPin, 10);

                    function drawPMDecPin() {
                        // Clear canvas
                        context_pmdec_pin.clearRect(0, 0, canvas_pmdec_pin.width, canvas_pmdec_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime()-startTime;

                        // Draw
                        context_pmdec_pin.beginPath();
                        context_pmdec_pin.moveTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*deltaTime, 0.2*canvas_pmdec_pin.height/dpr);
                        context_pmdec_pin.lineTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*deltaTime, 0.8*canvas_pmdec_pin.height/dpr);
                        context_pmdec_pin.closePath();
                        context_pmdec_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_pmdec_pin);
                            context_pmdec_pin.clearRect(0, 0, canvas_pmdec_pin.width, canvas_pmdec_pin.height);
                            context_pmdec_pin.beginPath();
                            context_pmdec_pin.moveTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*5000, 0.2*canvas_pmdec_pin.height/dpr);
                            context_pmdec_pin.lineTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*5000, 0.8*canvas_pmdec_pin.height/dpr);
                            context_pmdec_pin.closePath();
                            context_pmdec_pin.stroke();
                        }
                    }

                    // Make sub4box for pmdec scale
                    const sub4box_pmdec_scale = document.createElement('div');
                    sub4box_pmdec_scale.style.width = '100%';
                    sub4box_pmdec_scale.style.height = '60%';
                    sub4box_pmdec_scale.style.position = 'relative';
                    sub4box_pmdec_scale.style.top = '0%';
                    sub4box_pmdec_scale.style.left = '0%';
                    sub3box_pmdec.appendChild(sub4box_pmdec_scale);

                    // Make canvas for pmdec scale
                    const canvas_pmdec_scale = document.createElement('canvas');
                    canvas_pmdec_scale.style.width = '100%';
                    canvas_pmdec_scale.style.height = '100%';
                    canvas_pmdec_scale.style.position = 'relative';
                    canvas_pmdec_scale.style.top = '0%';
                    canvas_pmdec_scale.style.left = '0%';
                    sub4box_pmdec_scale.appendChild(canvas_pmdec_scale);

                    // Get bounding rectangle
                    const rect_pmdec_scale = sub4box_pmdec_scale.getBoundingClientRect();

                    canvas_pmdec_scale.width = rect_pmdec_scale.width*dpr;
                    canvas_pmdec_scale.height = rect_pmdec_scale.height*dpr;

                    const context_pmdec_scale = canvas_pmdec_scale.getContext('2d');
                    context_pmdec_scale.scale(dpr, dpr);

                    // Histogram bounds
                    const boundMin = 0.99*PMDecs[0];
                    const boundMax = 1.01*PMDecs[PMDecs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = PMDecs.filter(pmdec => pmdec > boundMin+i*binSize && pmdec <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (let i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_pmdec_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_pmdec_scale.fillRect(0.05*canvas_pmdec_scale.width/dpr+i*0.9*canvas_pmdec_scale.width/dpr/binNum, 0, (0.9*canvas_pmdec_scale.width/dpr - 4*0.9*canvas_pmdec_scale.width/dpr/binNum)/binNum, 0.5*canvas_pmdec_scale.height/dpr);
                    }

                    // Label
                    context_pmdec_scale.font = '1.4vmin system-ui';
                    context_pmdec_scale.fillStyle = 'black';
                    for (let i=0; i<11; i++) {
                        const pmdec = -150+i*50;
                        let label;
                        if (pmdec<0) {
                            label = `\u2212${Math.abs(pmdec)}`;
                        } else if (pmdec>0) {
                            label = `+${pmdec}`;
                        } else {
                            label = '0';
                        }
                        context_pmdec_scale.fillText(label, 0.05*canvas_pmdec_scale.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_scale.width/dpr+pmdec/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_scale.width/dpr, 0.8*canvas_pmdec_scale.height/dpr);
                    }
                }
            } else {
                // If profile available, make two columns
                box.style.gridTemplateColumns = 'minmax(100px, 1fr) 4fr';

                // Make left subbox for pulse
                const subbox_l = document.createElement('div');
                box.appendChild(subbox_l);

                // Make pulse canvas
                const canvas_pulse = document.createElement('canvas');
                canvas_pulse.style.width = '100%';
                canvas_pulse.style.height = '50%';
                canvas_pulse.style.position = 'relative';
                canvas_pulse.style.top = '0%';
                canvas_pulse.style.left = '0%';
                subbox_l.appendChild(canvas_pulse);

                // Retrieve dpr
                const dpr = window.devicePixelRatio;

                // Retrieve bounding rectangle
                const rect_pulse = subbox_l.getBoundingClientRect();

                // Set canvas size
                canvas_pulse.width = parseFloat(canvas_pulse.style.width)/100*rect_pulse.width*dpr;
                canvas_pulse.height = parseFloat(canvas_pulse.style.height)/100*rect_pulse.height*dpr;

                // Retrieve canvas context
                const context_pulse = canvas_pulse.getContext('2d');

                // Set scale
                context_pulse.scale(dpr, dpr);

                // Pulse animation
                const intId_pulse = window.setInterval(drawPulse, 100);

                // Draw pulse
                function drawPulse() {
                    // Clear canvas
                    context_pulse.clearRect(0, 0, canvas_pulse.width, canvas_pulse.height);

                    // Delta time
                    const thisDate = new Date();
                    const deltaTime = thisDate.getTime() - startTime;

                    // Noise amplitude
                    const amp = 10.0 - 1.6e-3*deltaTime;

                    // Draw
                    for (let i=0; i<event.target.result.profile.length-1; i++) {
                        context_pulse.beginPath();

                        // Get standard gaussian random number with Box-Muller transform
                        let theta = 2*Math.PI*Math.random();
                        let rho = Math.sqrt(-2*Math.log(1.0-Math.random()));
                        let noise = rho*Math.cos(theta);

                        context_pulse.moveTo(0.1*canvas_pulse.width/dpr+i*0.8*canvas_pulse.width/dpr/(event.target.result.profile.length-1), 0.85*canvas_pulse.height/dpr-event.target.result.profile[i]*0.8*canvas_pulse.height/dpr+amp*noise);

                        theta = 2*Math.PI*Math.random();
                        rho = Math.sqrt(-2*Math.log(1.0-Math.random()));
                        noise = rho*Math.cos(theta);

                        context_pulse.lineTo(0.1*canvas_pulse.width/dpr+(i+1)*0.8*canvas_pulse.width/dpr/(event.target.result.profile.length-1), 0.85*canvas_pulse.height/dpr-event.target.result.profile[i+1]*0.8*canvas_pulse.height/dpr+amp*noise);
                        context_pulse.closePath();
                        context_pulse.stroke();
                    }

                    if (deltaTime > 5000.0) {
                        window.clearInterval(intId_pulse);
                    }
                }

                // Make right subbox
                const subbox_r = document.createElement('div');
                subbox_r.style.display = 'grid';
                subbox_r.style.gridTemplateRows = '1fr 8fr';
                box.appendChild(subbox_r);

                // Make upper subsubbox in right subbox
                const subsubbox_u = document.createElement('div');
                subsubbox_u.style.display = 'flex';
                subsubbox_u.style.alignItems = 'center';
                subbox_r.appendChild(subsubbox_u);

                // Make jname para
                const p_jname = document.createElement('p');
                p_jname.innerHTML = `PSR ${event.target.result.jname.replace('-', '\u2212')}`;
                p_jname.style.fontFamily = 'system-ui, ui-rounded, sans-serif, serif';
                p_jname.style.fontSize = '1.8vmin';
                p_jname.style.fontWeight = 400;
                subsubbox_u.appendChild(p_jname);

                // Make meta para
                if (event.target.result.meta !== 'na') {
                    const p_meta = document.createElement('p');
                    p_meta.innerHTML = `\xA0 ${event.target.result.meta.replace(/_/g, ' ')}`;
                    p_meta.style.fontFamily = 'system-ui, ui-rounded, sans-serif, serif';
                    p_meta.style.fontSize = '1.6vmin';
                    p_meta.style.fontWeight = 400;
                    p_meta.style.color = 'dimgray';
                    subsubbox_u.appendChild(p_meta);
                }

                // Make lower subsubbox in right subbox
                const subsubbox_l = document.createElement('div');
                subsubbox_l.style.display = 'grid';
                subsubbox_l.style.gridTemplateColumns = 'repeat(auto-fill, minmax(50vmin, 1fr))';
                subsubbox_l.style.gridAutoRows = '10vmin';
                subbox_r.appendChild(subsubbox_l);

                if (event.target.result.raj !== 'na') {
                    // Make sub3box for raj
                    const sub3box_raj = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_raj);

                    // Make sub4box for raj text
                    const sub4box_raj_text = document.createElement('div');
                    sub4box_raj_text.style.width = '100%';
                    sub4box_raj_text.style.height = '20%';
                    sub4box_raj_text.style.position = 'relative';
                    sub4box_raj_text.style.top = '-10%';
                    sub4box_raj_text.style.left = '0%';
                    sub3box_raj.appendChild(sub4box_raj_text);

                    // Make canvas for raj text
                    const canvas_raj_text = document.createElement('canvas');
                    canvas_raj_text.style.width = '100%';
                    canvas_raj_text.style.height = '100%';
                    canvas_raj_text.style.position = 'relative';
                    canvas_raj_text.style.top = '0%';
                    canvas_raj_text.style.left = '0%';
                    sub4box_raj_text.appendChild(canvas_raj_text);

                    const dpr = window.devicePixelRatio;
                    const rect_raj_text = sub4box_raj_text.getBoundingClientRect();

                    canvas_raj_text.width = rect_raj_text.width*dpr;
                    canvas_raj_text.height = rect_raj_text.height*dpr;

                    const context_raj_text = canvas_raj_text.getContext('2d');
                    context_raj_text.scale(dpr, dpr);
                    context_raj_text.font = '1.4vmin system-ui';

                    let hour = 0;
                    let minute = 0;
                    let second = 0;

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_raj_text = window.setInterval(drawRajText, 100);

                    // Draw raj text
                    function drawRajText() {
                        // Clear canvas
                        context_raj_text.clearRect(0, 0, canvas_raj_text.width, canvas_raj_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // This raj degree
                        const thisRajDeg = deltaTime/5000 * event.target.result.rajDeg;

                        // Find h, m, s
                        hour = Math.floor(thisRajDeg/360*24);
                        minute = Math.floor((thisRajDeg/360*24 - hour)*60);
                        second = Math.round(((thisRajDeg/360*24 - hour)*60 - minute)*60*10)/10;

                        let hour_str;
                        if (hour<10) { hour_str =  `0${hour}`; } 
                        else { hour_str = hour.toString(); }

                        let minute_str;
                        if (minute<10) { minute_str = `0${minute}`; }
                        else { minute_str = minute.toString(); }

                        let second_str;
                        if (second<10) { second_str = `0${second}`; }
                        else { second_str = second.toString(); }

                        // Draw
                        context_raj_text.fillText(`R. A. (h:m:s): ${hour_str}:${minute_str}:${second_str}`, 0, 0.6*canvas_raj_text.height/dpr);

                        if (deltaTime > 4900.0) {
                            window.clearInterval(intId_raj_text);
                            context_raj_text.clearRect(0, 0, canvas_raj_text.width, canvas_raj_text.height);
                            context_raj_text.fillText(`R. A. (h:m:s): ${event.target.result.raj}`, 0, 0.6*canvas_raj_text.height/dpr);
                        }
                    }

                    // Make sub4box for raj pin
                    const sub4box_raj_pin = document.createElement('div');
                    sub4box_raj_pin.style.width = '100%';
                    sub4box_raj_pin.style.height = '20%';
                    sub4box_raj_pin.style.position = 'relative';
                    sub4box_raj_pin.style.top = '-10%';
                    sub4box_raj_pin.style.left = '0%';
                    sub3box_raj.appendChild(sub4box_raj_pin);
                    
                    // Make canvas for raj pin
                    const canvas_raj_pin = document.createElement('canvas');
                    canvas_raj_pin.style.width = '100%';
                    canvas_raj_pin.style.height = '100%';
                    canvas_raj_pin.style.position = 'relative';
                    canvas_raj_pin.style.top = '0%';
                    canvas_raj_pin.style.left = '0%';
                    sub4box_raj_pin.appendChild(canvas_raj_pin);

                    // Get bounding rectangle
                    const rect_raj_pin = sub4box_raj_pin.getBoundingClientRect();

                    canvas_raj_pin.width = rect_raj_pin.width*dpr;
                    canvas_raj_pin.height = rect_raj_pin.height*dpr;

                    const context_raj_pin = canvas_raj_pin.getContext('2d');
                    context_raj_pin.scale(dpr, dpr);
                    context_raj_pin.lineWidth = 0.5;

                    const intId_raj_pin = window.setInterval(drawRajPin, 10);

                    function drawRajPin() {
                        // Clear canvas
                        context_raj_pin.clearRect(0, 0, canvas_raj_pin.width, canvas_raj_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        const speed = 0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr/5000;

                        // Draw
                        context_raj_pin.beginPath();
                        context_raj_pin.moveTo(0.05*canvas_raj_pin.width/dpr+speed*deltaTime, 0.2*canvas_raj_pin.height/dpr);
                        context_raj_pin.lineTo(0.05*canvas_raj_pin.width/dpr+speed*deltaTime, 0.8*canvas_raj_pin.height/dpr);
                        context_raj_pin.closePath();
                        context_raj_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_raj_pin);
                            context_raj_pin.clearRect(0, 0, canvas_raj_pin.width, canvas_raj_pin.height);
                            context_raj_pin.beginPath();
                            context_raj_pin.moveTo(0.05*canvas_raj_pin.width/dpr+0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr, 0.2*canvas_raj_pin.height/dpr);
                            context_raj_pin.lineTo(0.05*canvas_raj_pin.width/dpr+0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr, 0.8*canvas_raj_pin.height/dpr);
                            context_raj_pin.closePath();
                            context_raj_pin.stroke();
                        }
                    }

                    // Make sub4box for raj scale
                    const sub4box_raj_scale = document.createElement('div');
                    sub4box_raj_scale.style.width = '100%';
                    sub4box_raj_scale.style.height = '60%';
                    sub4box_raj_scale.style.position = 'relative';
                    sub4box_raj_scale.style.top = '0%';
                    sub4box_raj_scale.style.left = '0%';
                    sub3box_raj.appendChild(sub4box_raj_scale);

                    // Make canvas for raj scale
                    const canvas_raj_scale = document.createElement('canvas');
                    canvas_raj_scale.style.width = '100%';
                    canvas_raj_scale.style.height = '100%';
                    canvas_raj_scale.style.position = 'relative';
                    canvas_raj_scale.style.top = '0%';
                    canvas_raj_scale.style.left = '0%';
                    sub4box_raj_scale.appendChild(canvas_raj_scale);

                    // Get bounding rectangle
                    const rect_raj_scale = sub4box_raj_scale.getBoundingClientRect();

                    canvas_raj_scale.width = rect_raj_scale.width*dpr;
                    canvas_raj_scale.height = rect_raj_scale.height*dpr;

                    const context_raj_scale = canvas_raj_scale.getContext('2d');
                    context_raj_scale.scale(dpr, dpr);

                    // Group raj degree numbers
                    const rajDegs = positions.filter(posn => posn[0]>-1.0).map(posn => posn[0]).sort((deg1, deg2) => {
                        if (deg1 < deg2) {
                            return -1;
                        }
                    });
                    
                    // Histogram boundaries
                    const boundMin = 0.99*rajDegs[0]; 
                    const boundMax = 1.01*rajDegs[rajDegs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                       const count = rajDegs.filter(deg => deg > boundMin+i*binSize && deg <= boundMin+(i+1)*binSize).length;
                       counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (let i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_raj_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_raj_scale.fillRect(0.05*canvas_raj_scale.width/dpr+i*0.9*canvas_raj_scale.width/dpr/binNum, 0, (0.9*canvas_raj_scale.width/dpr-4*0.9*canvas_raj_scale.width/dpr/binNum)/binNum, 0.5*canvas_raj_scale.height/dpr);
                    }

                    // Label
                    context_raj_scale.font = '1.4vmin system-ui';
                    context_raj_scale.fillStyle = 'black';
                    for (let i=0; i<5; i++) {
                        const hour = 6*i;
                        let label = hour.toString();
                        if (i === 0) { label += '(h)'; }
                        context_raj_scale.fillText(label, (0.05+0.225*i)*canvas_raj_scale.width/dpr, 0.8*canvas_raj_scale.height/dpr);
                    }
                }

                // Make sub3box for decj
                if (event.target.result.decj !== 'na') {
                    const sub3box_decj = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_decj);

                    // Make sub4box for decj text
                    const sub4box_decj_text = document.createElement('div');
                    sub4box_decj_text.style.width = '100%';
                    sub4box_decj_text.style.height = '20%';
                    sub4box_decj_text.style.position = 'relative';
                    sub4box_decj_text.style.top = '-10%';
                    sub4box_decj_text.style.left = '0%';
                    sub3box_decj.appendChild(sub4box_decj_text);

                    // Make canvas for decj text
                    const canvas_decj_text = document.createElement('canvas');
                    canvas_decj_text.style.width = '100%';
                    canvas_decj_text.style.height = '100%';
                    canvas_decj_text.style.position = 'relative';
                    canvas_decj_text.style.top = '0%';
                    canvas_decj_text.style.left = '0%';
                    sub4box_decj_text.appendChild(canvas_decj_text);

                    const dpr = window.devicePixelRatio;
                    const rect_decj_text = sub4box_decj_text.getBoundingClientRect();

                    canvas_decj_text.width = rect_decj_text.width*dpr;
                    canvas_decj_text.height = rect_decj_text.height*dpr;

                    const context_decj_text = canvas_decj_text.getContext('2d');
                    context_decj_text.scale(dpr, dpr);
                    context_decj_text.font = '1.4vmin system-ui';

                    let degree = 0;
                    let minute = 0;
                    let second = 0;

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_decj_text = window.setInterval(drawDecjText, 100);

                    // Draw decj text
                    function drawDecjText() {
                        // Clear canvas
                        context_decj_text.clearRect(0, 0, canvas_decj_text.width, canvas_decj_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // This decj degree
                        const thisDecjDeg = deltaTime/5000 * event.target.result.decjDeg;

                        // Find d, m, s
                        degree = Math.trunc(thisDecjDeg);
                        minute = Math.trunc(Math.abs(thisDecjDeg - degree)*60);
                        second = Math.round((Math.abs(thisDecjDeg - degree)*60 - minute)*60*10)/10;

                        let degree_str;
                        if (degree < 0) {
                            if (degree > -10) {
                                degree_str = `\u22120${Math.abs(degree)}`;
                            } else {
                                degree_str = `\u2212${Math.abs(degree)}`;
                            }
                        } else if (degree > 0) {
                            if (degree < 10) {
                                degree_str = `+0${degree}`;
                            } else {
                                degree_str = `+${degree}`;
                            }
                        } else {
                            degree_str = '0';
                        }

                        let minute_str;
                        if (minute < 10) { minute_str = `0${minute}`; } 
                        else { minute_str = minute.toString(); }

                        let second_str;
                        if (second < 10) { second_str = `0${second}`; } 
                        else { second_str = second.toString(); }

                        // Draw
                        context_decj_text.fillText(`Dec. (d:m:s): ${degree_str}:${minute_str}:${second_str}`, 0, 0.6*canvas_decj_text.height/dpr);

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_decj_text);
                            context_decj_text.clearRect(0, 0, canvas_decj_text.width, canvas_decj_text.height);
                            if (parseFloat(event.target.result.decjDeg)<0) {
                                context_decj_text.fillText(`Dec.: (d:m:s): ${event.target.result.decj.replace('-', '\u2212')}`, 0, 0.6*canvas_decj_text.height/dpr);
                            } else {
                                context_decj_text.fillText(`Dec.: (d:m:s): ${event.target.result.decj}`, 0, 0.6*canvas_decj_text.height/dpr);
                            }
                        }
                    }

                    // Make sub4box for decj pin
                    const sub4box_decj_pin = document.createElement('div');
                    sub4box_decj_pin.style.width = '100%';
                    sub4box_decj_pin.style.height = '20%';
                    sub4box_decj_pin.style.position = 'relative';
                    sub4box_decj_pin.style.top = '-10%';
                    sub4box_decj_pin.style.left = '0%';
                    sub3box_decj.appendChild(sub4box_decj_pin);

                    // Make canvas for decj pin
                    const canvas_decj_pin = document.createElement('canvas');
                    canvas_decj_pin.style.width = '100%';
                    canvas_decj_pin.style.height = '100%';
                    canvas_decj_pin.style.position = 'relative';
                    canvas_decj_pin.style.top = '0%';
                    canvas_decj_pin.style.left = '0%';
                    sub4box_decj_pin.appendChild(canvas_decj_pin);

                    // Get bounding rectangle
                    const rect_decj_pin = sub4box_decj_pin.getBoundingClientRect();

                    canvas_decj_pin.width = rect_decj_pin.width*dpr;
                    canvas_decj_pin.height = rect_decj_pin.height*dpr;

                    const context_decj_pin = canvas_decj_pin.getContext('2d');
                    context_decj_pin.scale(dpr, dpr);
                    context_decj_pin.lineWidth = 0.5;

                    const intId_decj_pin = window.setInterval(drawDecjPin, 10);

                    function drawDecjPin() {
                        // Clear canvas
                        context_decj_pin.clearRect(0, 0, canvas_decj_pin.width, canvas_decj_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        const speed = 0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90/5000;

                        // Draw
                        context_decj_pin.beginPath();
                        context_decj_pin.moveTo(0.5*canvas_decj_pin.width/dpr+speed*deltaTime, 0.2*canvas_decj_pin.height/dpr);
                        context_decj_pin.lineTo(0.5*canvas_decj_pin.width/dpr+speed*deltaTime, 0.8*canvas_decj_pin.height/dpr);
                        context_decj_pin.closePath();
                        context_decj_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_decj_pin);
                            context_decj_pin.clearRect(0, 0, canvas_decj_pin.width, canvas_decj_pin.height);
                            context_decj_pin.beginPath();
                            context_decj_pin.moveTo(0.5*canvas_decj_pin.width/dpr+0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90, 0.2*canvas_decj_pin.height/dpr);
                            context_decj_pin.lineTo(0.5*canvas_decj_pin.width/dpr+0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90, 0.8*canvas_decj_pin.height/dpr);
                            context_decj_pin.closePath();
                            context_decj_pin.stroke();
                        }
                    }

                    // Make sub4box for decj scale
                    const sub4box_decj_scale = document.createElement('div');
                    sub4box_decj_scale.style.width = '100%';
                    sub4box_decj_scale.style.height = '60%';
                    sub4box_decj_scale.style.position = 'relative';
                    sub4box_decj_scale.style.top = '0%';
                    sub4box_decj_scale.style.left = '0%';
                    sub3box_decj.appendChild(sub4box_decj_scale);

                    // Make canvas for decj scale
                    const canvas_decj_scale = document.createElement('canvas');
                    canvas_decj_scale.style.width = '100%';
                    canvas_decj_scale.style.height = '100%';
                    canvas_decj_scale.style.position = 'relative';
                    canvas_decj_scale.style.top = '0%';
                    canvas_decj_scale.style.left = '0%';
                    sub4box_decj_scale.appendChild(canvas_decj_scale);

                    // Get bounding rectangle
                    const rect_decj_scale = sub4box_decj_scale.getBoundingClientRect();

                    canvas_decj_scale.width = rect_decj_scale.width*dpr;
                    canvas_decj_scale.height = rect_decj_scale.height*dpr;

                    const context_decj_scale = canvas_decj_scale.getContext('2d');
                    context_decj_scale.scale(dpr, dpr);

                    // Group decj degree numbers
                    const decjDegs = positions.filter(posn => posn[1]>-91.0).map(posn => posn[1]).sort((deg1, deg2) => {
                        if (deg1 < deg2) {
                            return -1;
                        }
                    });
                    
                    // Histogram boundaries
                    const boundMin = 0.99*decjDegs[0];
                    const boundMax = 1.01*decjDegs[decjDegs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = decjDegs.filter(deg => deg > boundMin+i*binSize && deg <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (let i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_decj_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_decj_scale.fillRect(0.05*canvas_decj_scale.width/dpr+i*0.9*canvas_decj_scale.width/dpr/binNum, 0, (0.9*canvas_decj_scale.width/dpr - 4*0.9*canvas_decj_scale.width/dpr/binNum)/binNum, 0.5*canvas_decj_scale.height/dpr);
                    }

                    // Label
                    context_decj_scale.font = '1.4vmin system-ui';
                    context_decj_scale.fillStyle = 'black';
                    for (let i=0; i<5; i++) {
                        const degree = -90+i*45;
                        let label;
                        if (degree < 0) {
                            label = `\u2212${Math.abs(degree)}`;
                        } else if (degree > 0) {
                            label = `+${degree}`;
                        } else {
                            label = '0';
                        }
                        if (i === 0) { label += '(d)'; }
                        context_decj_scale.fillText(label, (0.05+0.225*i)*canvas_decj_scale.width/dpr, 0.8*canvas_decj_scale.height/dpr);
                    }
                }

                // Make sub3box for p0
                if (event.target.result.p0 !== 'na') {
                    const sub3box_p0 = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_p0);

                    // Make sub4box for p0 text
                    const sub4box_p0_text = document.createElement('div');
                    sub4box_p0_text.style.width = '100%';
                    sub4box_p0_text.style.height = '20%';
                    sub4box_p0_text.style.position = 'relative';
                    sub4box_p0_text.style.top = '-10%';
                    sub4box_p0_text.style.left = '0%';
                    sub3box_p0.appendChild(sub4box_p0_text);

                    // Make canvas for p0 text
                    const canvas_p0_text = document.createElement('canvas');
                    canvas_p0_text.style.width = '100%';
                    canvas_p0_text.style.height = '100%';
                    canvas_p0_text.style.position = 'relative';
                    canvas_p0_text.style.top = '0%';
                    canvas_p0_text.style.left = '0%';
                    sub4box_p0_text.appendChild(canvas_p0_text);

                    const dpr = window.devicePixelRatio;
                    const rect_p0_text = sub4box_p0_text.getBoundingClientRect();

                    canvas_p0_text.width = rect_p0_text.width*dpr;
                    canvas_p0_text.height = rect_p0_text.height*dpr;

                    const context_p0_text = canvas_p0_text.getContext('2d');
                    context_p0_text.scale(dpr, dpr);
                    context_p0_text.font = '1.4vmin system-ui';

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_p0_text = window.setInterval(drawP0Text, 100);

                    function drawP0Text() {
                        // Clear canvas
                        context_p0_text.clearRect(0, 0, canvas_p0_text.width, canvas_p0_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // This period
                        const thisP = deltaTime/5000 * parseFloat(event.target.result.p0);

                        // Draw
                        context_p0_text.fillText(`Period (s): ${thisP.toFixed(6)}`, 0, 0.6*canvas_p0_text.height/dpr);

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_p0_text);
                            context_p0_text.clearRect(0, 0, canvas_p0_text.width, canvas_p0_text.height);
                            context_p0_text.fillText(`Period (s): ${event.target.result.p0}`, 0, 0.6*canvas_p0_text.height/dpr);
                        }
                    }

                    // Make sub4box for p0 pin
                    const sub4box_p0_pin = document.createElement('div');
                    sub4box_p0_pin.style.width = '100%';
                    sub4box_p0_pin.style.height = '20%';
                    sub4box_p0_pin.style.position = 'relative';
                    sub4box_p0_pin.style.top = '-10%';
                    sub4box_p0_pin.style.left = '0%';
                    sub3box_p0.appendChild(sub4box_p0_pin);

                    // Make canvas for p0 pin
                    const canvas_p0_pin = document.createElement('canvas');
                    canvas_p0_pin.style.width = '100%';
                    canvas_p0_pin.style.height = '100%';
                    canvas_p0_pin.style.position = 'relative';
                    canvas_p0_pin.style.top = '0%';
                    canvas_p0_pin.style.left = '0%';
                    sub4box_p0_pin.appendChild(canvas_p0_pin);

                    const rect_p0_pin = sub4box_p0_pin.getBoundingClientRect();

                    canvas_p0_pin.width = rect_p0_pin.width*dpr;
                    canvas_p0_pin.height = rect_p0_pin.height*dpr;

                    const context_p0_pin = canvas_p0_pin.getContext('2d');
                    context_p0_pin.scale(dpr, dpr);
                    context_p0_pin.lineWidth = 0.5;
                    
                    const intId_p0_pin = window.setInterval(drawP0Pin, 10);

                    // Log10 periods
                    const lgPs = positions.filter(posn => !Number.isNaN(posn[3])).map(posn => Math.log10(posn[3])).sort((lgP1, lgP2) => {
                        if (lgP1 < lgP2) {
                            return -1;
                        }
                    });
                    
                    // Speed
                    const speed = 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]) / 5000;

                    // Draw p0 pin
                    function drawP0Pin() {
                        // Clear canvas
                        context_p0_pin.clearRect(0, 0, canvas_p0_pin.width, canvas_p0_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // Draw
                        context_p0_pin.beginPath();
                        context_p0_pin.moveTo(0.05*canvas_p0_pin.width/dpr+speed*deltaTime, 0.2*canvas_p0_pin.height/dpr);
                        context_p0_pin.lineTo(0.05*canvas_p0_pin.width/dpr+speed*deltaTime, 0.8*canvas_p0_pin.height/dpr);
                        context_p0_pin.closePath();
                        context_p0_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_p0_pin);
                            context_p0_pin.clearRect(0, 0, canvas_p0_pin.width, canvas_p0_pin.height);
                            context_p0_pin.beginPath();
                            context_p0_pin.moveTo(0.05*canvas_p0_pin.width/dpr + 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]), 0.2*canvas_p0_pin.height/dpr);
                            context_p0_pin.lineTo(0.05*canvas_p0_pin.width/dpr + 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]), 0.8*canvas_p0_pin.height/dpr);
                            context_p0_pin.closePath();
                            context_p0_pin.stroke();
                        }
                    }

                    // Make sub4box for p0 scale
                    const sub4box_p0_scale = document.createElement('div');
                    sub4box_p0_scale.style.width = '100%';
                    sub4box_p0_scale.style.height = '60%';
                    sub4box_p0_scale.style.position = 'relative';
                    sub4box_p0_scale.style.top = '0%';
                    sub4box_p0_scale.style.left = '0%';
                    sub3box_p0.appendChild(sub4box_p0_scale);

                    // Make canvas for p0 scale
                    const canvas_p0_scale = document.createElement('canvas');
                    canvas_p0_scale.style.width = '100%';
                    canvas_p0_scale.style.height = '100%';
                    canvas_p0_scale.style.position = 'relative';
                    canvas_p0_scale.style.top = '0%';
                    canvas_p0_scale.style.left = '0%';
                    sub4box_p0_scale.appendChild(canvas_p0_scale);

                    // Get bounding rectangle
                    const rect_p0_scale = sub4box_p0_scale.getBoundingClientRect();

                    canvas_p0_scale.width = rect_p0_scale.width*dpr;
                    canvas_p0_scale.height = rect_p0_scale.height*dpr;

                    const context_p0_scale = canvas_p0_scale.getContext('2d');
                    context_p0_scale.scale(dpr, dpr);

                    // Histogram boundaries
                    const boundMin = 0.99*lgPs[0];
                    const boundMax = 1.01*lgPs[lgPs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = lgPs.filter(lgP => lgP > boundMin+i*binSize && lgP <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_p0_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_p0_scale.fillRect(0.05*canvas_p0_scale.width/dpr+i*0.9*canvas_p0_scale.width/dpr/binNum, 0, (0.9*canvas_p0_scale.width/dpr-4*0.9*canvas_p0_scale.width/dpr/binNum)/binNum, 0.5*canvas_p0_scale.height/dpr);
                    }

                    // Label
                    context_p0_scale.font = '1.4vmin system-ui';
                    context_p0_scale.fillStyle = 'black';
                    for (let i=0; i<8; i++) {
                        const lgP = -2.5+0.5*i;
                        let label;
                        if (i !== 7) {
                            label = Math.pow(10, lgP).toPrecision(1);
                        } else {
                            label = Math.pow(10, lgP).toPrecision(2);
                        }
                        context_p0_scale.fillText(label, 0.05*canvas_p0_scale.width/dpr + 0.9*canvas_p0_scale.width/dpr*(Math.log10(parseFloat(label))-lgPs[0])/(lgPs[lgPs.length-1]-lgPs[0]), 0.8*canvas_p0_scale.height/dpr);
                    }
                }

                // Make sub3box for dm
                if (event.target.result.dm !== 'na') {
                    const sub3box_dm = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_dm);

                    // Make sub4box for dm text
                    const sub4box_dm_text = document.createElement('div');
                    sub4box_dm_text.style.width = '100%';
                    sub4box_dm_text.style.height = '20%';
                    sub4box_dm_text.style.position = 'relative';
                    sub4box_dm_text.style.top = '-10%';
                    sub4box_dm_text.style.left = '0%';
                    sub3box_dm.appendChild(sub4box_dm_text);

                    // Make canvas for dm text
                    const canvas_dm_text = document.createElement('canvas');
                    canvas_dm_text.style.width = '100%';
                    canvas_dm_text.style.height = '100%';
                    canvas_dm_text.style.position = 'relative';
                    canvas_dm_text.style.top = '0%';
                    canvas_dm_text.style.left = '0%';
                    sub4box_dm_text.appendChild(canvas_dm_text);

                    const dpr = window.devicePixelRatio;
                    const rect_dm_text = sub4box_dm_text.getBoundingClientRect();

                    canvas_dm_text.width = rect_dm_text.width*dpr;
                    canvas_dm_text.height = rect_dm_text.height*dpr;

                    const context_dm_text = canvas_dm_text.getContext('2d');
                    context_dm_text.scale(dpr, dpr);
                    context_dm_text.font = '1.4vmin system-ui';

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_dm_text = window.setInterval(drawDMText, 100);

                    function drawDMText() {
                        // Clear canvas
                        context_dm_text.clearRect(0, 0, canvas_dm_text.width, canvas_dm_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime()-startTime;

                        // This DM
                        const thisDM = deltaTime/5000 * parseFloat(event.target.result.dm);

                        // Draw
                        context_dm_text.fillText(`DM (pc cm^-3): ${thisDM.toFixed(2)}`, 0, 0.6*canvas_dm_text.height/dpr);

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_dm_text);
                            context_dm_text.clearRect(0, 0, canvas_dm_text.width, canvas_dm_text.height);
                            context_dm_text.fillText(`DM (pc cm^-3): ${event.target.result.dm}`, 0, 0.6*canvas_dm_text.height/dpr);
                        }
                    }

                    // Make sub4box for dm pin
                    const sub4box_dm_pin = document.createElement('div');
                    sub4box_dm_pin.style.width = '100%';
                    sub4box_dm_pin.style.height = '20%';
                    sub4box_dm_pin.style.position = 'relative';
                    sub4box_dm_pin.style.top = '-10%';
                    sub4box_dm_pin.style.left = '0%';
                    sub3box_dm.appendChild(sub4box_dm_pin);

                    // Make canvas for dm pin
                    const canvas_dm_pin = document.createElement('canvas');
                    canvas_dm_pin.style.width = '100%';
                    canvas_dm_pin.style.height = '100%';
                    canvas_dm_pin.style.position = 'relative';
                    canvas_dm_pin.style.top = '0%';
                    canvas_dm_pin.style.left = '0%';
                    sub4box_dm_pin.appendChild(canvas_dm_pin);

                    const rect_dm_pin = sub4box_dm_pin.getBoundingClientRect();

                    canvas_dm_pin.width = rect_dm_pin.width*dpr;
                    canvas_dm_pin.height = rect_dm_pin.height*dpr;

                    const context_dm_pin = canvas_dm_pin.getContext('2d');
                    context_dm_pin.scale(dpr, dpr);
                    context_dm_pin.lineWidth = 0.5;

                    // Log10 dm values
                    const lgDMs = positions.filter(posn => !Number.isNaN(posn[2])).map(posn => Math.log10(posn[2])).sort((lgDM1, lgDM2) => {
                        if (lgDM1 < lgDM2) {
                            return -1;
                        }
                    });
                    
                    // Speed
                    const speed = 0.9*canvas_dm_pin.width/dpr * (Math.log10(parseFloat(event.target.result.dm)) - lgDMs[0]) / (lgDMs[lgDMs.length-1] - lgDMs[0]) / 5000;

                    const intId_dm_pin = window.setInterval(drawDMPin, 10);

                    // Draw DM pin
                    function drawDMPin() {
                        // Clear canvas
                        context_dm_pin.clearRect(0, 0, canvas_dm_pin.width, canvas_dm_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // Draw
                        context_dm_pin.beginPath();
                        context_dm_pin.moveTo(0.05*canvas_dm_pin.width/dpr+speed*deltaTime, 0.2*canvas_dm_pin.height/dpr);
                        context_dm_pin.lineTo(0.05*canvas_dm_pin.width/dpr+speed*deltaTime, 0.8*canvas_dm_pin.height/dpr);
                        context_dm_pin.closePath();
                        context_dm_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_dm_pin);
                            context_dm_pin.clearRect(0, 0, canvas_dm_pin.width, canvas_dm_pin.height);
                            context_dm_pin.beginPath();
                            context_dm_pin.moveTo(0.05*canvas_dm_pin.width/dpr+0.9*canvas_dm_pin.width/dpr*(Math.log10(parseFloat(event.target.result.dm))-lgDMs[0])/(lgDMs[lgDMs.length-1]-lgDMs[0]), 0.2*canvas_dm_pin.height/dpr);
                            context_dm_pin.lineTo(0.05*canvas_dm_pin.width/dpr+0.9*canvas_dm_pin.width/dpr*(Math.log10(parseFloat(event.target.result.dm))-lgDMs[0])/(lgDMs[lgDMs.length-1]-lgDMs[0]), 0.8*canvas_dm_pin.height/dpr);
                            context_dm_pin.closePath();
                            context_dm_pin.stroke();
                        }
                    }

                    // Make sub4box for dm scale
                    const sub4box_dm_scale = document.createElement('div');
                    sub4box_dm_scale.style.width = '100%';
                    sub4box_dm_scale.style.height = '60%';
                    sub4box_dm_scale.style.position = 'relative';
                    sub4box_dm_scale.style.top = '0%';
                    sub4box_dm_scale.style.left = '0%';
                    sub3box_dm.appendChild(sub4box_dm_scale);

                    // Make canvas for dm scale
                    const canvas_dm_scale = document.createElement('canvas');
                    canvas_dm_scale.style.width = '100%';
                    canvas_dm_scale.style.height = '100%';
                    canvas_dm_scale.style.position = 'relative';
                    canvas_dm_scale.style.top = '0%';
                    canvas_dm_scale.style.left = '0%';
                    sub4box_dm_scale.appendChild(canvas_dm_scale);

                    // Get bounding rectangle
                    const rect_dm_scale = sub4box_dm_scale.getBoundingClientRect();

                    canvas_dm_scale.width = rect_dm_scale.width*dpr;
                    canvas_dm_scale.height = rect_dm_scale.height*dpr;

                    const context_dm_scale = canvas_dm_scale.getContext('2d');
                    context_dm_scale.scale(dpr, dpr);

                    // Histogram boundaries
                    const boundMin = 0.99*lgDMs[0];
                    const boundMax = 1.01*lgDMs[lgDMs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = lgDMs.filter(lgDM => lgDM > boundMin+i*binSize && lgDM <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_dm_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_dm_scale.fillRect(0.05*canvas_dm_scale.width/dpr+i*0.9*canvas_dm_scale.width/dpr/binNum, 0, (0.9*canvas_dm_scale.width/dpr-4*0.9*canvas_dm_scale.width/dpr/binNum)/binNum, 0.5*canvas_dm_scale.height/dpr);
                    }

                    // Label
                    context_dm_scale.font = '1.4vmin system-ui';
                    context_dm_scale.fillStyle = 'black';
                    for (let i=0; i<6; i++) {
                        const lgDM = 0.5+0.5*i;
                        let label = Math.pow(10, lgDM).toFixed(0);
                        if (label === '32') { label = '30'; }
                        if (label === '316') { label = '300'; }
                        context_dm_scale.fillText(label, 0.05*canvas_dm_scale.width/dpr + 0.9*canvas_dm_scale.width/dpr*(Math.log10(parseFloat(label)) - lgDMs[0])/(lgDMs[lgDMs.length-1] - lgDMs[0]), 0.8*canvas_dm_scale.height/dpr);
                    }
                }

                // Make sub3box for pmra
                if (event.target.result.pmra !== 'na') {
                    const sub3box_pmra = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_pmra);

                    // Make sub4box for pmra text
                    const sub4box_pmra_text = document.createElement('div');
                    sub4box_pmra_text.style.width = '100%';
                    sub4box_pmra_text.style.height = '20%';
                    sub4box_pmra_text.style.position = 'relative';
                    sub4box_pmra_text.style.top = '-10%';
                    sub4box_pmra_text.style.left = '0%';
                    sub3box_pmra.appendChild(sub4box_pmra_text);

                    // Make canvas for pmra text
                    const canvas_pmra_text = document.createElement('canvas');
                    canvas_pmra_text.style.width = '100%';
                    canvas_pmra_text.style.height = '100%';
                    canvas_pmra_text.style.position = 'relative';
                    canvas_pmra_text.style.top = '0%';
                    canvas_pmra_text.style.left = '0%';
                    sub4box_pmra_text.appendChild(canvas_pmra_text);

                    const dpr = window.devicePixelRatio;
                    const rect_pmra_text = sub4box_pmra_text.getBoundingClientRect();

                    canvas_pmra_text.width = rect_pmra_text.width*dpr;
                    canvas_pmra_text.height = rect_pmra_text.height*dpr;

                    const context_pmra_text = canvas_pmra_text.getContext('2d');
                    context_pmra_text.scale(dpr, dpr);
                    context_pmra_text.font = '1.4vmin system-ui';

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_pmra_text = window.setInterval(drawPMRAText, 100);

                    function drawPMRAText() {
                        // Clear canvas
                        context_pmra_text.clearRect(0, 0, canvas_pmra_text.width, canvas_pmra_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime()-startTime;

                        // This pmra
                        const thisPMRA = deltaTime/5000 * parseFloat(event.target.result.pmra);

                        // Draw
                        if (thisPMRA < 0) {
                            context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): \u2212${Math.abs(thisPMRA).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                        } else {
                            context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): ${thisPMRA.toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                        }

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_pmra_text);
                            context_pmra_text.clearRect(0, 0, canvas_pmra_text.width, canvas_pmra_text.height);
                            if (parseFloat(event.target.result.pmra) < 0) {
                                context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): \u2212${Math.abs(parseFloat(event.target.result.pmra)).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                            } else {
                                context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): ${parseFloat(event.target.result.pmra).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                            }
                        }
                    }

                    // Make sub4box for pmra pin
                    const sub4box_pmra_pin = document.createElement('div');
                    sub4box_pmra_pin.style.width = '100%';
                    sub4box_pmra_pin.style.height = '20%';
                    sub4box_pmra_pin.style.position = 'relative';
                    sub4box_pmra_pin.style.top = '-10%';
                    sub4box_pmra_pin.style.left = '0%';
                    sub3box_pmra.appendChild(sub4box_pmra_pin);

                    // Make canvas for pmra pin
                    const canvas_pmra_pin = document.createElement('canvas');
                    canvas_pmra_pin.style.width = '100%';
                    canvas_pmra_pin.style.height = '100%';
                    canvas_pmra_pin.style.position = 'relative';
                    canvas_pmra_pin.style.top = '0%';
                    canvas_pmra_pin.style.left = '0%';
                    sub4box_pmra_pin.appendChild(canvas_pmra_pin);

                    const rect_pmra_pin = sub4box_pmra_pin.getBoundingClientRect();

                    canvas_pmra_pin.width = rect_pmra_pin.width*dpr;
                    canvas_pmra_pin.height = rect_pmra_pin.height*dpr;

                    const context_pmra_pin = canvas_pmra_pin.getContext('2d');
                    context_pmra_pin.scale(dpr, dpr);
                    context_pmra_pin.lineWidth = 0.5;

                    // pmra values
                    const PMRAs = positions.filter(posn => !Number.isNaN(posn[4])).map(posn => posn[4]).sort((pmra1, pmra2) => {
                        if (pmra1 < pmra2) {
                            return -1;
                        }
                    });

                    const intId_pmra_pin = window.setInterval(drawPMRAPin, 10);

                    // Speed
                    let speed;
                    if (parseFloat(event.target.result.pmra) > 0) {
                        speed = +PMRAs[PMRAs.length-1]/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr*parseFloat(event.target.result.pmra)/PMRAs[PMRAs.length-1]/5000;
                    } else if (parseFloat(event.target.result.pmra) < 0) {
                        speed = -Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr*parseFloat(event.target.result.pmra)/PMRAs[0]/5000;
                    } else {
                        speed = 0;
                    }

                    function drawPMRAPin() {
                        // Clear canvas
                        context_pmra_pin.clearRect(0, 0, canvas_pmra_pin.width, canvas_pmra_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime() - startTime;

                        // Draw
                        context_pmra_pin.beginPath();
                        context_pmra_pin.moveTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*deltaTime, 0.2*canvas_pmra_pin.height/dpr);
                        context_pmra_pin.lineTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*deltaTime, 0.8*canvas_pmra_pin.height/dpr);
                        context_pmra_pin.closePath();
                        context_pmra_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_pmra_pin);
                            context_pmra_pin.clearRect(0, 0, canvas_pmra_pin.width, canvas_pmra_pin.height);
                            context_pmra_pin.beginPath();
                            context_pmra_pin.moveTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*5000, 0.2*canvas_pmra_pin.height/dpr);
                            context_pmra_pin.lineTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*5000, 0.8*canvas_pmra_pin.height/dpr);
                            context_pmra_pin.closePath();
                            context_pmra_pin.stroke();
                        }
                    }

                    // Make sub4box for pmra scale
                    const sub4box_pmra_scale = document.createElement('div');
                    sub4box_pmra_scale.style.width = '100%';
                    sub4box_pmra_scale.style.height = '60%';
                    sub4box_pmra_scale.style.position = 'relative';
                    sub4box_pmra_scale.style.top = '0%';
                    sub4box_pmra_scale.style.left = '0%';
                    sub3box_pmra.appendChild(sub4box_pmra_scale);

                    // Make canvas for pmra scale
                    const canvas_pmra_scale = document.createElement('canvas');
                    canvas_pmra_scale.style.width = '100%';
                    canvas_pmra_scale.style.height = '100%';
                    canvas_pmra_scale.style.position = 'relative';
                    canvas_pmra_scale.style.top = '0%';
                    canvas_pmra_scale.style.left = '0%';
                    sub4box_pmra_scale.appendChild(canvas_pmra_scale);

                    // Get bounding rectangle
                    const rect_pmra_scale = sub4box_pmra_scale.getBoundingClientRect();

                    canvas_pmra_scale.width = rect_pmra_scale.width*dpr;
                    canvas_pmra_scale.height = rect_pmra_scale.height*dpr;

                    const context_pmra_scale = canvas_pmra_scale.getContext('2d');
                    context_pmra_scale.scale(dpr, dpr);

                    // Histogram bounds
                    const boundMin = 0.99*PMRAs[0];
                    const boundMax = 1.01*PMRAs[PMRAs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = PMRAs.filter(pmra => pmra > boundMin+i*binSize && pmra <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (let i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_pmra_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_pmra_scale.fillRect(0.05*canvas_pmra_scale.width/dpr+i*0.9*canvas_pmra_scale.width/dpr/binNum, 0, (0.9*canvas_pmra_scale.width/dpr - 4*0.9*canvas_pmra_scale.width/dpr/binNum)/binNum, 0.5*canvas_pmra_scale.height/dpr);
                    }

                    // Label
                    context_pmra_scale.font = '1.4vmin system-ui';
                    context_pmra_scale.fillStyle = 'black';
                    for (let i=0; i<9; i++) {
                        const pmra = -100+i*50;
                        let label;
                        if (pmra<0) {
                            label = `\u2212${Math.abs(pmra)}`;
                        } else if (pmra>0) {
                            label = `+${pmra}`;
                        } else {
                            label = '0';
                        }
                        context_pmra_scale.fillText(label, 0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+pmra/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_scale.width/dpr, 0.8*canvas_pmra_scale.height/dpr);
                    }
                }

                // Make sub3box for pmdec
                if (event.target.result.pmdec !== 'na') {
                    const sub3box_pmdec = document.createElement('div');
                    subsubbox_l.appendChild(sub3box_pmdec);

                    // Make sub4box for pmdec text
                    const sub4box_pmdec_text = document.createElement('div');
                    sub4box_pmdec_text.style.width = '100%';
                    sub4box_pmdec_text.style.height = '20%';
                    sub4box_pmdec_text.style.position = 'relative';
                    sub4box_pmdec_text.style.top = '-10%';
                    sub4box_pmdec_text.style.left = '0%';
                    sub3box_pmdec.appendChild(sub4box_pmdec_text);

                    // Make canvas for pmdec text
                    const canvas_pmdec_text = document.createElement('canvas');
                    canvas_pmdec_text.style.width = '100%';
                    canvas_pmdec_text.style.height = '100%';
                    canvas_pmdec_text.style.position = 'relative';
                    canvas_pmdec_text.style.top = '0%';
                    canvas_pmdec_text.style.left = '0%';
                    sub4box_pmdec_text.appendChild(canvas_pmdec_text);

                    const dpr = window.devicePixelRatio;
                    const rect_pmdec_text = sub4box_pmdec_text.getBoundingClientRect();

                    canvas_pmdec_text.width = rect_pmdec_text.width*dpr;
                    canvas_pmdec_text.height = rect_pmdec_text.height*dpr;

                    const context_pmdec_text = canvas_pmdec_text.getContext('2d');
                    context_pmdec_text.scale(dpr, dpr);
                    context_pmdec_text.font = '1.4vmin system-ui';

                    const startDate = new Date();
                    const startTime = startDate.getTime();

                    const intId_pmdec_text = window.setInterval(drawPMDecText, 100);

                    function drawPMDecText() {
                        // Clear canvas
                        context_pmdec_text.clearRect(0, 0, canvas_pmdec_text.width, canvas_pmdec_text.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime()-startTime;

                        // This pmdec
                        const thisPMDec = deltaTime/5000 * parseFloat(event.target.result.pmdec);

                        // Draw
                        if (thisPMDec < 0) {
                            context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): \u2212${Math.abs(thisPMDec).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                        } else {
                            context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): ${Math.abs(thisPMDec).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                        }

                        if (deltaTime > 4900) {
                            window.clearInterval(intId_pmdec_text);
                            context_pmdec_text.clearRect(0, 0, canvas_pmdec_text.width, canvas_pmdec_text.height);
                            if (parseFloat(event.target.result.pmdec) < 0) {
                                context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): \u2212${Math.abs(parseFloat(event.target.result.pmdec)).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                            } else {
                                context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): ${Math.abs(parseFloat(event.target.result.pmdec)).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                            }
                        }
                    }

                    // Make sub4box for pmdec pin
                    const sub4box_pmdec_pin = document.createElement('div');
                    sub4box_pmdec_pin.style.width = '100%';
                    sub4box_pmdec_pin.style.height = '20%';
                    sub4box_pmdec_pin.style.position = 'relative';
                    sub4box_pmdec_pin.style.top = '-10%';
                    sub4box_pmdec_pin.style.left = '0%';
                    sub3box_pmdec.appendChild(sub4box_pmdec_pin);

                    // Make canvas for pmdec pin
                    const canvas_pmdec_pin = document.createElement('canvas');
                    canvas_pmdec_pin.style.width = '100%';
                    canvas_pmdec_pin.style.height = '100%';
                    canvas_pmdec_pin.style.position = 'relative';
                    canvas_pmdec_pin.style.top = '0%';
                    canvas_pmdec_pin.style.left = '0%';
                    sub4box_pmdec_pin.appendChild(canvas_pmdec_pin);

                    const rect_pmdec_pin = sub4box_pmdec_pin.getBoundingClientRect();

                    canvas_pmdec_pin.width = rect_pmdec_pin.width*dpr;
                    canvas_pmdec_pin.height = rect_pmdec_pin.height*dpr;

                    const context_pmdec_pin = canvas_pmdec_pin.getContext('2d');
                    context_pmdec_pin.scale(dpr, dpr);
                    context_pmdec_pin.lineWidth = 0.5;

                    // pmdec values
                    const PMDecs = positions.filter(posn => !Number.isNaN(posn[5])).map(posn => posn[5]).sort((pmdec1, pmdec2) => {
                        if (pmdec1 < pmdec2) {
                            return -1;
                        }
                    });

                    // Speed
                    let speed;
                    if (parseFloat(event.target.result.pmdec) > 0) {
                        speed = +PMDecs[PMDecs.length-1]/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr*parseFloat(event.target.result.pmdec)/PMDecs[PMDecs.length-1]/5000;
                    } else if (parseFloat(event.target.result.pmdec) < 0) {
                        speed = -Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr*parseFloat(event.target.result.pmdec)/PMDecs[0]/5000;
                    } else {
                        speed = 0;
                    }

                    const intId_pmdec_pin = window.setInterval(drawPMDecPin, 10);

                    function drawPMDecPin() {
                        // Clear canvas
                        context_pmdec_pin.clearRect(0, 0, canvas_pmdec_pin.width, canvas_pmdec_pin.height);

                        // Delta time
                        const thisDate = new Date();
                        const deltaTime = thisDate.getTime()-startTime;

                        // Draw
                        context_pmdec_pin.beginPath();
                        context_pmdec_pin.moveTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*deltaTime, 0.2*canvas_pmdec_pin.height/dpr);
                        context_pmdec_pin.lineTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*deltaTime, 0.8*canvas_pmdec_pin.height/dpr);
                        context_pmdec_pin.closePath();
                        context_pmdec_pin.stroke();

                        if (deltaTime > 4990) {
                            window.clearInterval(intId_pmdec_pin);
                            context_pmdec_pin.clearRect(0, 0, canvas_pmdec_pin.width, canvas_pmdec_pin.height);
                            context_pmdec_pin.beginPath();
                            context_pmdec_pin.moveTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*5000, 0.2*canvas_pmdec_pin.height/dpr);
                            context_pmdec_pin.lineTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*5000, 0.8*canvas_pmdec_pin.height/dpr);
                            context_pmdec_pin.closePath();
                            context_pmdec_pin.stroke();
                        }
                    }

                    // Make sub4box for pmdec scale
                    const sub4box_pmdec_scale = document.createElement('div');
                    sub4box_pmdec_scale.style.width = '100%';
                    sub4box_pmdec_scale.style.height = '60%';
                    sub4box_pmdec_scale.style.position = 'relative';
                    sub4box_pmdec_scale.style.top = '0%';
                    sub4box_pmdec_scale.style.left = '0%';
                    sub3box_pmdec.appendChild(sub4box_pmdec_scale);

                    // Make canvas for pmdec scale
                    const canvas_pmdec_scale = document.createElement('canvas');
                    canvas_pmdec_scale.style.width = '100%';
                    canvas_pmdec_scale.style.height = '100%';
                    canvas_pmdec_scale.style.position = 'relative';
                    canvas_pmdec_scale.style.top = '0%';
                    canvas_pmdec_scale.style.left = '0%';
                    sub4box_pmdec_scale.appendChild(canvas_pmdec_scale);

                    // Get bounding rectangle
                    const rect_pmdec_scale = sub4box_pmdec_scale.getBoundingClientRect();

                    canvas_pmdec_scale.width = rect_pmdec_scale.width*dpr;
                    canvas_pmdec_scale.height = rect_pmdec_scale.height*dpr;

                    const context_pmdec_scale = canvas_pmdec_scale.getContext('2d');
                    context_pmdec_scale.scale(dpr, dpr);

                    // Histogram bounds
                    const boundMin = 0.99*PMDecs[0];
                    const boundMax = 1.01*PMDecs[PMDecs.length-1];

                    // Bin
                    const binNum = 64;
                    const binSize = (boundMax-boundMin)/binNum;

                    // Group
                    let counts = [];
                    for (let i=0; i<binNum; i++) {
                        const count = PMDecs.filter(pmdec => pmdec > boundMin+i*binSize && pmdec <= boundMin+(i+1)*binSize).length;
                        counts.push(count);
                    }

                    // Draw
                    const cmax = Math.max(...counts);
                    const cmin = Math.min(...counts);
                    for (let i=0; i<counts.length; i++) {
                        const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                        const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                        const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                        context_pmdec_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                        context_pmdec_scale.fillRect(0.05*canvas_pmdec_scale.width/dpr+i*0.9*canvas_pmdec_scale.width/dpr/binNum, 0, (0.9*canvas_pmdec_scale.width/dpr - 4*0.9*canvas_pmdec_scale.width/dpr/binNum)/binNum, 0.5*canvas_pmdec_scale.height/dpr);
                    }

                    // Label
                    context_pmdec_scale.font = '1.4vmin system-ui';
                    context_pmdec_scale.fillStyle = 'black';
                    for (let i=0; i<11; i++) {
                        const pmdec = -150+i*50;
                        let label;
                        if (pmdec<0) {
                            label = `\u2212${Math.abs(pmdec)}`;
                        } else if (pmdec>0) {
                            label = `+${pmdec}`;
                        } else {
                            label = '0';
                        }
                        context_pmdec_scale.fillText(label, 0.05*canvas_pmdec_scale.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_scale.width/dpr+pmdec/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_scale.width/dpr, 0.8*canvas_pmdec_scale.height/dpr);
                    }
                }

                // If J0737A, then show B pulsar
                if (event.target.result.jname === 'J0737-3039A') {
                    // Retrieve pulsar store
                    const pulsarStore = db.transaction(DB_PULSAR_STORE).objectStore(DB_PULSAR_STORE);

                    // Get request
                    const request = pulsarStore.get('J0737-3039B');

                    request.onsuccess = (event) => {
                        // Make left subbox for pulse
                        const subbox_l = document.createElement('div');
                        box.appendChild(subbox_l);

                        // Make pulse canvas
                        const canvas_pulse = document.createElement('canvas');
                        canvas_pulse.style.width = '100%';
                        canvas_pulse.style.height = '50%';
                        canvas_pulse.style.position = 'relative';
                        canvas_pulse.style.top = '0%';
                        canvas_pulse.style.left = '0%';
                        subbox_l.appendChild(canvas_pulse);

                        // Retrieve dpr
                        const dpr = window.devicePixelRatio;

                        // Retrieve bounding rectangle
                        const rect_pulse = subbox_l.getBoundingClientRect();

                        // Set canvas size
                        canvas_pulse.width = parseFloat(canvas_pulse.style.width)/100*rect_pulse.width*dpr;
                        canvas_pulse.height = parseFloat(canvas_pulse.style.height)/100*rect_pulse.height*dpr;

                        // Retrieve canvas context
                        const context_pulse = canvas_pulse.getContext('2d');

                        // Set scale
                        context_pulse.scale(dpr, dpr);

                        // Pulse animation
                        const intId_pulse = window.setInterval(drawPulse, 100);

                        // Draw pulse
                        function drawPulse() {
                            // Clear canvas
                            context_pulse.clearRect(0, 0, canvas_pulse.width, canvas_pulse.height);

                            // Delta time
                            const thisDate = new Date();
                            const deltaTime = thisDate.getTime() - startTime;

                            // Noise amplitude
                            const amp = 10.0 - 1.6e-3*deltaTime;

                            // Draw
                            for (let i=0; i<event.target.result.profile.length-1; i++) {
                                context_pulse.beginPath();

                                // Get standard gaussian random number with Box-Muller transform
                                let theta = 2*Math.PI*Math.random();
                                let rho = Math.sqrt(-2*Math.log(1.0-Math.random()));
                                let noise = rho*Math.cos(theta);

                                context_pulse.moveTo(0.1*canvas_pulse.width/dpr+i*0.8*canvas_pulse.width/dpr/(event.target.result.profile.length-1), 0.85*canvas_pulse.height/dpr-event.target.result.profile[i]*0.8*canvas_pulse.height/dpr+amp*noise);

                                theta = 2*Math.PI*Math.random();
                                rho = Math.sqrt(-2*Math.log(1.0-Math.random()));
                                noise = rho*Math.cos(theta);

                                context_pulse.lineTo(0.1*canvas_pulse.width/dpr+(i+1)*0.8*canvas_pulse.width/dpr/(event.target.result.profile.length-1), 0.85*canvas_pulse.height/dpr-event.target.result.profile[i+1]*0.8*canvas_pulse.height/dpr+amp*noise);
                            context_pulse.closePath();
                            context_pulse.stroke();
                            }

                            if (deltaTime > 5000.0) {
                                window.clearInterval(intId_pulse);
                            }
                        }

                        // Make right subbox
                        const subbox_r = document.createElement('div');
                        subbox_r.style.display = 'grid';
                        subbox_r.style.gridTemplateRows = '1fr 8fr';
                        box.appendChild(subbox_r);

                        // Make upper subsubbox in right subbox
                        const subsubbox_u = document.createElement('div');
                        subsubbox_u.style.display = 'flex';
                        subsubbox_u.style.alignItems = 'center';
                        subbox_r.appendChild(subsubbox_u);

                        // Make jname para
                        const p_jname = document.createElement('p');
                        p_jname.innerHTML = `PSR ${event.target.result.jname.replace('-', '\u2212')}`;
                        p_jname.style.fontFamily = 'system-ui, ui-rounded, sans-serif, serif';
                        p_jname.style.fontSize = '1.8vmin';
                        p_jname.style.fontWeight = 400;
                        subsubbox_u.appendChild(p_jname);

                        // Make meta para
                        if (event.target.result.meta !== 'na') {
                            const p_meta = document.createElement('p');
                            p_meta.innerHTML = `\xA0 ${event.target.result.meta.replace(/_/g, ' ')}`;
                            p_meta.style.fontFamily = 'system-ui, ui-rounded, sans-serif, serif';
                            p_meta.style.fontSize = '1.6vmin';
                            p_meta.style.fontWeight = 400;
                            p_meta.style.color = 'dimgray';
                            subsubbox_u.appendChild(p_meta);
                        }

                        // Make lower subsubbox in right subbox
                        const subsubbox_l = document.createElement('div');
                        subsubbox_l.style.display = 'grid';
                        subsubbox_l.style.gridTemplateColumns = 'repeat(auto-fill, minmax(50vmin, 1fr))';
                        subsubbox_l.style.gridAutoRows = '10vmin';
                        subbox_r.appendChild(subsubbox_l);

                        if (event.target.result.raj !== 'na') {
                            // Make sub3box for raj
                            const sub3box_raj = document.createElement('div');
                            subsubbox_l.appendChild(sub3box_raj);

                            // Make sub4box for raj text
                            const sub4box_raj_text = document.createElement('div');
                            sub4box_raj_text.style.width = '100%';
                            sub4box_raj_text.style.height = '20%';
                            sub4box_raj_text.style.position = 'relative';
                            sub4box_raj_text.style.top = '-10%';
                            sub4box_raj_text.style.left = '0%';
                            sub3box_raj.appendChild(sub4box_raj_text);

                            // Make canvas for raj text
                            const canvas_raj_text = document.createElement('canvas');
                            canvas_raj_text.style.width = '100%';
                            canvas_raj_text.style.height = '100%';
                            canvas_raj_text.style.position = 'relative';
                            canvas_raj_text.style.top = '0%';
                            canvas_raj_text.style.left = '0%';
                            sub4box_raj_text.appendChild(canvas_raj_text);

                            const dpr = window.devicePixelRatio;
                            const rect_raj_text = sub4box_raj_text.getBoundingClientRect();

                            canvas_raj_text.width = rect_raj_text.width*dpr;
                            canvas_raj_text.height = rect_raj_text.height*dpr;

                            const context_raj_text = canvas_raj_text.getContext('2d');
                            context_raj_text.scale(dpr, dpr);
                            context_raj_text.font = '1.4vmin system-ui';

                            let hour = 0;
                            let minute = 0;
                            let second = 0;

                            const startDate = new Date();
                            const startTime = startDate.getTime();

                            const intId_raj_text = window.setInterval(drawRajText, 100);

                            // Draw raj text
                            function drawRajText() {
                                // Clear canvas
                                context_raj_text.clearRect(0, 0, canvas_raj_text.width, canvas_raj_text.height);

                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime() - startTime;

                                // This raj degree
                                const thisRajDeg = deltaTime/5000 * event.target.result.rajDeg;

                                // Find h, m, s
                                hour = Math.floor(thisRajDeg/360*24);
                                minute = Math.floor((thisRajDeg/360*24 - hour)*60);
                                second = Math.round(((thisRajDeg/360*24 - hour)*60 - minute)*60*10)/10;

                                let hour_str;
                                if (hour<10) { hour_str =  `0${hour}`; } 
                                else { hour_str = hour.toString(); }

                                let minute_str;
                                if (minute<10) { minute_str = `0${minute}`; }
                                else { minute_str = minute.toString(); }

                                let second_str;
                                if (second<10) { second_str = `0${second}`; }
                                else { second_str = second.toString(); }

                                // Draw
                                context_raj_text.fillText(`R. A. (h:m:s): ${hour_str}:${minute_str}:${second_str}`, 0, 0.6*canvas_raj_text.height/dpr);

                                if (deltaTime > 4900.0) {
                                    window.clearInterval(intId_raj_text);
                                    context_raj_text.clearRect(0, 0, canvas_raj_text.width, canvas_raj_text.height);
                                    context_raj_text.fillText(`R. A. (h:m:s): ${event.target.result.raj}`, 0, 0.6*canvas_raj_text.height/dpr);
                                }
                            }

                            // Make sub4box for raj pin
                            const sub4box_raj_pin = document.createElement('div');
                            sub4box_raj_pin.style.width = '100%';
                            sub4box_raj_pin.style.height = '20%';
                            sub4box_raj_pin.style.position = 'relative';
                            sub4box_raj_pin.style.top = '-10%';
                            sub4box_raj_pin.style.left = '0%';
                            sub3box_raj.appendChild(sub4box_raj_pin);
                    
                            // Make canvas for raj pin
                            const canvas_raj_pin = document.createElement('canvas');
                            canvas_raj_pin.style.width = '100%';
                            canvas_raj_pin.style.height = '100%';
                            canvas_raj_pin.style.position = 'relative';
                            canvas_raj_pin.style.top = '0%';
                            canvas_raj_pin.style.left = '0%';
                            sub4box_raj_pin.appendChild(canvas_raj_pin);

                            // Get bounding rectangle
                            const rect_raj_pin = sub4box_raj_pin.getBoundingClientRect();

                            canvas_raj_pin.width = rect_raj_pin.width*dpr;
                            canvas_raj_pin.height = rect_raj_pin.height*dpr;

                            const context_raj_pin = canvas_raj_pin.getContext('2d');
                            context_raj_pin.scale(dpr, dpr);
                            context_raj_pin.lineWidth = 0.5;

                            const intId_raj_pin = window.setInterval(drawRajPin, 10);

                            function drawRajPin() {
                                // Clear canvas
                                context_raj_pin.clearRect(0, 0, canvas_raj_pin.width, canvas_raj_pin.height);
        
                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime() - startTime;
        
                                const speed = 0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr/5000;
        
                                // Draw
                                context_raj_pin.beginPath();
                                context_raj_pin.moveTo(0.05*canvas_raj_pin.width/dpr+speed*deltaTime, 0.2*canvas_raj_pin.height/dpr);
                                context_raj_pin.lineTo(0.05*canvas_raj_pin.width/dpr+speed*deltaTime, 0.8*canvas_raj_pin.height/dpr);
                                context_raj_pin.closePath();
                                context_raj_pin.stroke();
        
                                if (deltaTime > 4990) {
                                    window.clearInterval(intId_raj_pin);
                                    context_raj_pin.clearRect(0, 0, canvas_raj_pin.width, canvas_raj_pin.height);
                                    context_raj_pin.beginPath();
                                    context_raj_pin.moveTo(0.05*canvas_raj_pin.width/dpr+0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr, 0.2*canvas_raj_pin.height/dpr);
                                    context_raj_pin.lineTo(0.05*canvas_raj_pin.width/dpr+0.9*canvas_raj_pin.width*event.target.result.rajDeg/360/dpr, 0.8*canvas_raj_pin.height/dpr);
                                    context_raj_pin.closePath();
                                    context_raj_pin.stroke();
                                }
                            }

                            // Make sub4box for raj scale
                            const sub4box_raj_scale = document.createElement('div');
                            sub4box_raj_scale.style.width = '100%';
                            sub4box_raj_scale.style.height = '60%';
                            sub4box_raj_scale.style.position = 'relative';
                            sub4box_raj_scale.style.top = '0%';
                            sub4box_raj_scale.style.left = '0%';
                            sub3box_raj.appendChild(sub4box_raj_scale);

                            // Make canvas for raj scale
                            const canvas_raj_scale = document.createElement('canvas');
                            canvas_raj_scale.style.width = '100%';
                            canvas_raj_scale.style.height = '100%';
                            canvas_raj_scale.style.position = 'relative';
                            canvas_raj_scale.style.top = '0%';
                            canvas_raj_scale.style.left = '0%';
                            sub4box_raj_scale.appendChild(canvas_raj_scale);

                            // Get bounding rectangle
                            const rect_raj_scale = sub4box_raj_scale.getBoundingClientRect();

                            canvas_raj_scale.width = rect_raj_scale.width*dpr;
                            canvas_raj_scale.height = rect_raj_scale.height*dpr;

                            const context_raj_scale = canvas_raj_scale.getContext('2d');
                            context_raj_scale.scale(dpr, dpr);

                            // Group raj degree numbers
                            const rajDegs = positions.filter(posn => posn[0]>-1.0).map(posn => posn[0]).sort((deg1, deg2) => {
                                if (deg1 < deg2) {
                                    return -1;
                                }
                            });

                            // Histogram boundaries
                            const boundMin = 0.99*rajDegs[0]; 
                            const boundMax = 1.01*rajDegs[rajDegs.length-1];

                            // Bin
                            const binNum = 64;
                            const binSize = (boundMax-boundMin)/binNum;

                            // Group
                            let counts = [];
                            for (let i=0; i<binNum; i++) {
                               const count = rajDegs.filter(deg => deg > boundMin+i*binSize && deg <= boundMin+(i+1)*binSize).length;
                               counts.push(count);
                            }

                            // Draw
                            const cmax = Math.max(...counts);
                            const cmin = Math.min(...counts);
                            for (let i=0; i<counts.length; i++) {
                                const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                                const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                                const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                                context_raj_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                                context_raj_scale.fillRect(0.05*canvas_raj_scale.width/dpr+i*0.9*canvas_raj_scale.width/dpr/binNum, 0, (0.9*canvas_raj_scale.width/dpr-4*0.9*canvas_raj_scale.width/dpr/binNum)/binNum, 0.5*canvas_raj_scale.height/dpr);
                            }

                            // Label
                            context_raj_scale.font = '1.4vmin system-ui';
                            context_raj_scale.fillStyle = 'black';
                            for (let i=0; i<5; i++) {
                                const hour = 6*i;
                                let label = hour.toString();
                                if (i === 0) { label += '(h)'; }
                                context_raj_scale.fillText(label, (0.05+0.225*i)*canvas_raj_scale.width/dpr, 0.8*canvas_raj_scale.height/dpr);
                            }
                        }

                        // Make sub3box for decj
                        if (event.target.result.decj !== 'na') {
                            const sub3box_decj = document.createElement('div');
                            subsubbox_l.appendChild(sub3box_decj);

                            // Make sub4box for decj text
                            const sub4box_decj_text = document.createElement('div');
                            sub4box_decj_text.style.width = '100%';
                            sub4box_decj_text.style.height = '20%';
                            sub4box_decj_text.style.position = 'relative';
                            sub4box_decj_text.style.top = '-10%';
                            sub4box_decj_text.style.left = '0%';
                            sub3box_decj.appendChild(sub4box_decj_text);

                            // Make canvas for decj text
                            const canvas_decj_text = document.createElement('canvas');
                            canvas_decj_text.style.width = '100%';
                            canvas_decj_text.style.height = '100%';
                            canvas_decj_text.style.position = 'relative';
                            canvas_decj_text.style.top = '0%';
                            canvas_decj_text.style.left = '0%';
                            sub4box_decj_text.appendChild(canvas_decj_text);

                            const dpr = window.devicePixelRatio;
                            const rect_decj_text = sub4box_decj_text.getBoundingClientRect();

                            canvas_decj_text.width = rect_decj_text.width*dpr;
                            canvas_decj_text.height = rect_decj_text.height*dpr;

                            const context_decj_text = canvas_decj_text.getContext('2d');
                            context_decj_text.scale(dpr, dpr);
                            context_decj_text.font = '1.4vmin system-ui';

                            let degree = 0;
                            let minute = 0;
                            let second = 0;

                            const startDate = new Date();
                            const startTime = startDate.getTime();

                            const intId_decj_text = window.setInterval(drawDecjText, 100);

                            // Draw decj text
                            function drawDecjText() {
                                // Clear canvas
                                context_decj_text.clearRect(0, 0, canvas_decj_text.width, canvas_decj_text.height);

                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime() - startTime;

                                // This decj degree
                                const thisDecjDeg = deltaTime/5000 * event.target.result.decjDeg;

                                // Find d, m, s
                                degree = Math.trunc(thisDecjDeg);
                                minute = Math.trunc(Math.abs(thisDecjDeg - degree)*60);
                                second = Math.round((Math.abs(thisDecjDeg - degree)*60 - minute)*60*10)/10;

                                let degree_str;
                                if (degree < 0) {
                                    if (degree > -10) {
                                        degree_str = `\u22120${Math.abs(degree)}`;
                                    } else {
                                        degree_str = `\u2212${Math.abs(degree)}`;
                                    }
                                } else if (degree > 0) {
                                    if (degree < 10) {
                                        degree_str = `+0${degree}`;
                                    } else {
                                        degree_str = `+${degree}`;
                                    }
                                } else {
                                    degree_str = '0';
                                }

                                let minute_str;
                                if (minute < 10) { minute_str = `0${minute}`; } 
                                else { minute_str = minute.toString(); }

                                let second_str;
                                if (second < 10) { second_str = `0${second}`; } 
                                else { second_str = second.toString(); }

                                // Draw
                                context_decj_text.fillText(`Dec. (d:m:s): ${degree_str}:${minute_str}:${second_str}`, 0, 0.6*canvas_decj_text.height/dpr);

                                if (deltaTime > 4900) {
                                    window.clearInterval(intId_decj_text);
                                    context_decj_text.clearRect(0, 0, canvas_decj_text.width, canvas_decj_text.height);
                                    if (parseFloat(event.target.result.decjDeg)<0) {
                                        context_decj_text.fillText(`Dec.: (d:m:s): ${event.target.result.decj.replace('-', '\u2212')}`, 0, 0.6*canvas_decj_text.height/dpr);
                                    } else {
                                        context_decj_text.fillText(`Dec.: (d:m:s): ${event.target.result.decj}`, 0, 0.6*canvas_decj_text.height/dpr);
                                    }
                                }
                            }

                            // Make sub4box for decj pin
                            const sub4box_decj_pin = document.createElement('div');
                            sub4box_decj_pin.style.width = '100%';
                            sub4box_decj_pin.style.height = '20%';
                            sub4box_decj_pin.style.position = 'relative';
                            sub4box_decj_pin.style.top = '-10%';
                            sub4box_decj_pin.style.left = '0%';
                            sub3box_decj.appendChild(sub4box_decj_pin);

                            // Make canvas for decj pin
                            const canvas_decj_pin = document.createElement('canvas');
                            canvas_decj_pin.style.width = '100%';
                            canvas_decj_pin.style.height = '100%';
                            canvas_decj_pin.style.position = 'relative';
                            canvas_decj_pin.style.top = '0%';
                            canvas_decj_pin.style.left = '0%';
                            sub4box_decj_pin.appendChild(canvas_decj_pin);

                            // Get bounding rectangle
                            const rect_decj_pin = sub4box_decj_pin.getBoundingClientRect();

                            canvas_decj_pin.width = rect_decj_pin.width*dpr;
                            canvas_decj_pin.height = rect_decj_pin.height*dpr;

                            const context_decj_pin = canvas_decj_pin.getContext('2d');
                            context_decj_pin.scale(dpr, dpr);
                            context_decj_pin.lineWidth = 0.5;

                            const intId_decj_pin = window.setInterval(drawDecjPin, 10);

                            function drawDecjPin() {
                                // Clear canvas
                                context_decj_pin.clearRect(0, 0, canvas_decj_pin.width, canvas_decj_pin.height);
        
                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime() - startTime;
        
                                const speed = 0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90/5000;
        
                                // Draw
                                context_decj_pin.beginPath();
                                context_decj_pin.moveTo(0.5*canvas_decj_pin.width/dpr+speed*deltaTime, 0.2*canvas_decj_pin.height/dpr);
                                context_decj_pin.lineTo(0.5*canvas_decj_pin.width/dpr+speed*deltaTime, 0.8*canvas_decj_pin.height/dpr);
                                context_decj_pin.closePath();
                                context_decj_pin.stroke();
        
                                if (deltaTime > 4990) {
                                    window.clearInterval(intId_decj_pin);
                                    context_decj_pin.clearRect(0, 0, canvas_decj_pin.width, canvas_decj_pin.height);
                                    context_decj_pin.beginPath();
                                    context_decj_pin.moveTo(0.5*canvas_decj_pin.width/dpr+0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90, 0.2*canvas_decj_pin.height/dpr);
                                    context_decj_pin.lineTo(0.5*canvas_decj_pin.width/dpr+0.45*canvas_decj_pin.width/dpr*event.target.result.decjDeg/90, 0.8*canvas_decj_pin.height/dpr);
                                    context_decj_pin.closePath();
                                    context_decj_pin.stroke();
                                }
                            }

                            // Make sub4box for decj scale
                            const sub4box_decj_scale = document.createElement('div');
                            sub4box_decj_scale.style.width = '100%';
                            sub4box_decj_scale.style.height = '60%';
                            sub4box_decj_scale.style.position = 'relative';
                            sub4box_decj_scale.style.top = '0%';
                            sub4box_decj_scale.style.left = '0%';
                            sub3box_decj.appendChild(sub4box_decj_scale);

                            // Make canvas for decj scale
                            const canvas_decj_scale = document.createElement('canvas');
                            canvas_decj_scale.style.width = '100%';
                            canvas_decj_scale.style.height = '100%';
                            canvas_decj_scale.style.position = 'relative';
                            canvas_decj_scale.style.top = '0%';
                            canvas_decj_scale.style.left = '0%';
                            sub4box_decj_scale.appendChild(canvas_decj_scale);

                            // Get bounding rectangle
                            const rect_decj_scale = sub4box_decj_scale.getBoundingClientRect();

                            canvas_decj_scale.width = rect_decj_scale.width*dpr;
                            canvas_decj_scale.height = rect_decj_scale.height*dpr;

                            const context_decj_scale = canvas_decj_scale.getContext('2d');
                            context_decj_scale.scale(dpr, dpr);

                            // Group decj degree numbers
                            const decjDegs = positions.filter(posn => posn[1]>-91.0).map(posn => posn[1]).sort((deg1, deg2) => {
                                if (deg1 < deg2) {
                                    return -1;
                                }
                            });

                            // Histogram boundaries
                            const boundMin = 0.99*decjDegs[0];
                            const boundMax = 1.01*decjDegs[decjDegs.length-1];

                            // Bin
                            const binNum = 64;
                            const binSize = (boundMax-boundMin)/binNum;

                            // Group
                            let counts = [];
                            for (let i=0; i<binNum; i++) {
                                const count = decjDegs.filter(deg => deg > boundMin+i*binSize && deg <= boundMin+(i+1)*binSize).length;
                                counts.push(count);
                            }

                            // Draw
                            const cmax = Math.max(...counts);
                            const cmin = Math.min(...counts);
                            for (let i=0; i<counts.length; i++) {
                                const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                                const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                                const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                                context_decj_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                                context_decj_scale.fillRect(0.05*canvas_decj_scale.width/dpr+i*0.9*canvas_decj_scale.width/dpr/binNum, 0, (0.9*canvas_decj_scale.width/dpr - 4*0.9*canvas_decj_scale.width/dpr/binNum)/binNum, 0.5*canvas_decj_scale.height/dpr);
                            }

                            // Label
                            context_decj_scale.font = '1.4vmin system-ui';
                            context_decj_scale.fillStyle = 'black';
                            for (let i=0; i<5; i++) {
                                const degree = -90+i*45;
                                let label;
                                if (degree < 0) {
                                    label = `\u2212${Math.abs(degree)}`;
                                } else if (degree > 0) {
                                    label = `+${degree}`;
                                } else {
                                    label = '0';
                                }
                                if (i === 0) { label += '(d)'; }
                                context_decj_scale.fillText(label, (0.05+0.225*i)*canvas_decj_scale.width/dpr, 0.8*canvas_decj_scale.height/dpr);
                            }
                        }

                        // Make sub3box for p0
                        if (event.target.result.p0 !== 'na') {
                            const sub3box_p0 = document.createElement('div');
                            subsubbox_l.appendChild(sub3box_p0);

                            // Make sub4box for p0 text
                            const sub4box_p0_text = document.createElement('div');
                            sub4box_p0_text.style.width = '100%';
                            sub4box_p0_text.style.height = '20%';
                            sub4box_p0_text.style.position = 'relative';
                            sub4box_p0_text.style.top = '-10%';
                            sub4box_p0_text.style.left = '0%';
                            sub3box_p0.appendChild(sub4box_p0_text);

                            // Make canvas for p0 text
                            const canvas_p0_text = document.createElement('canvas');
                            canvas_p0_text.style.width = '100%';
                            canvas_p0_text.style.height = '100%';
                            canvas_p0_text.style.position = 'relative';
                            canvas_p0_text.style.top = '0%';
                            canvas_p0_text.style.left = '0%';
                            sub4box_p0_text.appendChild(canvas_p0_text);

                            const dpr = window.devicePixelRatio;
                            const rect_p0_text = sub4box_p0_text.getBoundingClientRect();

                            canvas_p0_text.width = rect_p0_text.width*dpr;
                            canvas_p0_text.height = rect_p0_text.height*dpr;

                            const context_p0_text = canvas_p0_text.getContext('2d');
                            context_p0_text.scale(dpr, dpr);
                            context_p0_text.font = '1.4vmin system-ui';

                            const startDate = new Date();
                            const startTime = startDate.getTime();

                            const intId_p0_text = window.setInterval(drawP0Text, 100);

                            function drawP0Text() {
                                // Clear canvas
                                context_p0_text.clearRect(0, 0, canvas_p0_text.width, canvas_p0_text.height);
        
                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime() - startTime;
        
                                // This period
                                const thisP = deltaTime/5000 * parseFloat(event.target.result.p0);
        
                                // Draw
                                context_p0_text.fillText(`Period (s): ${thisP.toFixed(6)}`, 0, 0.6*canvas_p0_text.height/dpr);
        
                                if (deltaTime > 4900) {
                                    window.clearInterval(intId_p0_text);
                                    context_p0_text.clearRect(0, 0, canvas_p0_text.width, canvas_p0_text.height);
                                    context_p0_text.fillText(`Period (s): ${event.target.result.p0}`, 0, 0.6*canvas_p0_text.height/dpr);
                                }
                            }

                            // Make sub4box for p0 pin
                            const sub4box_p0_pin = document.createElement('div');
                            sub4box_p0_pin.style.width = '100%';
                            sub4box_p0_pin.style.height = '20%';
                            sub4box_p0_pin.style.position = 'relative';
                            sub4box_p0_pin.style.top = '-10%';
                            sub4box_p0_pin.style.left = '0%';
                            sub3box_p0.appendChild(sub4box_p0_pin);

                            // Make canvas for p0 pin
                            const canvas_p0_pin = document.createElement('canvas');
                            canvas_p0_pin.style.width = '100%';
                            canvas_p0_pin.style.height = '100%';
                            canvas_p0_pin.style.position = 'relative';
                            canvas_p0_pin.style.top = '0%';
                            canvas_p0_pin.style.left = '0%';
                            sub4box_p0_pin.appendChild(canvas_p0_pin);

                            const rect_p0_pin = sub4box_p0_pin.getBoundingClientRect();

                            canvas_p0_pin.width = rect_p0_pin.width*dpr;
                            canvas_p0_pin.height = rect_p0_pin.height*dpr;

                            const context_p0_pin = canvas_p0_pin.getContext('2d');
                            context_p0_pin.scale(dpr, dpr);
                            context_p0_pin.lineWidth = 0.5;
                    
                            const intId_p0_pin = window.setInterval(drawP0Pin, 10);

                            // Log10 periods
                            const lgPs = positions.filter(posn => !Number.isNaN(posn[3])).map(posn => Math.log10(posn[3])).sort((lgP1, lgP2) => {
                                if (lgP1 < lgP2) {
                                    return -1;
                                }
                            });
                    
                            // Speed
                            const speed = 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]) / 5000;

                            // Draw p0 pin
                            function drawP0Pin() {
                                // Clear canvas
                                context_p0_pin.clearRect(0, 0, canvas_p0_pin.width, canvas_p0_pin.height);

                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime() - startTime;

                                // Draw
                                context_p0_pin.beginPath();
                                context_p0_pin.moveTo(0.05*canvas_p0_pin.width/dpr+speed*deltaTime, 0.2*canvas_p0_pin.height/dpr);
                                context_p0_pin.lineTo(0.05*canvas_p0_pin.width/dpr+speed*deltaTime, 0.8*canvas_p0_pin.height/dpr);
                                context_p0_pin.closePath();
                                context_p0_pin.stroke();

                                if (deltaTime > 4990) {
                                    window.clearInterval(intId_p0_pin);
                                    context_p0_pin.clearRect(0, 0, canvas_p0_pin.width, canvas_p0_pin.height);
                                    context_p0_pin.beginPath();
                                    context_p0_pin.moveTo(0.05*canvas_p0_pin.width/dpr + 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]), 0.2*canvas_p0_pin.height/dpr);
                                    context_p0_pin.lineTo(0.05*canvas_p0_pin.width/dpr + 0.9*canvas_p0_pin.width/dpr * (Math.log10(parseFloat(event.target.result.p0)) - lgPs[0]) / (lgPs[lgPs.length-1] - lgPs[0]), 0.8*canvas_p0_pin.height/dpr);
                                    context_p0_pin.closePath();
                                    context_p0_pin.stroke();
                                }
                            }

                            // Make sub4box for p0 scale
                            const sub4box_p0_scale = document.createElement('div');
                            sub4box_p0_scale.style.width = '100%';
                            sub4box_p0_scale.style.height = '60%';
                            sub4box_p0_scale.style.position = 'relative';
                            sub4box_p0_scale.style.top = '0%';
                            sub4box_p0_scale.style.left = '0%';
                            sub3box_p0.appendChild(sub4box_p0_scale);

                            // Make canvas for p0 scale
                            const canvas_p0_scale = document.createElement('canvas');
                            canvas_p0_scale.style.width = '100%';
                            canvas_p0_scale.style.height = '100%';
                            canvas_p0_scale.style.position = 'relative';
                            canvas_p0_scale.style.top = '0%';
                            canvas_p0_scale.style.left = '0%';
                            sub4box_p0_scale.appendChild(canvas_p0_scale);

                            // Get bounding rectangle
                            const rect_p0_scale = sub4box_p0_scale.getBoundingClientRect();

                            canvas_p0_scale.width = rect_p0_scale.width*dpr;
                            canvas_p0_scale.height = rect_p0_scale.height*dpr;

                            const context_p0_scale = canvas_p0_scale.getContext('2d');
                            context_p0_scale.scale(dpr, dpr);

                            // Histogram boundaries
                            const boundMin = 0.99*lgPs[0];
                            const boundMax = 1.01*lgPs[lgPs.length-1];

                            // Bin
                            const binNum = 64;
                            const binSize = (boundMax-boundMin)/binNum;

                            // Group
                            let counts = [];
                            for (let i=0; i<binNum; i++) {
                                const count = lgPs.filter(lgP => lgP > boundMin+i*binSize && lgP <= boundMin+(i+1)*binSize).length;
                                counts.push(count);
                            }

                            // Draw
                            const cmax = Math.max(...counts);
                            const cmin = Math.min(...counts);
                            for (i=0; i<counts.length; i++) {
                                const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                                const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                                const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                                context_p0_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                                context_p0_scale.fillRect(0.05*canvas_p0_scale.width/dpr+i*0.9*canvas_p0_scale.width/dpr/binNum, 0, (0.9*canvas_p0_scale.width/dpr-4*0.9*canvas_p0_scale.width/dpr/binNum)/binNum, 0.5*canvas_p0_scale.height/dpr);
                            }

                            // Label
                            context_p0_scale.font = '1.4vmin system-ui';
                            context_p0_scale.fillStyle = 'black';
                            for (let i=0; i<8; i++) {
                                const lgP = -2.5+0.5*i;
                                let label;
                                if (i !== 7) {
                                    label = Math.pow(10, lgP).toPrecision(1);
                                } else {
                                    label = Math.pow(10, lgP).toPrecision(2);
                                }
                                context_p0_scale.fillText(label, 0.05*canvas_p0_scale.width/dpr + 0.9*canvas_p0_scale.width/dpr*(Math.log10(parseFloat(label))-lgPs[0])/(lgPs[lgPs.length-1]-lgPs[0]), 0.8*canvas_p0_scale.height/dpr);
                            }
                        }

                        // Make sub3box for dm
                        if (event.target.result.dm !== 'na') {
                            const sub3box_dm = document.createElement('div');
                            subsubbox_l.appendChild(sub3box_dm);

                            // Make sub4box for dm text
                            const sub4box_dm_text = document.createElement('div');
                            sub4box_dm_text.style.width = '100%';
                            sub4box_dm_text.style.height = '20%';
                            sub4box_dm_text.style.position = 'relative';
                            sub4box_dm_text.style.top = '-10%';
                            sub4box_dm_text.style.left = '0%';
                            sub3box_dm.appendChild(sub4box_dm_text);

                            // Make canvas for dm text
                            const canvas_dm_text = document.createElement('canvas');
                            canvas_dm_text.style.width = '100%';
                            canvas_dm_text.style.height = '100%';
                            canvas_dm_text.style.position = 'relative';
                            canvas_dm_text.style.top = '0%';
                            canvas_dm_text.style.left = '0%';
                            sub4box_dm_text.appendChild(canvas_dm_text);

                            const dpr = window.devicePixelRatio;
                            const rect_dm_text = sub4box_dm_text.getBoundingClientRect();

                            canvas_dm_text.width = rect_dm_text.width*dpr;
                            canvas_dm_text.height = rect_dm_text.height*dpr;

                            const context_dm_text = canvas_dm_text.getContext('2d');
                            context_dm_text.scale(dpr, dpr);
                            context_dm_text.font = '1.4vmin system-ui';

                            const startDate = new Date();
                            const startTime = startDate.getTime();

                            const intId_dm_text = window.setInterval(drawDMText, 100);

                            function drawDMText() {
                                // Clear canvas
                                context_dm_text.clearRect(0, 0, canvas_dm_text.width, canvas_dm_text.height);
        
                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime()-startTime;
        
                                // This DM
                                const thisDM = deltaTime/5000 * parseFloat(event.target.result.dm);
        
                                // Draw
                                context_dm_text.fillText(`DM (pc cm^-3): ${thisDM.toFixed(2)}`, 0, 0.6*canvas_dm_text.height/dpr);
        
                                if (deltaTime > 4900) {
                                    window.clearInterval(intId_dm_text);
                                    context_dm_text.clearRect(0, 0, canvas_dm_text.width, canvas_dm_text.height);
                                    context_dm_text.fillText(`DM (pc cm^-3): ${event.target.result.dm}`, 0, 0.6*canvas_dm_text.height/dpr);
                                }
                            }

                            // Make sub4box for dm pin
                            const sub4box_dm_pin = document.createElement('div');
                            sub4box_dm_pin.style.width = '100%';
                            sub4box_dm_pin.style.height = '20%';
                            sub4box_dm_pin.style.position = 'relative';
                            sub4box_dm_pin.style.top = '-10%';
                            sub4box_dm_pin.style.left = '0%';
                            sub3box_dm.appendChild(sub4box_dm_pin);

                            // Make canvas for dm pin
                            const canvas_dm_pin = document.createElement('canvas');
                            canvas_dm_pin.style.width = '100%';
                            canvas_dm_pin.style.height = '100%';
                            canvas_dm_pin.style.position = 'relative';
                            canvas_dm_pin.style.top = '0%';
                            canvas_dm_pin.style.left = '0%';
                            sub4box_dm_pin.appendChild(canvas_dm_pin);

                            const rect_dm_pin = sub4box_dm_pin.getBoundingClientRect();

                            canvas_dm_pin.width = rect_dm_pin.width*dpr;
                            canvas_dm_pin.height = rect_dm_pin.height*dpr;

                            const context_dm_pin = canvas_dm_pin.getContext('2d');
                            context_dm_pin.scale(dpr, dpr);
                            context_dm_pin.lineWidth = 0.5;

                            // Log10 dm values
                            const lgDMs = positions.filter(posn => !Number.isNaN(posn[2])).map(posn => Math.log10(posn[2])).sort((lgDM1, lgDM2) => {
                                if (lgDM1 < lgDM2) {
                                    return -1;
                                }
                            });
                    
                            // Speed
                            const speed = 0.9*canvas_dm_pin.width/dpr * (Math.log10(parseFloat(event.target.result.dm)) - lgDMs[0]) / (lgDMs[lgDMs.length-1] - lgDMs[0]) / 5000;

                            const intId_dm_pin = window.setInterval(drawDMPin, 10);

                            // Draw DM pin
                            function drawDMPin() {
                                // Clear canvas
                                context_dm_pin.clearRect(0, 0, canvas_dm_pin.width, canvas_dm_pin.height);

                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime() - startTime;

                                // Draw
                                context_dm_pin.beginPath();
                                context_dm_pin.moveTo(0.05*canvas_dm_pin.width/dpr+speed*deltaTime, 0.2*canvas_dm_pin.height/dpr);
                                context_dm_pin.lineTo(0.05*canvas_dm_pin.width/dpr+speed*deltaTime, 0.8*canvas_dm_pin.height/dpr);
                                context_dm_pin.closePath();
                                context_dm_pin.stroke();

                                if (deltaTime > 4990) {
                                    window.clearInterval(intId_dm_pin);
                                    context_dm_pin.clearRect(0, 0, canvas_dm_pin.width, canvas_dm_pin.height);
                                    context_dm_pin.beginPath();
                                    context_dm_pin.moveTo(0.05*canvas_dm_pin.width/dpr+0.9*canvas_dm_pin.width/dpr*(Math.log10(parseFloat(event.target.result.dm))-lgDMs[0])/(lgDMs[lgDMs.length-1]-lgDMs[0]), 0.2*canvas_dm_pin.height/dpr);
                                    context_dm_pin.lineTo(0.05*canvas_dm_pin.width/dpr+0.9*canvas_dm_pin.width/dpr*(Math.log10(parseFloat(event.target.result.dm))-lgDMs[0])/(lgDMs[lgDMs.length-1]-lgDMs[0]), 0.8*canvas_dm_pin.height/dpr);
                                    context_dm_pin.closePath();
                                    context_dm_pin.stroke();
                                }
                            }

                            // Make sub4box for dm scale
                            const sub4box_dm_scale = document.createElement('div');
                            sub4box_dm_scale.style.width = '100%';
                            sub4box_dm_scale.style.height = '60%';
                            sub4box_dm_scale.style.position = 'relative';
                            sub4box_dm_scale.style.top = '0%';
                            sub4box_dm_scale.style.left = '0%';
                            sub3box_dm.appendChild(sub4box_dm_scale);

                            // Make canvas for dm scale
                            const canvas_dm_scale = document.createElement('canvas');
                            canvas_dm_scale.style.width = '100%';
                            canvas_dm_scale.style.height = '100%';
                            canvas_dm_scale.style.position = 'relative';
                            canvas_dm_scale.style.top = '0%';
                            canvas_dm_scale.style.left = '0%';
                            sub4box_dm_scale.appendChild(canvas_dm_scale);

                            // Get bounding rectangle
                            const rect_dm_scale = sub4box_dm_scale.getBoundingClientRect();

                            canvas_dm_scale.width = rect_dm_scale.width*dpr;
                            canvas_dm_scale.height = rect_dm_scale.height*dpr;

                            const context_dm_scale = canvas_dm_scale.getContext('2d');
                            context_dm_scale.scale(dpr, dpr);

                            // Histogram boundaries
                            const boundMin = 0.99*lgDMs[0];
                            const boundMax = 1.01*lgDMs[lgDMs.length-1];

                            // Bin
                            const binNum = 64;
                            const binSize = (boundMax-boundMin)/binNum;

                            // Group
                            let counts = [];
                            for (let i=0; i<binNum; i++) {
                                const count = lgDMs.filter(lgDM => lgDM > boundMin+i*binSize && lgDM <= boundMin+(i+1)*binSize).length;
                                counts.push(count);
                            }

                            // Draw
                            const cmax = Math.max(...counts);
                            const cmin = Math.min(...counts);
                            for (i=0; i<counts.length; i++) {
                                const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                                const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                                const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                                context_dm_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                                context_dm_scale.fillRect(0.05*canvas_dm_scale.width/dpr+i*0.9*canvas_dm_scale.width/dpr/binNum, 0, (0.9*canvas_dm_scale.width/dpr-4*0.9*canvas_dm_scale.width/dpr/binNum)/binNum, 0.5*canvas_dm_scale.height/dpr);
                            }

                            // Label
                            context_dm_scale.font = '1.4vmin system-ui';
                            context_dm_scale.fillStyle = 'black';
                            for (let i=0; i<6; i++) {
                                const lgDM = 0.5+0.5*i;
                                let label = Math.pow(10, lgDM).toFixed(0);
                                if (label === '32') { label = '30'; }
                                if (label === '316') { label = '300'; }
                                context_dm_scale.fillText(label, 0.05*canvas_dm_scale.width/dpr + 0.9*canvas_dm_scale.width/dpr*(Math.log10(parseFloat(label)) - lgDMs[0])/(lgDMs[lgDMs.length-1] - lgDMs[0]), 0.8*canvas_dm_scale.height/dpr);
                            }
                        }

                        // Make sub3box for pmra
                        if (event.target.result.pmra !== 'na') {
                            const sub3box_pmra = document.createElement('div');
                            subsubbox_l.appendChild(sub3box_pmra);

                            // Make sub4box for pmra text
                            const sub4box_pmra_text = document.createElement('div');
                            sub4box_pmra_text.style.width = '100%';
                            sub4box_pmra_text.style.height = '20%';
                            sub4box_pmra_text.style.position = 'relative';
                            sub4box_pmra_text.style.top = '-10%';
                            sub4box_pmra_text.style.left = '0%';
                            sub3box_pmra.appendChild(sub4box_pmra_text);

                            // Make canvas for pmra text
                            const canvas_pmra_text = document.createElement('canvas');
                            canvas_pmra_text.style.width = '100%';
                            canvas_pmra_text.style.height = '100%';
                            canvas_pmra_text.style.position = 'relative';
                            canvas_pmra_text.style.top = '0%';
                            canvas_pmra_text.style.left = '0%';
                            sub4box_pmra_text.appendChild(canvas_pmra_text);

                            const dpr = window.devicePixelRatio;
                            const rect_pmra_text = sub4box_pmra_text.getBoundingClientRect();

                            canvas_pmra_text.width = rect_pmra_text.width*dpr;
                            canvas_pmra_text.height = rect_pmra_text.height*dpr;

                            const context_pmra_text = canvas_pmra_text.getContext('2d');
                            context_pmra_text.scale(dpr, dpr);
                            context_pmra_text.font = '1.4vmin system-ui';

                            const startDate = new Date();
                            const startTime = startDate.getTime();

                            const intId_pmra_text = window.setInterval(drawPMRAText, 100);

                            function drawPMRAText() {
                                // Clear canvas
                                context_pmra_text.clearRect(0, 0, canvas_pmra_text.width, canvas_pmra_text.height);
        
                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime()-startTime;
        
                                // This pmra
                                const thisPMRA = deltaTime/5000 * parseFloat(event.target.result.pmra);
        
                                // Draw
                                if (thisPMRA < 0) {
                                    context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): \u2212${Math.abs(thisPMRA).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                                } else {
                                    context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): ${thisPMRA.toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                                }
        
                                if (deltaTime > 4900) {
                                    window.clearInterval(intId_pmra_text);
                                    context_pmra_text.clearRect(0, 0, canvas_pmra_text.width, canvas_pmra_text.height);
                                    if (parseFloat(event.target.result.pmra) < 0) {
                                        context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): \u2212${Math.abs(parseFloat(event.target.result.pmra)).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                                    } else {
                                        context_pmra_text.fillText(`Proper motion in R.A. (mas yr^-1): ${parseFloat(event.target.result.pmra).toFixed(1)}`, 0, 0.6*canvas_pmra_text.height/dpr);
                                    }
                                }
                            }

                            // Make sub4box for pmra pin
                            const sub4box_pmra_pin = document.createElement('div');
                            sub4box_pmra_pin.style.width = '100%';
                            sub4box_pmra_pin.style.height = '20%';
                            sub4box_pmra_pin.style.position = 'relative';
                            sub4box_pmra_pin.style.top = '-10%';
                            sub4box_pmra_pin.style.left = '0%';
                            sub3box_pmra.appendChild(sub4box_pmra_pin);

                            // Make canvas for pmra pin
                            const canvas_pmra_pin = document.createElement('canvas');
                            canvas_pmra_pin.style.width = '100%';
                            canvas_pmra_pin.style.height = '100%';
                            canvas_pmra_pin.style.position = 'relative';
                            canvas_pmra_pin.style.top = '0%';
                            canvas_pmra_pin.style.left = '0%';
                            sub4box_pmra_pin.appendChild(canvas_pmra_pin);

                            const rect_pmra_pin = sub4box_pmra_pin.getBoundingClientRect();

                            canvas_pmra_pin.width = rect_pmra_pin.width*dpr;
                            canvas_pmra_pin.height = rect_pmra_pin.height*dpr;

                            const context_pmra_pin = canvas_pmra_pin.getContext('2d');
                            context_pmra_pin.scale(dpr, dpr);
                            context_pmra_pin.lineWidth = 0.5;

                            // pmra values
                            const PMRAs = positions.filter(posn => !Number.isNaN(posn[4])).map(posn => posn[4]).sort((pmra1, pmra2) => {
                                if (pmra1 < pmra2) {
                                    return -1;
                                }
                            });

                            const intId_pmra_pin = window.setInterval(drawPMRAPin, 10);

                            // Speed
                            let speed;
                            if (parseFloat(event.target.result.pmra) > 0) {
                                speed = +PMRAs[PMRAs.length-1]/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr*parseFloat(event.target.result.pmra)/PMRAs[PMRAs.length-1]/5000;
                            } else if (parseFloat(event.target.result.pmra) < 0) {
                                speed = -Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr*parseFloat(event.target.result.pmra)/PMRAs[0]/5000;
                            } else {
                                speed = 0;
                            }

                            function drawPMRAPin() {
                                // Clear canvas
                                context_pmra_pin.clearRect(0, 0, canvas_pmra_pin.width, canvas_pmra_pin.height);
        
                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime() - startTime;
        
                                // Draw
                                context_pmra_pin.beginPath();
                                context_pmra_pin.moveTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*deltaTime, 0.2*canvas_pmra_pin.height/dpr);
                                context_pmra_pin.lineTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*deltaTime, 0.8*canvas_pmra_pin.height/dpr);
                                context_pmra_pin.closePath();
                                context_pmra_pin.stroke();
        
                                if (deltaTime > 4990) {
                                    window.clearInterval(intId_pmra_pin);
                                    context_pmra_pin.clearRect(0, 0, canvas_pmra_pin.width, canvas_pmra_pin.height);
                                    context_pmra_pin.beginPath();
                                    context_pmra_pin.moveTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*5000, 0.2*canvas_pmra_pin.height/dpr);
                                    context_pmra_pin.lineTo(0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+speed*5000, 0.8*canvas_pmra_pin.height/dpr);
                                    context_pmra_pin.closePath();
                                    context_pmra_pin.stroke();
                                }
                            }

                            // Make sub4box for pmra scale
                            const sub4box_pmra_scale = document.createElement('div');
                            sub4box_pmra_scale.style.width = '100%';
                            sub4box_pmra_scale.style.height = '60%';
                            sub4box_pmra_scale.style.position = 'relative';
                            sub4box_pmra_scale.style.top = '0%';
                            sub4box_pmra_scale.style.left = '0%';
                            sub3box_pmra.appendChild(sub4box_pmra_scale);

                            // Make canvas for pmra scale
                            const canvas_pmra_scale = document.createElement('canvas');
                            canvas_pmra_scale.style.width = '100%';
                            canvas_pmra_scale.style.height = '100%';
                            canvas_pmra_scale.style.position = 'relative';
                            canvas_pmra_scale.style.top = '0%';
                            canvas_pmra_scale.style.left = '0%';
                            sub4box_pmra_scale.appendChild(canvas_pmra_scale);

                            // Get bounding rectangle
                            const rect_pmra_scale = sub4box_pmra_scale.getBoundingClientRect();

                            canvas_pmra_scale.width = rect_pmra_scale.width*dpr;
                            canvas_pmra_scale.height = rect_pmra_scale.height*dpr;

                            const context_pmra_scale = canvas_pmra_scale.getContext('2d');
                            context_pmra_scale.scale(dpr, dpr);

                            // Histogram bounds
                            const boundMin = 0.99*PMRAs[0];
                            const boundMax = 1.01*PMRAs[PMRAs.length-1];

                            // Bin
                            const binNum = 64;
                            const binSize = (boundMax-boundMin)/binNum;

                            // Group
                            let counts = [];
                            for (let i=0; i<binNum; i++) {
                                const count = PMRAs.filter(pmra => pmra > boundMin+i*binSize && pmra <= boundMin+(i+1)*binSize).length;
                                counts.push(count);
                            }

                            // Draw
                            const cmax = Math.max(...counts);
                            const cmin = Math.min(...counts);
                            for (let i=0; i<counts.length; i++) {
                                const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                                const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                                const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                                context_pmra_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                                context_pmra_scale.fillRect(0.05*canvas_pmra_scale.width/dpr+i*0.9*canvas_pmra_scale.width/dpr/binNum, 0, (0.9*canvas_pmra_scale.width/dpr - 4*0.9*canvas_pmra_scale.width/dpr/binNum)/binNum, 0.5*canvas_pmra_scale.height/dpr);
                            }

                            // Label
                            context_pmra_scale.font = '1.4vmin system-ui';
                            context_pmra_scale.fillStyle = 'black';
                            for (let i=0; i<9; i++) {
                                const pmra = -100+i*50;
                                let label;
                                if (pmra<0) {
                                    label = `\u2212${Math.abs(pmra)}`;
                                } else if (pmra>0) {
                                    label = `+${pmra}`;
                                } else {
                                    label = '0';
                                }
                                context_pmra_scale.fillText(label, 0.05*canvas_pmra_pin.width/dpr+Math.abs(PMRAs[0])/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_pin.width/dpr+pmra/(Math.abs(PMRAs[0])+PMRAs[PMRAs.length-1])*0.9*canvas_pmra_scale.width/dpr, 0.8*canvas_pmra_scale.height/dpr);
                            }
                        }

                        // Make sub3box for pmdec
                        if (event.target.result.pmdec !== 'na') {
                            const sub3box_pmdec = document.createElement('div');
                            subsubbox_l.appendChild(sub3box_pmdec);

                            // Make sub4box for pmdec text
                            const sub4box_pmdec_text = document.createElement('div');
                            sub4box_pmdec_text.style.width = '100%';
                            sub4box_pmdec_text.style.height = '20%';
                            sub4box_pmdec_text.style.position = 'relative';
                            sub4box_pmdec_text.style.top = '-10%';
                            sub4box_pmdec_text.style.left = '0%';
                            sub3box_pmdec.appendChild(sub4box_pmdec_text);

                            // Make canvas for pmdec text
                            const canvas_pmdec_text = document.createElement('canvas');
                            canvas_pmdec_text.style.width = '100%';
                            canvas_pmdec_text.style.height = '100%';
                            canvas_pmdec_text.style.position = 'relative';
                            canvas_pmdec_text.style.top = '0%';
                            canvas_pmdec_text.style.left = '0%';
                            sub4box_pmdec_text.appendChild(canvas_pmdec_text);

                            const dpr = window.devicePixelRatio;
                            const rect_pmdec_text = sub4box_pmdec_text.getBoundingClientRect();

                            canvas_pmdec_text.width = rect_pmdec_text.width*dpr;
                            canvas_pmdec_text.height = rect_pmdec_text.height*dpr;

                            const context_pmdec_text = canvas_pmdec_text.getContext('2d');
                            context_pmdec_text.scale(dpr, dpr);
                            context_pmdec_text.font = '1.4vmin system-ui';

                            const startDate = new Date();
                            const startTime = startDate.getTime();

                            const intId_pmdec_text = window.setInterval(drawPMDecText, 100);

                            function drawPMDecText() {
                                // Clear canvas
                                context_pmdec_text.clearRect(0, 0, canvas_pmdec_text.width, canvas_pmdec_text.height);
        
                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime()-startTime;
        
                                // This pmdec
                                const thisPMDec = deltaTime/5000 * parseFloat(event.target.result.pmdec);
        
                                // Draw
                                if (thisPMDec < 0) {
                                    context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): \u2212${Math.abs(thisPMDec).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                                } else {
                                    context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): ${Math.abs(thisPMDec).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                                }
        
                                if (deltaTime > 4900) {
                                    window.clearInterval(intId_pmdec_text);
                                    context_pmdec_text.clearRect(0, 0, canvas_pmdec_text.width, canvas_pmdec_text.height);
                                    if (parseFloat(event.target.result.pmdec) < 0) {
                                        context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): \u2212${Math.abs(parseFloat(event.target.result.pmdec)).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                                    } else {
                                        context_pmdec_text.fillText(`Proper motion in Dec. (mas yr^-1): ${Math.abs(parseFloat(event.target.result.pmdec)).toFixed(1)}`, 0, 0.6*canvas_pmdec_text.height/dpr);
                                    }
                                }
                            }

                            // Make sub4box for pmdec pin
                            const sub4box_pmdec_pin = document.createElement('div');
                            sub4box_pmdec_pin.style.width = '100%';
                            sub4box_pmdec_pin.style.height = '20%';
                            sub4box_pmdec_pin.style.position = 'relative';
                            sub4box_pmdec_pin.style.top = '-10%';
                            sub4box_pmdec_pin.style.left = '0%';
                            sub3box_pmdec.appendChild(sub4box_pmdec_pin);

                            // Make canvas for pmdec pin
                            const canvas_pmdec_pin = document.createElement('canvas');
                            canvas_pmdec_pin.style.width = '100%';
                            canvas_pmdec_pin.style.height = '100%';
                            canvas_pmdec_pin.style.position = 'relative';
                            canvas_pmdec_pin.style.top = '0%';
                            canvas_pmdec_pin.style.left = '0%';
                            sub4box_pmdec_pin.appendChild(canvas_pmdec_pin);

                            const rect_pmdec_pin = sub4box_pmdec_pin.getBoundingClientRect();

                            canvas_pmdec_pin.width = rect_pmdec_pin.width*dpr;
                            canvas_pmdec_pin.height = rect_pmdec_pin.height*dpr;

                            const context_pmdec_pin = canvas_pmdec_pin.getContext('2d');
                            context_pmdec_pin.scale(dpr, dpr);
                            context_pmdec_pin.lineWidth = 0.5;

                            // pmdec values
                            const PMDecs = positions.filter(posn => !Number.isNaN(posn[5])).map(posn => posn[5]).sort((pmdec1, pmdec2) => {
                                if (pmdec1 < pmdec2) {
                                    return -1;
                                }
                            });

                            // Speed
                            let speed;
                            if (parseFloat(event.target.result.pmdec) > 0) {
                                speed = +PMDecs[PMDecs.length-1]/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr*parseFloat(event.target.result.pmdec)/PMDecs[PMDecs.length-1]/5000;
                            } else if (parseFloat(event.target.result.pmdec) < 0) {
                                speed = -Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr*parseFloat(event.target.result.pmdec)/PMDecs[0]/5000;
                            } else {
                                speed = 0;
                            }

                            const intId_pmdec_pin = window.setInterval(drawPMDecPin, 10);

                            function drawPMDecPin() {
                                // Clear canvas
                                context_pmdec_pin.clearRect(0, 0, canvas_pmdec_pin.width, canvas_pmdec_pin.height);
        
                                // Delta time
                                const thisDate = new Date();
                                const deltaTime = thisDate.getTime()-startTime;
        
                                // Draw
                                context_pmdec_pin.beginPath();
                                context_pmdec_pin.moveTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*deltaTime, 0.2*canvas_pmdec_pin.height/dpr);
                                context_pmdec_pin.lineTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*deltaTime, 0.8*canvas_pmdec_pin.height/dpr);
                                context_pmdec_pin.closePath();
                                context_pmdec_pin.stroke();
        
                                if (deltaTime > 4990) {
                                    window.clearInterval(intId_pmdec_pin);
                                    context_pmdec_pin.clearRect(0, 0, canvas_pmdec_pin.width, canvas_pmdec_pin.height);
                                    context_pmdec_pin.beginPath();
                                    context_pmdec_pin.moveTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*5000, 0.2*canvas_pmdec_pin.height/dpr);
                                    context_pmdec_pin.lineTo(0.05*canvas_pmdec_pin.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_pin.width/dpr+speed*5000, 0.8*canvas_pmdec_pin.height/dpr);
                                    context_pmdec_pin.closePath();
                                    context_pmdec_pin.stroke();
                                }
                            }

                            // Make sub4box for pmdec scale
                            const sub4box_pmdec_scale = document.createElement('div');
                            sub4box_pmdec_scale.style.width = '100%';
                            sub4box_pmdec_scale.style.height = '60%';
                            sub4box_pmdec_scale.style.position = 'relative';
                            sub4box_pmdec_scale.style.top = '0%';
                            sub4box_pmdec_scale.style.left = '0%';
                            sub3box_pmdec.appendChild(sub4box_pmdec_scale);

                            // Make canvas for pmdec scale
                            const canvas_pmdec_scale = document.createElement('canvas');
                            canvas_pmdec_scale.style.width = '100%';
                            canvas_pmdec_scale.style.height = '100%';
                            canvas_pmdec_scale.style.position = 'relative';
                            canvas_pmdec_scale.style.top = '0%';
                            canvas_pmdec_scale.style.left = '0%';
                            sub4box_pmdec_scale.appendChild(canvas_pmdec_scale);

                            // Get bounding rectangle
                            const rect_pmdec_scale = sub4box_pmdec_scale.getBoundingClientRect();

                            canvas_pmdec_scale.width = rect_pmdec_scale.width*dpr;
                            canvas_pmdec_scale.height = rect_pmdec_scale.height*dpr;

                            const context_pmdec_scale = canvas_pmdec_scale.getContext('2d');
                            context_pmdec_scale.scale(dpr, dpr);

                            // Histogram bounds
                            const boundMin = 0.99*PMDecs[0];
                            const boundMax = 1.01*PMDecs[PMDecs.length-1];

                            // Bin
                            const binNum = 64;
                            const binSize = (boundMax-boundMin)/binNum;

                            // Group
                            let counts = [];
                            for (let i=0; i<binNum; i++) {
                                const count = PMDecs.filter(pmdec => pmdec > boundMin+i*binSize && pmdec <= boundMin+(i+1)*binSize).length;
                                counts.push(count);
                            }

                            // Draw
                            const cmax = Math.max(...counts);
                            const cmin = Math.min(...counts);
                            for (let i=0; i<counts.length; i++) {
                                const red = 200 - (0-200) * cmin/(cmax-cmin) + (0-200)/(cmax-cmin) * counts[i];
                                const green = 220 - (0-220) * cmin/(cmax-cmin) + (0-220)/(cmax-cmin) * counts[i];
                                const blue = 255 - (0-255) * cmin/(cmax-cmin) + (0-255)/(cmax-cmin) * counts[i];
                                context_pmdec_scale.fillStyle = `rgb(${Math.floor(red)}, ${Math.floor(green)}, ${Math.floor(blue)})`;
                                context_pmdec_scale.fillRect(0.05*canvas_pmdec_scale.width/dpr+i*0.9*canvas_pmdec_scale.width/dpr/binNum, 0, (0.9*canvas_pmdec_scale.width/dpr - 4*0.9*canvas_pmdec_scale.width/dpr/binNum)/binNum, 0.5*canvas_pmdec_scale.height/dpr);
                            }

                            // Label
                            context_pmdec_scale.font = '1.4vmin system-ui';
                            context_pmdec_scale.fillStyle = 'black';
                            for (let i=0; i<11; i++) {
                                const pmdec = -150+i*50;
                                let label;
                                if (pmdec<0) {
                                    label = `\u2212${Math.abs(pmdec)}`;
                                } else if (pmdec>0) {
                                    label = `+${pmdec}`;
                                } else {
                                    label = '0';
                                }
                                context_pmdec_scale.fillText(label, 0.05*canvas_pmdec_scale.width/dpr+Math.abs(PMDecs[0])/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_scale.width/dpr+pmdec/(Math.abs(PMDecs[0])+PMDecs[PMDecs.length-1])*0.9*canvas_pmdec_scale.width/dpr, 0.8*canvas_pmdec_scale.height/dpr);
                            }
                        }
                    }
                }
            }
        }
    }
}

// Touch events for navigation bar on mobile
// Toggle about
let shownAbout = false;

document.querySelector('#head').addEventListener('touchstart', (event) => {
    event.preventDefault();

    const item = document.getElementById('head');
    const about = document.getElementById('about');

    if (!shownAbout) {
        shownAbout = true;

        item.style.fontWeight = '500';

        about.style.display = 'block';
        about.style.backgroundColor = 'rgba(215,210,170,0.9)';
        about.style.color = 'black';
        about.style.fontWeight = '300';
        about.style.fontSize = '1.5vmin';
        about.style.paddingTop = '1%';
        about.style.paddingBottom = '1%';
        about.style.paddingLeft = '1%';
        about.style.paddingRight = '1%'
    } else {
        shownAbout = false;
        item.style.fontWeight = '400';
        about.style.display = 'none';
    }
});

document.querySelector('#head').addEventListener('touchend', (event) => {
    event.preventDefault();
});

// Toggle note
let shownNote = false;

document.querySelector('#item-note').addEventListener('touchstart', (event) => {
    event.preventDefault();

    const item = document.getElementById('item-note');
    const note = document.getElementById('note');

    if (!shownNote) {
        shownNote = true;

        item.style.color = '#007aff';

        note.style.display = 'block';
        note.style.backgroundColor = 'rgba(215,210,170,0.9)';
        note.style.color = 'black';
        note.style.fontWeight = '300';
        note.style.fontSize = '1.5vmin';
        note.style.paddingTop = '1%';
        note.style.paddingBottom = '1%';
        note.style.paddingLeft = '1%';
        note.style.paddingRight = '1%'
    } else {
        shownNote = false;
        item.style.color = 'black';
        note.style.display = 'none';
    }
});

document.querySelector('#item-note').addEventListener('touchend', (event) => {
    event.preventDefault();
});

// Toggle reference
let shownRef = false;

document.querySelector('#item-ref').addEventListener('touchstart', (event) => {
    event.preventDefault();

    const item = document.getElementById('item-ref');
    const ref = document.getElementById('ref');

    if (!shownRef) {
        shownRef = true;
        
        item.style.color = '#007aff';

        ref.style.display = 'block';
        ref.style.backgroundColor = 'rgba(215,210,170,0.9)';
        ref.style.color = 'black';
        ref.style.fontWeight = '300';
        ref.style.fontSize = '1.5vmin';
        ref.style.paddingTop = '1%';
        ref.style.paddingBottom = '1%';
        ref.style.paddingLeft = '1%';
        ref.style.paddingRight = '1%'
    } else {
        shownRef = false;
        item.style.color = 'black';
        ref.style.display = 'none';
    }
});

document.querySelector('#item-ref').addEventListener('touchend', (event) => {
    event.preventDefault();
});

// Search button click event
document.getElementById('button').addEventListener('click', (event) => {
    event.preventDefault();

    // Retrieve search input
    const input = document.getElementById('search');
    let jname = 'J' + input.value.substring(1, input.value.length);

    // Take care of the double pulsar
    if (jname === 'J0737-3039' || jname === 'J0737-3039B') {
        jname = 'J0737-3039A';
    }

    // Assign result
    result = coords.filter(coord => coord[6] === jname)[0];

    if (typeof result !== 'undefined') {
        // If canvas is supported,
        if (hasCanvas) {
            // then plot highlight,
            plotHighlight();

            // and resent pulsar
            presentPulsar();
        } else {
            // If canvas is unsupported, then list pulsar parameters
            // Find raj string
            let rajStr;
            if (!Number.isNaN(result[0])) {
                const rajDeg = result[0]*180/Math.PI;

                const hour = Math.trunc(rajDeg/360*24);
                let hourStr;
                if (hour < 10) {
                    hourStr = `0${hour}`;
                } else {
                    hourStr = `${hour}`;
                }

                const minute = Math.trunc((rajDeg/360*24 - hour)*60);
                let minuteStr;
                if (minute < 10) {
                    minuteStr = `0${minute}`;
                } else {
                    minuteStr = `${minute}`
                }

                const second = (((rajDeg/360*24 - hour)*60 - minute)*60).toFixed(1);
                let secondStr;
                if (second < 10) {
                    secondStr = `0${second}`;
                } else {
                    secondStr = `${second}`;
                }
            
                rajStr = hourStr + ':' + minuteStr + ':' + secondStr;
            } else {
                rajStr = 'na';
            }

            // Find decj string
            let decjStr;
            if (!Number.isNaN(result[1])) {
                const decjDeg = Math.asin(result[1])*180/Math.PI;

                const degree = Math.trunc(decjDeg);
                let degreeStr;
                if (degree > 0) {
                    if (degree < 10) {
                        degreeStr = `+0${degree}`;
                    } else {
                        degreeStr = `+${degree}`;
                    }
                } else if (degree < 0) {
                    if (degree > -10) {
                        degreeStr = `\u22120${Math.abs(degree)}`;
                    } else {
                        degreeStr = `\u2212${Math.abs(degree)}`;
                    }
                } else {
                    degreeStr = '00';
                }

                const minute = Math.trunc((decjDeg - degree)*60);
                let minuteStr;
                if (minute !== 0) {
                    minuteStr = `${Math.abs(minute)}`;
                } else {
                    minuteStr = '00';
                }

                const second = (((decjDeg - degree)*60 - minute)*60).toFixed(1);
                let secondStr;
                if (secondStr !== 0) {
                    secondStr = `${Math.abs(second)}`;
                } else {
                    secondStr = '00';
                }

                decjStr = degreeStr + ':' + minuteStr + ':' + secondStr;
            } else {
                decjStr = 'na';
            }

            // Find dm string
            let dmStr;
            if (!Number.isNaN(result[2])) {
                dmStr = `${result[2].toFixed(2)}`;
            } else {
                dmStr = 'na';
            }

            // Find p0 string
            let p0Str;
            if (!Number.isNaN(result[3])) {
                p0Str = `${result[3]}`;
            } else {
                p0Str = 'na';
            }

            // Find pmra string
            let pmraStr;
            if (!Number.isNaN(result[4])) {
                if (result[4] > 0) {
                    pmraStr = `+${result[4].toFixed(2)}`;
                } else if (result[4] < 0) {
                    pmraStr = `\u2212${Math.abs(result[4].toFixed(2))}`;
                } else {
                    pmraStr = '0';
                }
            } else {
                pmraStr = 'na';
            }

            // Find pmdec string
            let pmdecStr;
            if (!Number.isNaN(result[5])) {
                if (result[5] > 0) {
                    pmdecStr = `+${result[5].toFixed(2)}`;
                } else if (result[5] < 0) {
                    pmdecStr = `\u2212${Math.abs(result[5].toFixed(2))}`;
                } else {
                    pmdecStr = '0';
                }
            } else {
                pmdecStr = 'na';
            }

            // Retrieve box div
            const box = document.getElementById('box');

            // Make p
            const para = document.createElement('p');
            para.innerHTML = `PSR ${result[6]} &ensp; R.A. (h:m:s): ${rajStr} &ensp; Dec. (d:m:s): ${decjStr} &ensp; DM (cm^-3 pc): ${dmStr} &ensp; Period (s): ${p0Str} &ensp; Proper Motion in R.A. (mas yr^-1): ${pmraStr} &ensp; Proper Motion in Dec. (mas yr^-1): ${pmdecStr}`;
            para.style.fontFamily = 'system-ui';
            para.style.fontSize = '1.5vmin';

            box.appendChild(para);
        }
    }
});

// Window close event
window.addEventListener('beforeunload', (event) => {
    // Close db
    db.close();
});
