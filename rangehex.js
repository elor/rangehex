var x0 = 350; // Nullpunkt fuers Zeichnen
var y0 = 350; // Nullpunkt fuers Zeichnen
var printscale = 10;  // Gitterparameter (Abstand benachbarter Punkte in arb.u.)
var latticescale = 4; // lattice to meters
var yoffset = Math.sin(Math.PI/3);

// Ein einziges Monster.
function Monster(x, y) {
    this.px = getPX(x, y); // X-Position im Raum
    this.py = getPY(x, y); // Y-Position im Raum
    this.x = x; // x-Position im gitter
    this.y = y; // y-position im gitter
    this.r = getR(this.px, this.py);
    this.prob = 1.0;// Aufenthaltswahrscheinlichkeit, bestimmt durch Monsterzahl
}

// Monster Zeichnen.
Monster.prototype.print = function(maxrange, sigma) {
    // Spell-Hit-Wahrscheinlichkeit fuer das Monster
    var hitProb = getSpellProb(this.r, maxrange, sigma);
    // Gesamtwahrscheinlichkeit = this.prob + hitProb

    // Ab hier: Plotting.
    var color = prob2Color(this.prob * hitProb);
    if (color == '#ffffff') return;
    var px = this.px * printscale + x0;
    var py = this.py * printscale + y0;
    var $div = $('<div></div>');
    $div.css('left', px);
    $div.css('top', py);
    $div.css('background-color', color);
    $('body').prepend($div);
}

function getPX(x, y) {
    return x * latticescale + Math.abs(y%2) * latticescale * 0.5;
}

function getPY(x, y) {
    return y * latticescale * yoffset;
}

function getR(px, py){
    // round to 5 digits for floating point comparison (equal radius)
    return Math.round(Math.sqrt(px*px + py*py)*1e5)*1e-5;
}

// hitProb eines Monsters auf einer Position, mit cutoff range.
// cutoff range ist hier Unschaerfe der Monsterposition
function getSpellProb(r, rcut, cutrange) {
    var rcmin = rcut - cutrange/2;
    var rd = r - rcmin;
    var p = (cutrange - rd) / cutrange;
    p = Math.max(0.0, p);
    p = Math.min(1.0, p);
    return p;
}

// hitProb eines secondary spells bei [x0, y0] berechnen.
function getSecondarySpellProb(monster, x0, y0, rcut, cutrange){
    var px = monster.px - x0;
    var py = monster.py - y0;
    var r = getR(px, py);
    return getSpellProb(r, rcut, cutrange);
}

// 0.0 bis 1.0  -->  #ffffff bis #000000
function prob2Color(prob){
    var p = Math.round((1-prob)*255);
    var grey = p.toString(16);
    if (grey.length == 1) grey='0'+grey;
    return '#'+grey+grey+grey;
}

// binary search and insert with equality shortcuts
// Note to user: ignore "length" argument.
function queueInsert(queue, monster) {
    var low = 0;
    var high = queue.length;
    var mid = 0;
    var diff;
    
    while (low < high) {
	mid = Math.floor((low+high)/2);
	diff = monster.r - queue[mid].r;
	if (diff < 0.0) {
	    high = mid;
	} else if (diff > 0.0) {
	    low = mid+1;
	} else {
	    // direct insertion
	    low = mid;
	    break;
	}
    }

    queue.splice(low, 0, monster);

    return queue;
}

function enqueueNeighbors(queue, x, y) {
    // all new rows are started from x==0 and move outwards
    if (x == 0) {
	// start row below
	if (y <= 0) {
	    queueInsert(queue, new Monster(0, y-1));
	    if (y%2 == 0) {
		// even row
		queueInsert(queue, new Monster(-1, y-1));
	    }
	}

	// start row above
	if (y >= 0) {
	    queueInsert(queue, new Monster(0, y+1));
	    if (y%2 == 0) {
		// even row
		queueInsert(queue, new Monster(-1, y+1));
	    }
	}
    }

    // add new cols (== x neighbors)
    if (x < 0) {
	queueInsert(queue, new Monster(x-1, y));
    }
    if (x >= 0) {
	queueInsert(queue, new Monster(x+1, y));
    }
    if (x == 0 && y%2 == 0){
	// damned hex fields
	queueInsert(queue, new Monster(x-1, y));
    }
}

// count the multiplicity of the first radius
// queue is guaranteed to be non-empty
function queueMultiplicity(queue) {
    var firstradius = queue[0].r;
    var i = 1;
    while (i < queue.length && queue[i].r === firstradius) {
	i += 1;
    }
    return i;
}

// Kreis von Monstern erstellen
// performs graph-based queued insertion until numMonsters is reached,
// and applies the weights. No need for cropping
function createMonsters(numMonsters) {
    var monsters = [];
    var monstersleft = numMonsters;
    var queue = [new Monster(0, 0)];
    var multiplicity;
    var prob;
    var monster;

    while (monstersleft > 0) {
	multiplicity = queueMultiplicity(queue);
	prob = Math.min(1.0, monstersleft/multiplicity);
	monstersleft -= multiplicity;
	while (multiplicity > 0) {
	    monster = queue.shift();
	    monster.prob = prob;
	    enqueueNeighbors(queue, monster.x, monster.y);
	    monsters.push(monster);
	    multiplicity -= 1;
	}
    }

    return monsters;
}

// alle Monster neu zeichnen
function printMonsters(monsters, maxrange, sigma){
    var i;
    clearMonsters();
    for (i = 0; i < monsters.length; i += 1){
	monsters[i].print(maxrange, sigma);
    }
}

// Monster-divs entfernen
function clearMonsters(){
    $('body > div').remove();
}

// rc = cutoff radius = spellrange + sigma!
function cropMonstersByRadius(monsters, rc) {
    // the monster array is supposed to be sorted!
    // just remove the last elements (pop) until we're in range.
    while (monsters[monsters.length-1].r > rc) {
	monsters.pop();
    }

    // convenience return
    return monsters;
}

// Werte lesen, array neu berechnen, alles neu zeichnen
function update(){
    var spellrange = Number($('input.spellrange').val());
    $('span.spellrange').text(spellrange);
    var numMonsters = Number($('input.nummonsters').val());
    $('span.nummonsters').text(numMonsters);
    var sigma = Number($('input.sigma').val());
    $('span.sigma').text(sigma);

    // actual application!
    var monsters = createMonsters(numMonsters);
    cropMonstersByRadius(monsters, spellrange + sigma);
    printMonsters(monsters, spellrange, sigma);
}

// input-update-zeug
$(function($){
    $('input').change(update);
    $('input.nummonsters').focus();
    update();
});
