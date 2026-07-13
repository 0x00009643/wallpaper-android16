'use strict';

// --- Bag (no-replace random picker) ---
function Bag(items) {
    this._items = items.slice();
    this._remaining = items.slice();
    this._next = this._remaining.length;
}

Bag.prototype.pull = function(rng) {
    if (this._next >= this._remaining.length) {
        rng.shuffle(this._remaining);
        this._next = 0;
    }
    return this._remaining[this._next++];
};

// --- RandomTable (weighted loot table) ---
function RandomTable() {
    this.pairs = [];
    this.total = 0;
    for (var i = 0; i < arguments.length; i++) {
        this.pairs.push(arguments[i]);
        this.total += arguments[i][0];
    }
}

RandomTable.prototype.roll = function(rng) {
    var x = rng.nextFloatInRange(0, this.total);
    for (var i = 0; i < this.pairs.length; i++) {
        x -= this.pairs[i][0];
        if (x < 0) return this.pairs[i][1];
    }
    return this.pairs[this.pairs.length - 1][1];
};

// --- Word Tables (from landroid_strings.xml) ---
var PLANET_DESCRIPTORS = [
    'earthy','swamp','frozen','grassy','arid','crowded','ancient','lively',
    'homey','modern','boring','compact','expensive','polluted','rusty','sandy',
    'undulating','verdant','tessellated','hollow','scalding','hemispherical',
    'oblong','oblate','vacuum','high-pressure','low-pressure','plastic',
    'metallic','burned-out','bucolic'
];

var LIFE_DESCRIPTORS = [
    'aggressive','passive-aggressive','shy','timid','nasty','brutish','short',
    'absent','teen-aged','confused','transparent','cubic','quadratic',
    'higher-order','huge','tall','wary','loud','yodeling','purring','slender',
    'cats','adorable','eclectic','electric','microscopic','trunkless','myriad',
    'cantankerous','gargantuan','contagious','fungal','cattywampus','spatchcocked',
    'rotisserie','farm-to-table','organic','synthetic','unfocused','focused',
    'capitalist','communal','bossy','malicious','compliant','psychic','oblivious',
    'passive','bonsai'
];

var ANY_DESCRIPTORS = [
    'silly','dangerous','vast','invisible','superfluous','superconducting',
    'superior','alien','phantom','friendly','peaceful','lonely','uncomfortable',
    'charming','fractal','imaginary','forgotten','tardy','gassy','fungible',
    'bespoke','artisanal','exceptional','puffy','rusty','fresh','crusty','glossy',
    'lovely','processed','macabre','reticulated','shocking','void','undefined',
    'gothic','beige','mid','milquetoast','melancholy','unnerving','cheery',
    'vibrant','heliotrope','psychedelic','nondescript','indescribable','tubular',
    'toroidal','voxellated','low-poly','low-carb','100% cotton','synthetic',
    'boot-cut','bell-bottom','bumpy','fluffy','sous-vide','tepid','upcycled',
    'sous-vide','bedazzled','ancient','inexplicable','sparkling','still',
    'lemon-scented','eccentric','tilted','pungent','pine-scented','corduroy',
    'overengineered','bioengineered','impossible'
];

var PLANET_TYPES = [
    'planet','planetoid','moon','moonlet','centaur','asteroid','space garbage',
    'detritus','satellite','core','giant','body','slab','rock','husk','planemo',
    'object','planetesimal','exoplanet','ploonet'
];

var CONSTELLATIONS = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio',
    'Sagittarius','Capricorn','Aquarius','Pisces','Andromeda','Cygnus','Draco',
    'Alcor','Calamari','Cuckoo','Neko','Monoceros','Norma','Abnorma','Morel',
    'Redlands','Cupcake','Donut','Eclair','Froyo','Gingerbread','Honeycomb',
    'Icecreamsandwich','Jellybean','Kitkat','Lollipop','Marshmallow','Nougat',
    'Oreo','Pie','Quincetart','Redvelvetcake','Snowcone','Tiramisu',
    'Upsidedowncake','Vanillaicecream','Android','Binder','Campanile','Dread'
];

var CONSTELLATIONS_RARE = [
    'Jandycane','Zombiegingerbread','Astro','Bender','Flan','Untitled-1',
    'Expedit','Petit Four','Worcester','Xylophone','Yellowpeep','Zebraball',
    'Hutton','Klang','Frogblast','Exo','Keylimepie','Nat','Nrp'
];

var STAR_SUFFIXES = [
    'Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota',
    'Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau',
    'Upsilon','Phi','Chi','Psi','Omega','Prime','Secundo','Major','Minor',
    'Diminished','Augmented','Ultima','Penultima','Mid','Proxima','Novis','Plus'
];

var STAR_SUFFIXES_RARE = [
    'Serif','Sans','Oblique','Grotesque','Handtooled','III "Trey"','Alfredo',
    '2.0','(Final)','(Final (Final))','(Draft)','Con Carne'
];

var ATMOSPHERE_DESCRIPTORS = [
    'toxic','breathable','radioactive','clear','calm','peaceful','vacuum',
    'stormy','freezing','burning','humid','tropical','cloudy','obscured','damp',
    'dank','clammy','frozen','contaminated','temperate','moist','minty','relaxed',
    'skunky','breezy','soup'
];

