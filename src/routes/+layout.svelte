

<slot />

<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar, Toast, initializeStores } from '@skeletonlabs/skeleton';
	import { LightSwitch } from '@skeletonlabs/skeleton';
	import {onMount} from "svelte";
	import ChainService, {account} from "../services/chain.service";
	initializeStores();

	onMount(async () => {
		await ChainService.init();
	})
</script>

<style>

</style>

