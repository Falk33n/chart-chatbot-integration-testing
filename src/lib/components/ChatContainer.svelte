<script lang="ts">
	import axios from 'axios';

	import type { IncomingDataType } from '../types';
	import { isValidChartConfig } from '../utils/charts';
	import Chart from './Chart.svelte';

	// Only for normal mode
	type AIMessage = {
		role: 'user' | 'assistant' | 'system';
		content: string;
		chartConfig?: IncomingDataType;
		fileInputMessage?: string;
	};

	// Only for normal mode
	const initialPrompt: AIMessage = {
		role: 'system',
		content: `You are designed to create charts, you should read CSV files and take the data and send your message as a JSON object structured by these type options: {type: 'barVertical' | 'barHorizontal' | 'barStacked' | 'barStackedGrouped' | 'lineSharp' | 'lineSmooth' | 'lineMultiAxis' | 'lineFillStart' | 'lineFillEnd' | 'lineStacked' | 'bubble' | 'doughnut' | 'pie' | 'polarArea' | 'radar' | 'scatter'; data: { labels: string[]; datasets: { label: string; data: number[] | [number, number][] | { x: number; y: number; r: number }[]; }[]; }; }; It is your task to determine what kind of chart type is most appropriate for the data and send the chart config data in the message. The object should always be sent as markdown code. When not writing markdown, dont mention the type exactly as in the object, just mension the common type, like line or bar etc. Do not quote the type of bar`
	};

	let chats = $state<AIMessage[]>([initialPrompt]);
	let inputValue = $state<string>('');
	let chartConfig = $state<IncomingDataType | null>(null);
	let disableInput = $state<boolean>(false);
	let retries = $state<0 | 1 | 2 | 3>(0);
	let chatMode = $state<'embedded' | 'normal'>('normal');

	/* // Remember to start the docker container in order for the Qdrant db to work
	// Only for embedded mode
	const client = new QdrantClient({ host: 'localhost', port: 6333 });

	// Only for embedded mode
	async function createCollection() {
		const isCreated = await client.getCollection('testtable');
		if (!isCreated) {
			await client.createCollection('testtable', {
				vectors: { size: 1536, distance: 'Dot' }
			});
		}
	}

	// Only for embedded mode
	async function useTable({
		operation = 'add',
		vectors,
		text,
		limit = 11
	}: {
		operation?: 'add' | 'query';
		vectors: number[];
		text?: string;
		limit?: number;
	}) {
		if (operation === 'add') {
			return await client.upsert('testtable', {
				wait: true,
				points: [
					{
						id: v7(),
						vector: vectors,
						payload: { text }
					}
				]
			});
		} else {
			return await client.query('testtable', {
				query: vectors,
				limit,
				with_payload: true,
				with_vector: true
			});
		}
	} */

	// Contains both embedded and chat specific functions
	async function sendMessage(
		message: string,
		renderedMessage?: string,
		filename?: string
	) {
		try {
			disableInput = true;

			/* if (chatMode === 'embedded') {
				await createCollection();
			} */

			// Only for when the AI is trying to send a JSON object for the charts
			if (retries === 3) {
				throw new Error('Failed to send message after 3 retries');
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

			if (filename) {
				const res: { data: { content: string } } = await axios.post(
					'/api/chat',
					{
						queryNeo4j: filename
					},
					{ headers: { 'Content-Type': 'application/json' } }
				);

				console.log(res);
			}

			/* if (chatMode === 'embedded') {
				const res: { data: number[] } = await axios.post(
					'/api/chat',
					{
						input: message
					},
					{ headers: { 'Content-Type': 'application/json' } }
				);

				await useTable({
					operation: 'add',
					text: message,
					vectors: res.data
				});

				const logData = await useTable({
					operation: 'query',
					vectors: res.data
				});

				logData.points.shift();
				console.log(message, logData.points);
				return;
			} */

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

	type ChunkData = {
		page: number;
		startCharIndex: number;
		endCharIndex: number;
		charCount: number;
		content: string;
		filename: string;
	};

	function createChunks(
		content: string,
		chunkSize = 500,
		overlap = chunkSize * 0.4, // 40% overlap
		filename = ''
	) {
		const chars = content.split('');

		const chunks: ChunkData[] = [];

		const stepSize = chunkSize - overlap;

		for (let i = 0, page = 1; i < chars.length; i += stepSize, page++) {
			const chunkChars = chars.slice(i, i + chunkSize);
			const chunkContent = chunkChars.join(' ');
			const startCharIndex = i + 1;
			const endCharIndex = Math.min(i + chunkSize, chars.length);

			chunks.push({
				page,
				startCharIndex,
				endCharIndex,
				charCount: chunkChars.length,
				content: chunkContent,
				filename
			});
		}

		return chunks;
	}

	async function createEmbedding(chunk: ChunkData) {
		const res: { data: number[] } = await axios.post(
			'/api/chat',
			{
				input: chunk.content
			},
			{ headers: { 'Content-Type': 'application/json' } }
		);

		return {
			embeddings: res.data,
			metadata: {
				page: chunk.page,
				startCharIndex: chunk.startCharIndex,
				endCharIndex: chunk.endCharIndex,
				charCount: chunk.charCount,
				filename: chunk.filename
			}
		};
	}

	type EmbeddingWithMetadata = {
		embeddings: number[];
		metadata: {
			page: number;
			startCharIndex: number;
			endCharIndex: number;
			charCount: number;
			filename: string;
		};
	};

	async function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files && input.files[0];
		input.value = '';

		if (!file) {
			throw new Error(`No file selected`);
		}

		const reader = new FileReader();

		reader.onload = async (e) => {
			const fileContent = e.target?.result;
			const chunks = createChunks(fileContent as string, 500, 50, file.name);

			const results: EmbeddingWithMetadata[] = [];

			for (const chunk of chunks) {
				results.push(await createEmbedding(chunk));
			}

			const res = await axios.post(
				'/api/chat',
				{
					saveNeo4j: results
				},
				{ headers: { 'Content-Type': 'application/json' } }
			);

			console.log(res.data);

			console.log(results);
		};

		reader.onerror = (err) => {
			throw new Error(`Error reading file: ${err}`);
		};

		reader.readAsText(file);

		/* return new Promise<string>((resolve, reject) => { */
		/* const reader = new FileReader(); */
		/* 
  reader.onload = async (e) => {

    }); */

		/* try {
      const csvData = reader.result as string;
       const parsedData = csvData.split('\n').map((row) => row.split(','));
        const csvAsString = parsedData.map((row) => row.join(',')).join('\n');
       resolve(csvAsString); 
    } catch (err) {
      reject(new Error(`Error parsing CSV: ${err}`)); 
    } */

		/* 			reader.readAsArrayBuffer(file);
    sendMessage(pdfContent, 'Data sent from file...');
  }; */
		/* 
    reader.onerror = (err) => reject(new Error(`Error reading file: ${err}`));
    reader.readAsText(file);
  }) */ /* 
    .then((csvString) => {
      sendMessage(csvString, 'Data sent from file...');
    })
    .catch((error) => {
      throw new Error(`Failed to read file: ${error}`);
    }); */
	}
</script>

<div
	class="relative mx-auto flex h-screen w-[80vw] flex-col overflow-y-auto border-x border-neutral-300 pt-4"
>
	{#if chatMode === 'normal'}
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
	{/if}

	<form
		onsubmit={async (e) => {
			e.preventDefault();
			await sendMessage(inputValue, undefined, 'long_mock_file.txt');
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
			accept=".txt"
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

<button
	class="font-bold"
	onclick={() => (chatMode = chatMode === 'normal' ? 'embedded' : 'normal')}
	>current chatmode is {chatMode === 'normal' ? 'normal' : 'embedded'} click me to
	change</button
>
