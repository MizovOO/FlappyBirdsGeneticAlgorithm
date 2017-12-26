
var GeneticAlgorithm = function (max_units, top_units) {
	this.max_units = max_units;
	this.top_units = top_units;

	if (this.max_units < this.top_units) this.top_units = this.max_units;

	this.Population = [];

	this.SCALE_FACTOR = 200;
}

GeneticAlgorithm.prototype = {
	reset: function () {
		this.iteration = 1;	
		this.mutateRate = 1; 
		this.best_population = 0; 
		this.best_fitness = 0;  
		this.best_score = 0;	
	},

	createPopulation: function () {
		this.Population.splice(0, this.Population.length);

		let hiddenLayer = 6;
		for (var i = 0; i < this.max_units; i++) {

			var newUnit = new synaptic.Architect.Perceptron(2, hiddenLayer, 1);
			newUnit.index = i;
			newUnit.fitness = 0;
			newUnit.score = 0;
			newUnit.isWinner = false;

			this.Population.push(newUnit);
		}
	},

	createPopulationWithExperimentLayers: function () {
		this.Population.splice(0, this.Population.length);
		const hiddenLayersPerSize = 4;
		let hiddenLayer = 2;
		for (var i = 0; i < this.max_units; i++) {
			if (i % hiddenLayersPerSize === 0) {
				hiddenLayer += 2;
			}

			var newUnit = new synaptic.Architect.Perceptron(2, hiddenLayer, 1);

			newUnit.index = i;
			newUnit.fitness = 0;
			newUnit.score = 0;
			newUnit.isWinner = false;

			this.Population.push(newUnit);
		}
	},
	
	createPopulationFromJSON: function (savedPopulation) {
		const populationJSON = JSON.parse(savedPopulation);
		this.Population.splice(0, this.Population.length);
		for (var i = 0; i < this.max_units; i++) {
			var newUnit = synaptic.Network.fromJSON(populationJSON[i]);
			newUnit.index = i;
			newUnit.fitness = 0;
			newUnit.score = 0;
			newUnit.isWinner = false;
			this.Population[i] = newUnit;
		}
	},

	activateBrain: function (bird, target) {
		var targetDeltaX = this.normalize(target.x, 700) * this.SCALE_FACTOR;
		var targetDeltaY = this.normalize(bird.y - target.y, 800) * this.SCALE_FACTOR;

		var inputs = [targetDeltaX, targetDeltaY];

		var outputs = this.Population[bird.index].activate(inputs);

		if (outputs[0] > 0.5) bird.flap();
	},

	evolvePopulation: function (logger = console.log, experimentStage = 0) {
		var Winners = this.selection();

		if (this.mutateRate == 1 && Winners[0].fitness < 0) {
			this.createPopulation();
		} else {
			this.mutateRate = 0.2;
		}

		for (var i = this.top_units; i < this.max_units; i++) {
			var parentA, parentB, offspring;

			if (i == this.top_units) {s
				parentA = Winners[0];
				parentB = Winners[1];
				offspring = this.crossOver(Winners[0], Winners[1], logger, experimentStage);

			} else if (i < this.max_units - 2) {
				parentA = this.getRandomUnit(Winners);
				parentB = this.getRandomUnit(Winners);
				offspring = this.crossOver(parentA, parentB, logger, experimentStage);

			} else {
				offspring = this.getRandomUnit(Winners).toJSON();
			}

			offspring = this.mutation(offspring);

			var newUnit = synaptic.Network.fromJSON(offspring);
			newUnit.index = this.Population[i].index;
			newUnit.fitness = 0;
			newUnit.score = 0;
			newUnit.isWinner = false;

			this.Population[i] = newUnit;
		}

		if (Winners[0].fitness > this.best_fitness) {
			this.best_population = this.iteration;
			this.best_fitness = Winners[0].fitness;
			this.best_score = Winners[0].score;
		}
		tableLogger(`
		<tr>
			<td>ITERATION</td>
			<td>${this.iteration}</td>
			<td>${Winners[0].score}</td>
		</tr>
		`);

		this.Population.sort(function (unitA, unitB) {
			return unitA.index - unitB.index;
		});
	},

	selection: function () {
		var sortedPopulation = this.Population.sort(
			function (unitA, unitB) {
				return unitB.fitness - unitA.fitness;
			}
		);
		for (var i = 0; i < this.top_units; i++) this.Population[i].isWinner = true;
		return sortedPopulation.slice(0, this.top_units);
	},

	crossOver: function (winnerA, winnerB, logger, experimentStage) {
		const parentA = winnerA.toJSON();
		const parentB = winnerB.toJSON();
		if (parentA.neurons.length !== parentB.neurons.length) {

			const offspring = winnerA.fitness > winnerB.fitness ?
				parentA : winnerA.fitness < winnerB.fitness ?
					parentB : this.random(0, 1) == 1 ? parentA : parentB;
			return offspring

		} else {

			var cutPoint = this.random(0, parentA.neurons.length - 1);

			if(experimentStage === 1 || experimentStage === 0){
				for (var i = cutPoint; i < parentA.neurons.length; i++) {
					var biasFromParentA = parentA.connections[i]['weight'];
					parentA.connections[i]['bias'] = parentB.connections[i]['weight'];
					parentB.connections[i]['bias'] = biasFromParentA;
				}
			}

			if(experimentStage === 2 || experimentStage === 0){
				for (var i = cutPoint; i < parentA.neurons.length; i++) {
					var biasFromParentA = parentA.connections[i]['weight'];
					parentA.connections[i]['weight'] = parentB.connections[i]['weight'];
					parentB.connections[i]['weight'] = biasFromParentA;
				}
			}
			return this.random(0, 1) == 1 ? parentA : parentB;
		}
	},

	mutation: function (offspring) {
		for (var i = 0; i < offspring.neurons.length; i++) {
			offspring.neurons[i]['bias'] = this.mutate(offspring.neurons[i]['bias']);
		}

		for (var i = 0; i < offspring.connections.length; i++) {
			offspring.connections[i]['weight'] = this.mutate(offspring.connections[i]['weight']);
		}

		return offspring;
	},

	mutate: function (gene) {
		if (Math.random() < this.mutateRate) {
			var mutateFactor = 1 + ((Math.random() - 0.5) * 3 + (Math.random() - 0.5));
			gene *= mutateFactor;
		}

		return gene;
	},

	random: function (min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	},

	getRandomUnit: function (array) {
		return array[this.random(0, array.length - 1)];
	},

	normalize: function (value, max) {
		if (value < -max) value = -max;
		else if (value > max) value = max;
		return (value / max);
	}
}