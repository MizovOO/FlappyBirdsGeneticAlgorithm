let gameSpeed = -200;
const gameWidth = 1280;
const gameHeight = 720;
let loggerElement;
let loggerTable;
let logDownload;
let currentExperimentPlan;
let experiment = {
    exist: false,
    stage: 0,
    iteration: 0,
    name: '[UNDEFINED]',
    data: null,
    targetScore: 15
};
window.onload = function () {
    var game = new Phaser.Game(gameWidth, gameHeight, Phaser.CANVAS, 'game');

    game.state.add('Main', App.Main);
    game.state.start('Main');
    setTimeout(() => {
        const node = document.createElement("DIV");
        node.id = "log"
        document.body.appendChild(node);
        loggerElement = document.querySelector("#log");
        loggerTable = document.querySelector("#table-for-download");
        logDownload = document.querySelector("a");
    })
};

function log(message) {
    const node = document.createElement("P");
    node.appendChild(document.createTextNode(message));
    if (loggerElement) {
        loggerElement.appendChild(node);
    }
}
function tableLogger(message) {
    if (loggerTable) {
        loggerTable.innerHTML += message;
    }

}

var App = {};

App.Main = function (game) {
    this.STATE_INIT = 1;
    this.STATE_START = 2;
    this.STATE_PLAY = 3;
    this.STATE_GAMEOVER = 4;
    this.STATE_EXPERIMENT = 5;

    this.BARRIER_DISTANCE = 300;
}

