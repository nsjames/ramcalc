<section class="md:flex pt-20 flex items-center justify-center">
	<!-- a container for the RAM calculator box (EOSIO) -->
	<div class="max-w-xl w-full px-10 mx-auto">
		<h1 class="text-3xl font-bold mb-4">RAM Price Calculator</h1>

		<section class="flex gap-4 md:flex-row flex-col">
			<div class="flex-1">
				<label for="maxRamGb" class="mr-2">Total available RAM</label>
				<input bind:value={maxRamGb} type="number" class="w-64" />
			</div>
			<div class="flex-1 w-full">
				<label for="tokensInContract" class="mr-2">Locked up EOS</label>
				<input bind:value={tokensInContract} type="number" class="w-64" class:warning={lockedTokensAboveTotal} />
			</div>
		</section>

		<br />
		<br />

<!--		<label for="slider" class="mr-2">How much RAM is available?</label>-->
<!--		<div class="flex items-center mb-4">-->
<!--			<input bind:value={maxRamGb} id="slider" type="range" min="{consumedRam}" max={1024} step="1" class="w-64 flex-1" on:input={changedRamConsumed} />-->
<!--			<span id="sliderValue" class="ml-2 font-semibold text-right flex-1">{parseFloat(maxRamGb).toFixed(2)} GB</span>-->
<!--		</div>-->

		<label for="slider" class="mr-2">How much RAM is purchased?</label>
		<div class="flex items-center md:flex-row flex-col">
			<input bind:value={consumedRam} id="slider" type="range" min="1" max={maxRamGb} step="1" class="w-64 flex-1" on:input={changedRamConsumed} />
			<span id="sliderValue" class="ml-2 font-semibold text-lg text-right w-full md:w-[170px] mt-2 md:mt-0"><b>{parseFloat(consumedRam / maxRamGb * 100).toFixed(1)}%</b> <br class="hidden md:block" />({parseFloat(consumedRam).toFixed(2)} GB)</span>
		</div>
<!--		<button class="mt-2 ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg" on:click={() => {-->
<!--				if(consumedRam-1 < 1) return;-->
<!--				consumedRam -= 1;-->
<!--				changedRamConsumed();-->
<!--			}}>-1 GB</button>-->
<!--		<button class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg" on:click={() => {-->
<!--				if(consumedRam+1 > maxRamGb) return;-->
<!--				consumedRam += 1;-->
<!--				changedRamConsumed();-->
<!--			}}>+1 GB</button>-->

		<figure class="mt-10 text-center text-3xl font-extrabold">
			{isInfinity ? 'Infinity' : parseFloat(price * 1024).toFixed(4)} EOS per KB
		</figure>
		<figure class="mt-1 text-center text-sm mb-4">
			({isInfinity ? 'Infinity' : parseFloat(price).toFixed(8)} EOS per byte)
		</figure>

		<div class="mt-10 graph-container bg-white rounded-lg shadow-lg overflow-hidden">
			<canvas id="myChart"></canvas>
		</div>
	</div>
</section>

<script lang="ts">
	import {calculateRamPrice} from './ram';
	import {onMount} from "svelte";
	import Chart from 'chart.js/auto';

	let maxRamGb = 390.1733465194702;
	const startingTokensInContract = 0;
	let tokensInContract = startingTokensInContract;

	$: maxRamInBytes = maxRamGb * 1024 * 1024 * 1024;
	let consumedRamLastTick = 266.49784557987005;
	let consumedRam = consumedRamLastTick;
	$: outstandingSupply = maxRamInBytes - (consumedRam * 1024 * 1024 * 1024);

	let totalTokensOnNetwork = 1183040642.5363;
	$: lockedTokensAboveTotal = tokensInContract > totalTokensOnNetwork;

	onMount(async () => {
		const market = await fetch('https://eos.api.eosnation.io/v1/chain/get_table_rows', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				"json": true,
				"code": "eosio",
				"scope": "eosio",
				"table": "rammarket",
				"limit": 1
			})
		}).then(r => r.json()).then(x => x.rows[0])
		tokensInContract = parseFloat(market.quote.balance.split(' ')[0]);
		consumedRam = (maxRamInBytes - parseInt(market.base.balance.split(' ')[0])) / 1024 / 1024 / 1024;
		consumedRamLastTick = consumedRam;

		const totalTokens = await fetch('https://eos.api.eosnation.io/v1/chain/get_currency_stats', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				"code": "eosio.token",
				"symbol": "EOS"
			})
		}).then(r => r.json()).then(x => x.EOS.supply.split(' ')[0]);
		totalTokensOnNetwork = parseFloat(totalTokens);
	})

	let isInfinity = false;
	$: price = (() => {
		return calculateRamPrice(maxRamInBytes - (consumedRamLastTick * 1024 * 1024 * 1024), tokensInContract, 1);
	})();


	const changedRamConsumed = () => {
		updateChart();

		let diffInGb = consumedRam - consumedRamLastTick;
		const _price = calculateRamPrice(maxRamInBytes - (consumedRam * 1024 * 1024 * 1024), tokensInContract, diffInGb * 1024 * 1024 * 1024);
		tokensInContract += _price;
		consumedRamLastTick = consumedRam;

		isInfinity = consumedRam+1 >= maxRamGb;
	};

	let myChart;

	function updateChart() {
		const ctx = document.getElementById('myChart').getContext('2d');

		const formatNumber = x => {
			// turn into K, or M, or B
			if(x < 1000) return x;
			if(x < 1000000) return `${(x / 1000).toFixed(2)}K`;
			if(x < 1000000000) return `${(x / 1000000).toFixed(2)}M`;
			return `${(x / 1000000000).toFixed(2)}B`;
		}

		if (myChart) {
			myChart.data.datasets[1].data = [consumedRam, consumedRam];
			myChart.data.datasets[0].data = [0, maxRamGb];
			myChart.data.labels = ['0 GB', `${parseFloat(maxRamGb).toFixed(2)} GB`];
			myChart.update();
			return;
		}

		myChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: ['0 GB', `${parseFloat(maxRamGb).toFixed(2)} GB`],
				datasets: [
					{
						label: 'RAM Price',
						data: [0, maxRamGb],
						backgroundColor: [
							'rgba(255, 99, 132, 0.2)',
							'rgba(255, 99, 132, 0.2)',
						],
						borderColor: [
							'rgba(255, 99, 132, 1)',
							'rgba(255, 99, 132, 1)',
						],
						borderWidth: 1
					}, {
						label: 'Currently Consumed RAM',
						data: [consumedRam, consumedRam],

						backgroundColor: [
							'rgba(54, 162, 235, 0.2)',
							'rgba(54, 162, 235, 0.2)',
						],
						borderColor: [
							'rgba(54, 162, 235, 1)',
							'rgba(54, 162, 235, 1)',
						],
						borderWidth: 1
					}
				]
			},
			options: {
				scales: {
					y: {
						beginAtZero: true
					}
				}
			}
		});
	}

	onMount(updateChart);

</script>

<style>
	.graph-container {
		width: 100%;
		height: 300px;
		padding: 20px;
	}

	input {
		color: #000;
		border-radius: 0.25rem;
		width: 100%;
	}

	.warning {
		background: red;
		color: white;
	}
</style>