var FLORA_GENERIC_PLURALS = ['flora','plants','flowers','trees','mosses','specimens','life','cells'];
var FAUNA_GENERIC_PLURALS = ['fauna','animals','locals','creatures','critters','wildlife','specimens','life','cells'];
var ATMO_GENERIC_PLURALS = ['air','atmosphere','clouds','atmo','gases'];

var ACTIVITIES = [
    'refueling','sightseeing','vacationing','luncheoning','recharging',
    'taking up space','reticulating space splines','using facilities','spelunking',
    'repairing','herding {fauna}','taming {fauna}','breeding {fauna}',
    'singing lullabies to {fauna}','singing lullabies to {flora}',
    'singing lullabies to the {planet}','gardening {flora}','collecting {flora}',
    'surveying the {planet}','mapping the {planet}','breathing {atmo}',
    'reprocessing {atmo}','bottling {atmo}'
];

var SUFFIX_PROB = 0.75;
var LETTER_PROB = 0.3;
var NUMBER_PROB = 0.3;
var RARE_PROB = 0.05;

// --- Namer ---
function Namer() {
    this._planetDescriptors = new Bag(PLANET_DESCRIPTORS);
    this._lifeDescriptors = new Bag(LIFE_DESCRIPTORS);
    this._anyDescriptors = new Bag(ANY_DESCRIPTORS);
    this._atmoDescriptors = new Bag(ATMOSPHERE_DESCRIPTORS);
    this._planetTypes = new Bag(PLANET_TYPES);
    this._constellations = new Bag(CONSTELLATIONS);
    this._constellationsRare = new Bag(CONSTELLATIONS_RARE);
    this._suffixes = new Bag(STAR_SUFFIXES);
    this._suffixesRare = new Bag(STAR_SUFFIXES_RARE);
    this._activities = new Bag(ACTIVITIES);
    this._floraPlurals = new Bag(FLORA_GENERIC_PLURALS);
    this._faunaPlurals = new Bag(FAUNA_GENERIC_PLURALS);
    this._atmoPlurals = new Bag(ATMO_GENERIC_PLURALS);

    this._planetTable = new RandomTable([0.75, this._planetDescriptors], [0.25, this._anyDescriptors]);
    this._lifeTable = new RandomTable([0.75, this._lifeDescriptors], [0.25, this._anyDescriptors]);
    this._constellationsTable = new RandomTable([RARE_PROB, this._constellationsRare], [1 - RARE_PROB, this._constellations]);
    this._suffixesTable = new RandomTable([RARE_PROB, this._suffixesRare], [1 - RARE_PROB, this._suffixes]);
    this._atmoTable = new RandomTable([0.75, this._atmoDescriptors], [0.25, this._anyDescriptors]);
    this._delimiterTable = new RandomTable(
        [15, ' '], [3, '-'], [1, '_'], [1, '/'], [1, '.'],
        [1, '*'], [1, '^'], [1, '#'], [0.1, '(^*!%@##!!']
    );
}

Namer.prototype.describePlanet = function(rng) {
    return this._planetTable.roll(rng).pull(rng) + ' ' + this._planetTypes.pull(rng);
};

Namer.prototype.describeLife = function(rng) {
    return this._lifeTable.roll(rng).pull(rng);
};

Namer.prototype.describeAtmo = function(rng) {
    return this._atmoTable.roll(rng).pull(rng);
};

Namer.prototype.nameSystem = function(rng) {
    var parts = this._constellationsTable.roll(rng).pull(rng);
    if (rng.nextFloat() <= SUFFIX_PROB) {
        parts += this._delimiterTable.roll(rng);
        parts += this._suffixesTable.roll(rng).pull(rng);
        if (rng.nextFloat() <= RARE_PROB) {
            parts += ' ' + this._suffixesRare.pull(rng);
        }
    }
    if (rng.nextFloat() <= LETTER_PROB) {
        parts += this._delimiterTable.roll(rng);
        parts += String.fromCharCode(65 + rng.nextInt(0, 26));
        if (rng.nextFloat() <= RARE_PROB) {
            parts += this._delimiterTable.roll(rng);
        }
    }
    if (rng.nextFloat() <= NUMBER_PROB) {
        parts += this._delimiterTable.roll(rng);
        parts += rng.nextInt(2, 5039);
    }
    return parts;
};

Namer.prototype.describeActivity = function(rng, target) {
    var template = this._activities.pull(rng);
    return template.replace(/\{(flora|fauna|planet|atmo)\}/g, function(match, key) {
        switch (key) {
            case 'flora': return (target ? target.flora : 'SOME') + ' ' + this._floraPlurals.pull(rng);
            case 'fauna': return (target ? target.fauna : 'SOME') + ' ' + this._faunaPlurals.pull(rng);
            case 'atmo': return (target ? target.atmosphere : 'SOME') + ' ' + this._atmoPlurals.pull(rng);
            case 'planet': return target ? target.description : 'SOME BODY';
            default: return match;
        }
    }.bind(this));
};