App.Main.prototype = {
    preload: function () {

        this.game.load.spritesheet('imgBird', 'assets/img_bird_new_big.png', 36, 36, 40);
        this.game.load.spritesheet('imgTree', 'assets/img_tree_origin.png', 90, 400, 2);
        this.game.load.spritesheet('imgButtons', 'assets/img_buttons.png', 110, 40, 6);

        this.game.load.image('imgTarget', 'assets/img_target.png');
        this.game.load.image('imgGround', 'assets/img_ground_origin.png');
        this.game.load.image('imgPause', 'assets/img_pause.png');
        this.game.load.image('imgFinished', 'assets/img_finished.png');
        this.game.load.image('imgLogo', 'assets/img_logo.png');

        this.load.bitmapFont('fnt_chars_black', 'assets/fnt_chars_black.png', 'assets/fnt_chars_black.fnt');
        this.load.bitmapFont('fnt_digits_blue', 'assets/fnt_digits_blue.png', 'assets/fnt_digits_blue.fnt');
        this.load.bitmapFont('fnt_digits_green', 'assets/fnt_digits_green.png', 'assets/fnt_digits_green.fnt');
        this.load.bitmapFont('fnt_digits_red', 'assets/fnt_digits_red.png', 'assets/fnt_digits_red.fnt');
    },

    create: function () {
        this.killAllBirds = false;
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignVertically = true;
        this.scale.pageAlignHorizontally = true;
        this.game.stage.backgroundColor = "#89bfdc";
        this.game.stage.disableVisibilityChange = true;
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        this.game.physics.arcade.gravity.y = 1300;
        this.GA = new GeneticAlgorithm(20, 4);
        this.BirdGroup = this.game.add.group();
        for (var i = 0; i < this.GA.max_units; i++) {
            this.BirdGroup.add(new Bird(this.game, 0, 0, i));
        }
        this.BarrierGroup = this.game.add.group();
        for (var i = 0; i < 5; i++) {
            new TreeGroup(this.game, this.BarrierGroup, i);
        }

        this.TargetPoint = this.game.add.sprite(0, 0, 'imgTarget');
        this.TargetPoint.anchor.setTo(0);

        this.Ground = this.game.add.tileSprite(0, this.game.height - 100, this.game.width - 0, 100, 'imgGround');
        this.Ground.autoScroll(gameSpeed, 0);

        this.statusExperimentText= new Text(this.game, 600, 10, "", "right", "fnt_chars_black");
        this.statusScore= new Text(this.game, 600, 30, "", "right", "fnt_chars_black");

        this.btnRestart = this.game.add.button(320, 650, 'imgButtons', this.onRestartClick, this, 0, 0);
        this.btnMore = this.game.add.button(440, 650, 'imgButtons', this.killAll, this, 2, 2);
        this.btnPause = this.game.add.button(560, 650, 'imgButtons', this.onPauseClick, this, 1, 1);
        this.btnExperiment = this.game.add.button(780, 650, 'imgButtons', this.onExperimentClick, this, 3, 3);
        this.btnInit = this.game.add.button(900, 650, 'imgButtons', this.onRestartClick, this, 4, 4);
        this.btnDownload = this.game.add.button(1020, 650, 'imgButtons', this.onDownloadClick, this, 5, 5);

        this.sprPause = this.game.add.sprite(655, 360, 'imgPause');
        this.sprPause.anchor.setTo(0.5);
        this.sprPause.kill();
        this.sprFinished = this.game.add.sprite(655, 360, 'imgFinished');
        this.sprFinished.anchor.setTo(0.5);
        this.sprFinished.kill();
        this.game.input.onDown.add(this.onResumeClick, this);

        this.state = this.STATE_INIT;
    },

    onDownloadClick: () => {
        logDownload.click();
    },

    parseExperimentPlan: (experimentPlan) => {
        const currentExperiment = experimentPlan.filter(experimentItem => experimentItem.iterations > 0)[0];
        if(currentExperiment === undefined){
            this.onFinished();
        } else {
            currentExperiment.iterations -= 1;
            experiment.stage = currentExperiment.stage;
            experiment.data = currentExperiment.dataSource;
            experiment.iteration = experiment.name === currentExperiment.name ? experiment.iteration + 1 : 0;
            experiment.name = currentExperiment.name;
        }
    },

    update: function () {
        switch (this.state) {
            case this.STATE_EXPERIMENT:
                const prevExperimentName = experiment.name;
                this.parseExperimentPlan(currentExperimentPlan);
                if (prevExperimentName !== experiment.name) {
                    tableLogger(`<tr><th colspan="3">Experiment ${experiment.name}</th></tr>`);
                }
                tableLogger(`
                <tr>
                    <td>Experiment ${experiment.name}</td>
                    <td>Iteration</td>
                    <td>${experiment.iteration}</td>
                </tr>
                `);
                this.statusExperimentText.text =`Experiment ${experiment.name} #${experiment.iteration}`;
                experiment.exist = true;
                this.GA.reset();
                this.GA.createPopulationFromJSON(experiment.data);
                this.state = this.STATE_START;
                break;
            case this.STATE_INIT:
                this.statusExperimentText.text =`Random population`;
                this.GA.reset();
                this.GA.createPopulationWithExperimentLayers();
                this.GA.Population.forEach(bird => console.log(JSON.stringify(bird.toJSON())));

                this.state = this.STATE_START;
                break;

            case this.STATE_START:
                this.score = 0;
                this.distance = 0;
                this.BarrierGroup.forEach(function (barrier) {
                    barrier.restart(700 + barrier.index * this.BARRIER_DISTANCE);
                }, this);

                this.firstBarrier = this.BarrierGroup.getAt(0);
                this.lastBarrier = this.BarrierGroup.getAt(this.BarrierGroup.length - 1);
                this.targetBarrier = this.firstBarrier;
                this.BirdGroup.forEach(function (bird) {
                    bird.restart(this.GA.iteration);
                }, this);

                this.state = this.STATE_PLAY;
                break;

            case this.STATE_PLAY:
                this.TargetPoint.x = this.targetBarrier.getGapX();
                this.TargetPoint.y = this.targetBarrier.getGapY();

                var isNextTarget = false;
                this.statusScore.text = `Iteration: ${this.GA.iteration} | Score: ${this.score}`; 
                this.BirdGroup.forEachAlive(function (bird) {
                    bird.fitness_curr = this.distance - this.game.physics.arcade.distanceBetween(bird, this.TargetPoint);
                    bird.score_curr = this.score;
                    this.game.physics.arcade.collide(bird, this.targetBarrier, this.onDeath, null, this);

                    if (bird.alive) {
                        if (bird.x > this.TargetPoint.x) isNextTarget = true;
                        if ((bird.y < 0 || bird.y > 610) || this.killAllBirds) {
                            this.killAllBirds = false;
                            this.onDeath(bird);
                        }
                        if (experiment.exist && bird.score_curr > experiment.targetScore) {
                            tableLogger(`
                            <tr>
                                <td>WINNER FOUND ON</td>
                                <td>${this.GA.iteration}</td>
                                <td>${bird.score_curr}</td>
                            </tr>
                            <tr>
                                <td>WINNER TOPOLOGY</td>
                                <td>"2-${this.GA.Population[bird.index].layers.hidden[0].size}-1"</td>
                            </tr>
                            `);
                            this.state = this.STATE_EXPERIMENT;
                        }
                        this.GA.activateBrain(bird, this.TargetPoint);
                    }
                }, this);

                if (isNextTarget) {
                    this.score++;
                    this.targetBarrier = this.getNextBarrier(this.targetBarrier.index);
                }

                if (this.firstBarrier.getWorldX() < -this.firstBarrier.width) {
                    this.firstBarrier.restart(this.lastBarrier.getWorldX() + this.BARRIER_DISTANCE);

                    this.firstBarrier = this.getNextBarrier(this.firstBarrier.index);
                    this.lastBarrier = this.getNextBarrier(this.lastBarrier.index);
                }

                this.distance += Math.abs(this.firstBarrier.topTree.deltaX);
                break;

            case this.STATE_GAMEOVER:

                this.GA.evolvePopulation(tableLogger, experiment.stage);
                this.GA.iteration++;

                this.state = this.STATE_START;
                break;
        }
    },

    getNextBarrier: function (index) {
        return this.BarrierGroup.getAt((index + 1) % this.BarrierGroup.length);
    },

    onDeath: function (bird) {
        this.GA.Population[bird.index].fitness = bird.fitness_curr;
        this.GA.Population[bird.index].score = bird.score_curr;

        bird.death();
        if (this.BirdGroup.countLiving() == 0) this.state = this.STATE_GAMEOVER;
    },

    onRestartClick: function () {
        this.state = this.STATE_INIT;
    },

    onExperimentClick: function () {
        currentExperimentPlan = experimentPlan;
        this.state = this.STATE_EXPERIMENT;
    },

    killAll: function () {
        this.killAllBirds = true;
    },

    onPauseClick: function () {
        this.game.paused = true;
        this.btnPause.input.reset();
        this.sprPause.revive();
    },

    onFinished: function () {
        this.game.paused = true;
        this.btnPause.input.reset();
        this.sprFinished.revive();
    },

    onResumeClick: function () {
        if (this.game.paused) {
            this.game.paused = false;
            this.btnPause.input.enabled = true;
            this.sprPause.kill();
        }
    }
}

