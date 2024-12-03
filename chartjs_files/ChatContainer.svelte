<script lang="ts">
	import axios from 'axios';
	import type { IncomingDataType } from '../types';
	import { isValidChartConfig } from '../utils/charts';
	import Chart from './Chart.svelte';

	type AIMessage = {
		role: 'user' | 'assistant' | 'system';
		content: string;
		chartConfig?: IncomingDataType;
		fileInputMessage?: string;
	};

	const initialPrompt: AIMessage = {
		role: 'system',
		content: `You are designed to create charts, you should read CSV files and take the data and send your message as a JSON object structured by these type options: {type: 'barVertical' | 'barHorizontal' | 'barStacked' | 'barStackedGrouped' | 'lineSharp' | 'lineSmooth' | 'lineMultiAxis' | 'lineFillStart' | 'lineFillEnd' | 'lineStacked' | 'bubble' | 'doughnut' | 'pie' | 'polarArea' | 'radar' | 'scatter'; data: { labels: string[]; datasets: { label: string; data: number[] | [number, number][] | { x: number; y: number; r: number }[]; }[]; }; }; It is your task to determine what kind of chart type is most appropriate for the data and send the chart config data in the message. The object should always be sent as markdown code. When not writing markdown, dont mention the type exactly as in the object, just mension the common type, like line or bar etc. Do not quote the type of bar`
	};

	let chats = $state<AIMessage[]>([initialPrompt]);
	let inputValue = $state<string>('');
	let chartConfig = $state<IncomingDataType | null>(null);
	let disableInput = $state<boolean>(false);
	let retries = $state<0 | 1 | 2 | 3>(0);

	async function sendMessage(message: string, renderedMessage?: string) {
		disableInput = true;

		try {
			// Only for when the AI is trying to send a JSON object for the charts
			if (retries === 3) {
				throw new Error('Failed to send chart after 3 retries');
			}

			// Rendered message is what gets seen on the client,
			// its purpose is only when sending files to the AI
			chats.push({
				role: 'user',
				content: message,
				fileInputMessage: renderedMessage
			});

			// Reset states
			inputValue = '';
			chartConfig = null;

			const res: { data: { content: string } } = await axios.post(
				'/api/chat',
				{
					messages: chats.map((chat) => ({
						// Dont send the fileInputMessage and chartConfig to the AI
						role: chat.role,
						content: chat.content
					}))
				},
				{ headers: { 'Content-Type': 'application/json' } }
			);

			const match = res.data.content.match(/```([\s\S]*?)```/);

			if (match) {
				// Format the JSON Object
				const jsonString = match[1].trim();
				const refinedString = jsonString.replace(/json/g, '');
				const parsedData = JSON.parse(refinedString);

				// Validate the JSON Object if invalid we will retry the fetch
				if (isValidChartConfig(parsedData)) {
					chartConfig = parsedData;
					res.data.content = res.data.content.replace(match[0], '').trim();
					retries = 0;
				} else {
					// Remove the last message and try again
					chats.splice(chats.length - 1, 1);
					await sendMessage(message, renderedMessage);
					retries = retries + 1;
					return;
				}
			}

			chats.push({
				role: 'assistant',
				content: res.data.content,
				chartConfig: chartConfig ?? undefined
			});
		} catch (error) {
			throw new Error(`Failed: ${error}`);
		} finally {
			disableInput = false;
		}
	}

	async function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files && input.files[0];
		input.value = '';

		if (!file) {
			throw new Error('No file selected');
		}

		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = () => {
				try {
					// Process the file content
					const csvData = reader.result as string;
					const parsedData = csvData.split('\n').map((row) => row.split(','));
					const csvAsString = parsedData.map((row) => row.join(',')).join('\n');
					resolve(csvAsString);
				} catch (err) {
					reject(new Error(`Error parsing CSV: ${err}`));
				}
			};

			reader.onerror = () => {
				reject(new Error(`Error reading file: ${reader.error?.message}`));
			};

			reader.readAsText(file);
		})
			.then((csvString) => {
				sendMessage(csvString, 'Data sent from file...');
			})
			.catch((error) => {
				console.error(`Failed to read file: ${error}`);
			});
	}
</script>

<div
	class="relative mx-auto flex h-screen w-[80vw] flex-col overflow-y-auto border-x border-neutral-300 pt-4"
>
	{#each chats as chat, i}
		{#if i !== 0}
			<div class="mx-24 mb-5 rounded-xl border border-neutral-300 p-4">
				<h3 class="mb-1.5 text-xl font-bold capitalize text-neutral-600/60">
					{chat.role === 'assistant' ? 'AI' : 'You'}
				</h3>
				{#if chat.fileInputMessage}
					<p>{chat.fileInputMessage}</p>
				{:else}
					<p>{@html chat.content}</p>
				{/if}
				{#if chat.chartConfig}
					<Chart data={chat.chartConfig} id={i} />
				{/if}
			</div>
		{/if}
	{/each}

	<form
		onsubmit={async (e) => {
			e.preventDefault();
			await sendMessage(inputValue);
		}}
		class="sticky bottom-0 z-[20] mt-auto flex items-center bg-white p-4 px-8"
	>
		<input
			type="text"
			placeholder="Type a message"
			bind:value={inputValue}
			disabled={disableInput}
			class="w-full flex-1 rounded-md border border-neutral-300 p-2"
		/>
		<input
			type="file"
			accept=".csv"
			class="ml-2 w-[100px]"
			onchange={handleFileInput}
			disabled={disableInput}
		/>
		<button
			class="ml-2 h-full rounded-md bg-blue-600 px-4 text-white"
			type="submit"
			disabled={disableInput}>Submit</button
		>
	</form>
</div>