var TreeGroup = function (game, parent, index) {
    Phaser.Group.call(this, game, parent);

    this.index = index;

    this.topTree = new Tree(this.game, 0);
    this.bottomTree = new Tree(this.game, 1);

    this.add(this.topTree);
    this.add(this.bottomTree);
};

TreeGroup.prototype = Object.create(Phaser.Group.prototype);
TreeGroup.prototype.constructor = TreeGroup;

TreeGroup.prototype.restart = function (x) {
    this.topTree.reset(0, 0);
    this.bottomTree.reset(0, this.topTree.height + 130);

    this.x = x;
    this.y = this.game.rnd.integerInRange(110 - this.topTree.height, -20);

    this.setAll('body.velocity.x', gameSpeed);
};

TreeGroup.prototype.getWorldX = function () {
    return this.topTree.world.x;
};

TreeGroup.prototype.getGapX = function () {
    return this.bottomTree.world.x + this.bottomTree.width;
};

TreeGroup.prototype.getGapY = function () {
    return this.bottomTree.world.y - 65;
};


var Tree = function (game, frame) {
    Phaser.Sprite.call(this, game, 0, 0, 'imgTree', frame);

    this.game.physics.arcade.enableBody(this);

    this.body.allowGravity = false;
    this.body.immovable = true;
};

Tree.prototype = Object.create(Phaser.Sprite.prototype);
Tree.prototype.constructor = Tree;

var Bird = function (game, x, y, index) {
    Phaser.Sprite.call(this, game, x, y, 'imgBird');

    this.index = index;
    this.anchor.setTo(0.5);
    var i = index * 2;
    this.animations.add('flap', [i, i + 1]);
    this.animations.play('flap', 8, true);
    this.game.physics.arcade.enableBody(this);
};

Bird.prototype = Object.create(Phaser.Sprite.prototype);
Bird.prototype.constructor = Bird;

Bird.prototype.restart = function (iteration) {
    this.fitness_prev = (iteration == 1) ? 0 : this.fitness_curr;
    this.fitness_curr = 0;

    this.score_prev = (iteration == 1) ? 0 : this.score_curr;
    this.score_curr = 0;

    this.alpha = 1;
    this.reset(150, 300 + this.index * 20);
};

Bird.prototype.flap = function () {
    this.body.velocity.y = -400;
};

Bird.prototype.death = function () {
    this.alpha = 0.5;
    this.kill();
};

var Text = function (game, x, y, text, align, font) {
    Phaser.BitmapText.call(this, game, x, y, font, text, 16);

    this.align = align;

    if (align == "right") this.anchor.setTo(1, 0);
    else this.anchor.setTo(0.5);

    this.game.add.existing(this);
};

Text.prototype = Object.create(Phaser.BitmapText.prototype);
Text.prototype.constructor = Text;